# ============================================================
# backend/app/services/image_processing.py
# OpenCV-based image preprocessing pipeline for OCR
# ============================================================

import base64
import io
import numpy as np
import cv2
from PIL import Image
from loguru import logger


class ImageProcessor:
    """
    Preprocesses screenshots to improve OCR accuracy.
    Pipeline: decode → grayscale → denoise → contrast → 
              binarize → deskew → scale
    """

    def preprocess(self, image_base64: str) -> np.ndarray:
        """
        Takes base64-encoded PNG, returns preprocessed numpy array.
        """
        # 1. Decode base64 → PIL Image → numpy
        raw_bytes = base64.b64decode(image_base64)
        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        img = np.array(pil_img)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

        logger.debug(f"[ImageProcessor] Original size: {img.shape}")

        # 2. Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 3. Scale up if too small (improves OCR on small text)
        h, w = gray.shape
        if w < 1200:
            scale = 1200 / w
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            logger.debug(f"[ImageProcessor] Scaled to: {gray.shape}")

        # 4. Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

        # 5. Enhance contrast with CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrasted = clahe.apply(denoised)

        # 6. Adaptive binarization (handles varying backgrounds)
        binary = cv2.adaptiveThreshold(
            contrasted, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=11, C=2
        )

        # 7. Deskew
        binary = self._deskew(binary)

        # 8. Light morphological cleanup (removes isolated noise pixels)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        return cleaned

    def preprocess_to_pil(self, image_base64: str) -> Image.Image:
        """Returns preprocessed image as PIL Image (for pytesseract)."""
        arr = self.preprocess(image_base64)
        return Image.fromarray(arr)

    def _deskew(self, image: np.ndarray) -> np.ndarray:
        """
        Detect and correct text skew using the Hough transform approach.
        Only corrects small angles (<10°) to avoid false corrections.
        """
        try:
            # Invert for coordinate detection
            coords = np.column_stack(np.where(image < 127))
            if len(coords) < 50:
                return image

            angle = cv2.minAreaRect(coords)[-1]

            # minAreaRect returns angles in [-90, 0); normalize
            if angle < -45:
                angle = 90 + angle

            # Only correct small skews
            if abs(angle) < 0.5 or abs(angle) > 10:
                return image

            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            logger.debug(f"[ImageProcessor] Deskewed by {angle:.2f}°")
            return rotated
        except Exception as e:
            logger.warning(f"[ImageProcessor] Deskew failed: {e}")
            return image
