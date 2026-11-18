# ============================================================
# backend/app/api/deps.py – Shared FastAPI dependencies
# ============================================================

import os
from fastapi import Header, HTTPException, status


def verify_secret(x_secret_token: str = Header(...)) -> None:
    """
    Verify the shared secret token between Electron and Python.
    This provides local-process trust without full auth overhead.
    """
    expected = os.environ.get("BACKEND_SECRET", "")
    if not expected:
        # In development, allow requests without a secret
        return

    if x_secret_token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid secret token"
        )
