@echo off
setlocal

REM One-click startup for football-league-backend (Windows)
REM This script starts backend and frontend in separate windows.

REM Root directory of this batch file
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%football-league-backend\server"
set "FRONTEND_DIR=%ROOT_DIR%football-league-front-end"

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] Backend package.json not found: %BACKEND_DIR%
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend package.json not found: %FRONTEND_DIR%
  pause
  exit /b 1
)

echo Starting backend...
start "football backend" /D "%BACKEND_DIR%" cmd /k "npm install && npm run start:dev"

echo Starting frontend...
start "football frontend" /D "%FRONTEND_DIR%" cmd /k "pnpm dev"

echo.
echo Backend and frontend launch windows have been opened.
echo If this is the first run, installation may take a while.
pause
