@echo off
echo 🔄 Running database migration for Roster Guardian...

REM Check if we're in the right directory
if not exist "docker-compose.yml" (
    echo ❌ Please run this script from the project root directory (where docker-compose.yml is located)
    exit /b 1
)

REM Stop existing containers
echo 🛑 Stopping existing containers...
docker-compose down

REM Start only the database migration
echo 🔄 Running database migration...
docker-compose run --rm roster-guardian npm run migrate --prefix backend

REM Check migration result
if %ERRORLEVEL% equ 0 (
    echo ✅ Database migration completed successfully!
    echo 🚀 Starting services...
    docker-compose up -d
    echo 📊 Checking container status...
    docker-compose ps
) else (
    echo ❌ Database migration failed!
    exit /b 1
)