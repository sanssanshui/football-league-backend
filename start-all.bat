@echo off
setlocal

REM One-click start: database + backend + frontend (Windows)

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%football-league-backend\server"
set "FRONTEND_DIR=%ROOT%football-league-front-end"
set "DOCKER_COMPOSE_FILE=%ROOT%football-league-backend\docker-compose.yml"

echo [1/8] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install Node.js first.
  pause
  exit /b 1
)

echo [2/8] Checking pnpm...
where pnpm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] pnpm not found. Please run: npm i -g pnpm
  pause
  exit /b 1
)

echo [3/8] Checking Docker...
where docker >nul 2>nul
if errorlevel 1 (
  echo [WARN] Docker not found. Skipping database container startup.
) else (
  if exist "%DOCKER_COMPOSE_FILE%" (
    echo [INFO] Starting MySQL container...
    docker compose -f "%DOCKER_COMPOSE_FILE%" up -d
    if errorlevel 1 (
      echo [WARN] Docker start failed. Please check if Docker Desktop is running.
    )
  ) else (
    echo [WARN] docker-compose.yml not found. Skipping database container startup.
  )
)

echo [4/8] Preparing backend...
if not exist "%BACKEND_DIR%" (
  echo [ERROR] Backend directory not found: %BACKEND_DIR%
  pause
  exit /b 1
)
cd /d "%BACKEND_DIR%"

echo [5/8] Installing backend dependencies...
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed in backend.
  pause
  exit /b 1
)

echo [6/8] Generating Prisma Client and pushing schema...
call npx prisma generate
if errorlevel 1 (
  echo [ERROR] prisma generate failed.
  pause
  exit /b 1
)

call npx prisma db push
if errorlevel 1 (
  echo [WARN] prisma db push failed. Please check .env DATABASE_URL.
)

echo [7/8] Starting backend and frontend in separate windows...
start "Backend Dev Server" cmd /k "cd /d "%BACKEND_DIR%" && npm run start:dev"

if not exist "%FRONTEND_DIR%" (
  echo [ERROR] Frontend directory not found: %FRONTEND_DIR%
  pause
  exit /b 1
)
start "Frontend Dev Server" cmd /k "cd /d "%FRONTEND_DIR%" && pnpm install && pnpm dev"

echo [8/8] Waiting for frontend (http://localhost:3000)...
powershell -NoProfile -Command "$deadline=(Get-Date).AddSeconds(90); $ok=$false; while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -ge 200){$ok=$true; break} } catch {}; Start-Sleep -Seconds 2 }; if($ok){ exit 0 } else { exit 1 }"

if errorlevel 1 (
  echo [WARN] Frontend did not become ready in time. You can open http://localhost:3000 manually.
) else (
  echo [INFO] Opening browser: http://localhost:3000
  start "" "http://localhost:3000"
)

echo.
echo Done. Backend and frontend are running in separate windows.
echo Close those windows to stop services.

endlocal
