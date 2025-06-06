#!/bin/sh
# Startup script for Roster Guardian application

echo "🚀 Starting Roster Guardian..."

# Start backend
echo "📡 Starting backend on port 4010..."
cd /app/backend && node server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend on port 3000
echo "🌐 Starting frontend on port 3000..."
cd /app && serve -s frontend/build -l 3000 &
FRONTEND_PID=$!

echo "✅ Both services started successfully"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Function to handle shutdown
shutdown() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait
    echo "✅ Shutdown complete"
    exit 0
}

# Handle signals
trap shutdown SIGTERM SIGINT

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID