@echo off
echo 🧪 Testing with embedded server (bypasses module loading)...

REM Stop existing containers
docker-compose down

REM Backup original Dockerfile
if not exist "Dockerfile.backup" (
    copy Dockerfile Dockerfile.backup
    echo 📁 Backed up original Dockerfile
)

REM Use embedded Dockerfile temporarily
copy Dockerfile-embedded Dockerfile

REM Build and test
echo 🔨 Building with embedded server...
docker-compose build --no-cache

echo 🚀 Starting services...
docker-compose up -d

REM Wait for startup
echo ⏳ Waiting for services...
timeout /t 10 /nobreak

REM Test the services
echo 🧪 Testing services...
echo Health check:
curl -s http://localhost:4010/health

echo.
echo 📝 Container logs:
docker-compose logs --tail=20 roster-guardian

echo.
echo 🔍 If this works, the issue is with module loading.
echo 🔍 If this fails, the issue is elsewhere.
echo.
echo Test the app at: http://localhost:3000
echo.
echo To restore original Dockerfile: copy Dockerfile.backup Dockerfile