@echo off
echo 🔍 Testing container file structure...

REM Stop existing containers
docker-compose down

REM Build with no cache to ensure fresh build
echo 🔨 Building fresh container...
docker-compose build --no-cache

REM Start container
echo 🚀 Starting container...
docker-compose up -d

REM Wait a moment
timeout /t 5 /nobreak

REM Test container contents
echo 📁 Testing container file structure...
docker-compose exec roster-guardian sh -c "echo '=== Current working directory ===' && pwd && echo '=== Backend directory contents ===' && ls -la /app/backend/ && echo '=== DB directory check ===' && if [ -d '/app/backend/db' ]; then echo '✅ DB directory exists' && ls -la /app/backend/db/ && if [ -f '/app/backend/db/database.js' ]; then echo '✅ database.js exists'; else echo '❌ database.js NOT found'; fi; else echo '❌ DB directory NOT found'; fi && echo '=== Server.js check ===' && if [ -f '/app/backend/server.js' ]; then echo '✅ server.js exists' && head -5 /app/backend/server.js; else echo '❌ server.js NOT found'; fi && echo '=== Node.js module resolution test ===' && cd /app/backend && node -e \"try { require('./db/database'); console.log('✅ Module loads successfully'); } catch(e) { console.log('❌ Module load failed:', e.message); }\""

echo.
echo 📝 Container logs:
docker-compose logs --tail=20 roster-guardian

echo.
echo ✅ Container verification completed!