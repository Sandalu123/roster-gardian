#!/bin/bash
# Debug Docker build for Roster Guardian

echo "🔍 Debugging Docker build for Roster Guardian..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Clean up Docker
echo "🧹 Cleaning up Docker..."
docker system prune -f

# Show local directory structure before build
echo "📁 Local backend directory structure:"
ls -la backend/
echo ""
echo "📁 Local db directory structure:"
ls -la backend/db/
echo ""

# Rebuild containers with verbose output
echo "🔨 Rebuilding containers with verbose output..."
docker-compose build --no-cache --progress=plain

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait a moment for startup
sleep 5

# Show container logs
echo "📝 Container logs:"
docker-compose logs roster-guardian

echo ""
echo "✅ Debug build completed!"
echo "Check the logs above for any directory structure issues."