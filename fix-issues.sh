#!/bin/bash
# Comprehensive fix script for Roster Guardian Docker issues

echo "🔧 Fixing Roster Guardian Docker Issues..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p ./data
mkdir -p ./uploads/issues
mkdir -p ./uploads/comments  
mkdir -p ./uploads/profiles

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod -R 755 ./data
chmod -R 755 ./uploads

# Clean up Docker
echo "🧹 Cleaning up Docker..."
docker system prune -f
docker volume prune -f

# Rebuild containers
echo "🔨 Rebuilding containers..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Check if services are running
echo "📊 Checking service status..."
docker-compose ps

# Test API endpoints
echo "🧪 Testing API endpoints..."
echo "Testing health endpoint..."
curl -s http://localhost:4010/health || echo "❌ Health check failed"

echo "Testing uploads directory structure..."
curl -s http://localhost:4010/debug/uploads || echo "❌ Debug endpoint failed"

# Show logs
echo "📝 Showing recent logs..."
docker-compose logs --tail=50 roster-guardian

echo ""
echo "✅ Fix script completed!"
echo ""
echo "🔍 To check if everything is working:"
echo "1. Go to http://localhost:3000"
echo "2. Create an issue with images"
echo "3. Check if images display properly"
echo "4. Test status changes"
echo "5. Check Docker logs: docker-compose logs -f roster-guardian"
echo ""
echo "📊 To check uploads directory:"
echo "Visit: http://localhost:4010/debug/uploads"
echo ""
echo "🗃️ Database is now persistent in ./data/ directory"