@echo off
echo 🔧 Fixing Roster Guardian Docker Issues...

REM Stop existing containers
echo 🛑 Stopping existing containers...
docker-compose down

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads
if not exist "uploads\issues" mkdir uploads\issues
if not exist "uploads\comments" mkdir uploads\comments
if not exist "uploads\profiles" mkdir uploads\profiles

REM Clean up Docker
echo 🧹 Cleaning up Docker...
docker system prune -f
docker volume prune -f

REM Rebuild containers
echo 🔨 Rebuilding containers...
docker-compose build --no-cache

REM Start services
echo 🚀 Starting services...
docker-compose up -d

REM Wait for services to start
echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak

REM Check if services are running
echo 📊 Checking service status...
docker-compose ps

REM Test API endpoints
echo 🧪 Testing API endpoints...
echo Testing health endpoint...
curl -s http://localhost:4010/health

echo Testing uploads directory structure...
curl -s http://localhost:4010/debug/uploads

REM Show logs
echo 📝 Showing recent logs...
docker-compose logs --tail=50 roster-guardian

echo.
echo ✅ Fix script completed!
echo.
echo 🔍 To check if everything is working:
echo 1. Go to http://localhost:3000
echo 2. Create an issue with images
echo 3. Check if images display properly
echo 4. Test status changes
echo 5. Check Docker logs: docker-compose logs -f roster-guardian
echo.
echo 📊 To check uploads directory:
echo Visit: http://localhost:4010/debug/uploads
echo.
echo 🗃️ Database is now persistent in .\data\ directory