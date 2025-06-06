@echo off
echo 🔍 Debugging Docker build for Roster Guardian...

REM Stop existing containers
echo 🛑 Stopping existing containers...
docker-compose down

REM Clean up Docker
echo 🧹 Cleaning up Docker...
docker system prune -f

REM Show local directory structure before build
echo 📁 Local backend directory structure:
dir backend\
echo.
echo 📁 Local db directory structure:
dir backend\db\
echo.

REM Rebuild containers with verbose output
echo 🔨 Rebuilding containers with verbose output...
docker-compose build --no-cache --progress=plain

REM Start services
echo 🚀 Starting services...
docker-compose up -d

REM Wait a moment for startup
timeout /t 5 /nobreak

REM Show container logs
echo 📝 Container logs:
docker-compose logs roster-guardian

echo.
echo ✅ Debug build completed!
echo Check the logs above for any directory structure issues.