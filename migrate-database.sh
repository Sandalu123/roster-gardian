#!/bin/bash
# Manual database migration script

echo "🔄 Running database migration for Roster Guardian..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the project root directory (where docker-compose.yml is located)"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start only the database migration
echo "🔄 Running database migration..."
docker-compose run --rm roster-guardian npm run migrate --prefix backend

# Check migration result
if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
    echo "🚀 Starting services..."
    docker-compose up -d
    echo "📊 Checking container status..."
    docker-compose ps
else
    echo "❌ Database migration failed!"
    exit 1
fi