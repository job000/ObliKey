#!/bin/bash
# Start ObliKey Development Servers

echo "🚀 Starting ObliKey..."
echo ""

# Start backend
echo "Starting Backend on http://localhost:3000"
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "Starting Frontend on http://localhost:5173"
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "✅ ObliKey is running!"
echo "================================"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3000"
echo "Health:   http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
