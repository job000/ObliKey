#!/bin/bash
# Stop all ObliKey processes

echo "🛑 Stopping ObliKey..."

# Kill all node processes running dev servers
pkill -f "npm run dev"
pkill -f "vite"
pkill -f "ts-node-dev"

echo "✅ All servers stopped"
