@echo off
REM Double-click launcher for WorkForge.
REM
REM Does the same thing as `npm run go` but survives being run from anywhere and
REM keeps the window open if something fails, so the error is readable instead of
REM vanishing with the console.

cd /d "%~dp0"

echo.
echo   Starting WorkForge...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js is not on PATH. Install Node 20+ and try again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo   Installing dependencies, this happens once...
  call npm install
  if errorlevel 1 goto failed
)

call npm run go -- %*
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo   Startup failed. The error is above.
echo.
pause
exit /b 1
