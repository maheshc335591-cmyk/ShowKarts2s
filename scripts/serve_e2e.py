"""Serve the built website with disposable data for Playwright."""

import os
import sys
import tempfile
from pathlib import Path

import uvicorn

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="showkart-browser-") as folder:
        os.environ["SHOWKART_DB"] = str(Path(folder) / "browser.sqlite3")
        os.environ["SHOWKART_ALLOWED_ORIGINS"] = "http://127.0.0.1:8011"
        uvicorn.run("backend.server:app", host="127.0.0.1", port=8011, log_level="warning")
