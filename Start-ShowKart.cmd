@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Python environment missing. Read README.md for setup instructions.
  pause
  exit /b 1
)
if not exist "frontend\dist\index.html" (
  echo Frontend build missing. Run npm run build --prefix frontend first.
  pause
  exit /b 1
)
echo Starting ShowKart college prototype...
echo Keep this window open during your presentation.
".venv\Scripts\python.exe" "scripts\run_demo.py"
pause