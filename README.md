# ShowKart

A local concert ticket booking prototype for a college demonstration. See **DEMO_GUIDE.md** for demo accounts and a presentation walkthrough.

## Run on this computer

Double-click **Start-ShowKart.cmd**. Open http://127.0.0.1:8001. Everything runs through one local FastAPI server, including the built React frontend. Keep the terminal open during the demonstration.

## Setup on another computer

Install Python 3.13 and Node.js 24, then run from the project folder:

    python -m venv .venv
    .venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
    npm.cmd ci --ignore-scripts --prefix frontend
    npm.cmd run build --prefix frontend
    .venv\Scripts\python.exe -m uvicorn backend.server:app --host 127.0.0.1 --port 8001

The included source and cached images are sufficient to rebuild; no Emergent export, API keys, or paid accounts are needed. Development can also use npm run dev in frontend (port 3000), alongside the backend on port 8001.

## API and storage

- Interactive API documentation: http://127.0.0.1:8001/docs
- Health: http://127.0.0.1:8001/api/health
- Persistent SQLite file: backend/showkart.sqlite3, created automatically.
- Local-only demo accounts and simulated payments/reset codes are intentional.
- Backend source was reconstructed to match the recovered frontend; it is not the original Emergent Python source.
- Authentication uses password hashes and HttpOnly session cookies. Booking transactions serialize seat holds to prevent duplicate allocation in this local demo.
- Sample artists, concerts, and coupons are stored in backend/data.

## Checks

    .venv\Scripts\python.exe scripts\smoke_demo.py
    npm.cmd run build --prefix frontend

The smoke script creates and closes a temporary database and local server without modifying the presentation database.

Full regression tests are now available:

    npm --prefix frontend exec -- playwright install chromium
    npm run test:api
    npm run build
    npm run test:e2e

Run `npm test` to run the API regressions, rebuild, and run browser tests together. Install backend developer dependencies from backend/requirements-dev.txt first. Browser tests use a disposable database on port 8011; keep that port available. The normal presentation app on port 8001 and its database are separate.

API regressions are in tests/test_api.py. Browser scenarios are in frontend/e2e/website.spec.ts. See QA_REPORT.md for findings, fixes, and coverage. Browser screenshots and traces are generated in frontend/test-results and are excluded from Git.

DEMO_GUIDE.md includes the demo accounts and a suggested presentation walkthrough.
## Code quality and editor setup

Run npm run check from this project folder for frontend lint/type/format checks and backend lint/type/format checks. Run npm run smoke for the isolated API checks. Developer tools are listed in backend/requirements-dev.txt.

The workspace config points Pyrefly at the project virtual environment. frontend/package-lock.json is the active dependency lockfile. Recovery files and unused scaffolding are kept outside this project in a local archive and are not part of the source upload.

## Project structure

- backend/server.py: FastAPI routes, sessions, booking logic, and SQLite storage.
- backend/data/: sample artists, concerts, and coupons required at startup.
- frontend/src/: React pages, components, styles, and the API client.
- frontend/public/: ShowKart logo and cached demonstration images.
- scripts/run_demo.py: local presentation launcher.
- scripts/smoke_demo.py: isolated API checks.
- tests/test_api.py: access-control, validation, concurrency, and booking regressions.
- frontend/e2e/: desktop/mobile Playwright website checks.

## GitHub preparation

The .gitignore excludes installed dependencies, frontend build output, Python caches, environment files, and the local SQLite database. Keep the database on your computer; a fresh setup creates its own demo accounts and bookings. GitHub authentication and publishing have been deferred.
