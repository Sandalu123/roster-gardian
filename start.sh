#!/bin/sh
# Improved startup script for Roster Guardian application

echo "🚀 Starting Roster Guardian..."

# Set environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-4010}
export FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Ensure uploads directory exists and has correct permissions
mkdir -p /app/backend/uploads/profiles /app/backend/uploads/issues /app/backend/uploads/comments
chmod -R 755 /app/backend/uploads

# Start backend
echo "📡 Starting backend on port ${PORT}..."
cd /app/backend && node server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
for i in $(seq 1 30); do
  if wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health >/dev/null 2>&1; then
    echo "✅ Backend is ready!"
    break
  fi
  echo "🔄 Attempt $i/30: Backend not ready yet..."
  sleep 2
done

# Start frontend on port 3000 with proper configuration
echo "🌐 Starting frontend on port ${FRONTEND_PORT}..."
cd /app && serve -s frontend/build -l ${FRONTEND_PORT} --cors &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to start..."
for i in $(seq 1 15); do
  if wget --no-verbose --tries=1 --spider http://localhost:${FRONTEND_PORT} >/dev/null 2>&1; then
    echo "✅ Frontend is ready!"
    break
  fi
  echo "🔄 Attempt $i/15: Frontend not ready yet..."
  sleep 2
done

echo "🎉 Both services started successfully"
echo "📱 Frontend: http://localhost:${FRONTEND_PORT}"
echo "🔧 Backend API: http://localhost:${PORT}"
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

# Keep the script running and monitor processes
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend process died, shutting down..."
        shutdown
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend process died, shutting down..."
        shutdown
    fi
    
    sleep 5
done