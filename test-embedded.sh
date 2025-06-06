#!/bin/bash
# Quick test using embedded server to bypass module loading issues

echo "🧪 Testing with embedded server (bypasses module loading)..."

# Stop existing containers
docker-compose down

# Backup original Dockerfile
if [ ! -f "Dockerfile.backup" ]; then
    cp Dockerfile Dockerfile.backup
    echo "📁 Backed up original Dockerfile"
fi

# Use embedded Dockerfile temporarily
cp Dockerfile-embedded Dockerfile

# Build and test
echo "🔨 Building with embedded server..."
docker-compose build --no-cache

echo "🚀 Starting services..."
docker-compose up -d

# Wait for startup
echo "⏳ Waiting for services..."
sleep 10

# Test the services
echo "🧪 Testing services..."
echo "Health check:"
curl -s http://localhost:4010/health || echo "❌ Health check failed"

echo ""
echo "📝 Container logs:"
docker-compose logs --tail=20 roster-guardian

echo ""
echo "🔍 If this works, the issue is with module loading."
echo "🔍 If this fails, the issue is elsewhere."
echo ""
echo "Test the app at: http://localhost:3000"
echo ""
echo "To restore original Dockerfile: cp Dockerfile.backup Dockerfile"