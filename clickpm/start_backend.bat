@echo off
echo ============================================================
echo   Starting ClickPM Backend Services
echo ============================================================
echo.

echo Checking Docker status...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo ✓ Docker is installed
echo.

echo Starting Docker containers...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Failed to start Docker containers
    echo.
    echo Troubleshooting:
    echo 1. Make sure Docker Desktop is running
    echo 2. Check if ports 5432 and 8000 are available
    echo 3. Try: docker-compose down
    echo    Then: docker-compose up -d
    echo.
    pause
    exit /b 1
)

echo ✓ Docker containers started
echo.

echo Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

echo.
echo Applying database migrations...
python manage.py migrate

if %errorlevel% neq 0 (
    echo ❌ Migration failed
    pause
    exit /b 1
)

echo ✓ Migrations applied
echo.

echo ============================================================
echo   Backend services are ready!
echo ============================================================
echo.
echo Next steps:
echo 1. Start the Django server:
echo    python manage.py runserver
echo.
echo 2. Test the API:
echo    python test_backend_api_updated.py
echo.
echo To stop services:
echo    docker-compose down
echo.
pause
