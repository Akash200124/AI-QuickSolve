# ============================================================
# tests/backend/test_image_processing.py
# ============================================================

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

import pytest
import base64
import numpy as np
from PIL import Image
import io
from app.services.image_processing import ImageProcessor


def create_test_image_b64(width=400, height=200, text_color=0, bg_color=255) -> str:
    """Create a simple test PNG image with text-like content."""
    img = Image.new('RGB', (width, height), color=(bg_color, bg_color, bg_color))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return base64.b64encode(buf.getvalue()).decode()


def test_preprocess_returns_numpy_array():
    processor = ImageProcessor()
    b64 = create_test_image_b64()
    result = processor.preprocess(b64)
    assert isinstance(result, np.ndarray)
    assert result.ndim == 2  # Grayscale


def test_preprocess_scales_small_image():
    """Small images should be upscaled for better OCR."""
    processor = ImageProcessor()
    # 300px wide – below the 1200 threshold
    b64 = create_test_image_b64(width=300, height=100)
    result = processor.preprocess(b64)
    assert result.shape[1] >= 1200


def test_preprocess_to_pil():
    processor = ImageProcessor()
    b64 = create_test_image_b64()
    pil_img = processor.preprocess_to_pil(b64)
    assert isinstance(pil_img, Image.Image)


def test_preprocess_invalid_b64():
    processor = ImageProcessor()
    with pytest.raises(Exception):
        processor.preprocess("not_valid_base64_at_all!!!")
