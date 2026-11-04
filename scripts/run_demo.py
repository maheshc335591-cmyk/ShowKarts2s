"""Single-server presentation launcher."""

import json
import sys
import time
import webbrowser
from pathlib import Path
from threading import Thread
from urllib.request import urlopen

import uvicorn

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
URL = "http://127.0.0.1:8001"


def running():
    try:
        with urlopen(URL + "/api/health", timeout=1) as r:
            return json.load(r).get("mode") == "college-demo"
    except Exception:
        return False


def open_when_ready():
    for _ in range(60):
        if running():
            webbrowser.open(URL)
            return
        time.sleep(0.25)


if __name__ == "__main__":
    if running():
        print("ShowKart is already running at", URL)
        webbrowser.open(URL)
    else:
        Thread(target=open_when_ready, daemon=True).start()
        print("ShowKart college demo:", URL, "\nPress Ctrl+C to stop.")
        uvicorn.run("backend.server:app", host="127.0.0.1", port=8001)
