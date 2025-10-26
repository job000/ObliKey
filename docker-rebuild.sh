#!/bin/bash

echo "🔄 ObliKey Docker Clean Rebuild"
echo "================================"
echo ""

# Stop and remove all containers
echo "Stopping containers..."
docker-compose -f docker-compose.dev.yml down

# Remove all images to force complete rebuild
echo "Removing old images..."
docker-compose -f docker-compose.dev.yml down --rmi all

# Remove volumes (optional - will delete database data)
read -p "Delete database data? (y/N): " DELETE_DATA
if [ "$DELETE_DATA" = "y" ] || [ "$DELETE_DATA" = "Y" ]; then
  echo "Removing volumes..."
  docker-compose -f docker-compose.dev.yml down -v
fi

# Clean Docker build cache
echo "Cleaning Docker build cache..."
docker builder prune -f

echo ""
echo "Building fresh images (no cache)..."
docker-compose -f docker-compose.dev.yml build --no-cache --progress=plain

echo ""
echo "Starting containers..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "Waiting for services to be ready..."
sleep 15

echo ""
echo "Checking backend health..."
for i in {1..10}; do
  if curl -f http://localhost:3000/health 2>/dev/null; then
    echo "✅ Backend is healthy!"
    break
  else
    echo "⏳ Waiting for backend... ($i/10)"
    sleep 3
  fi
done

echo ""
echo "================================"
echo "✅ Rebuild complete!"
echo "================================"
echo ""
echo "🌐 URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000"
echo ""
echo "📋 Check logs:"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"
echo ""
