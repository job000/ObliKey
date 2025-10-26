#!/bin/bash

echo "🔧 ObliKey Docker Quick Fix"
echo "============================"
echo ""

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null
echo "✅ Stopped"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << 'EOF'
# Docker Environment Variables
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=oblikey
REDIS_PASSWORD=redis_password
JWT_SECRET=dev-secret-key-change-in-production-12345678901234567890
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
POSTGRES_PORT=5432
REDIS_PORT=6379
APP_PORT=3000
EOF
  echo "✅ Created .env"
else
  echo "ℹ️  .env already exists"
fi
echo ""

# Check if we should use dev docker-compose
if [ -f docker-compose.dev.yml ]; then
  COMPOSE_FILE="docker-compose.dev.yml"
  echo "Using development Docker setup..."
else
  COMPOSE_FILE="docker-compose.yml"
  echo "Using production Docker setup..."
fi
echo ""

# Build and start containers
echo "Building and starting containers..."
echo "This may take 2-3 minutes on first run..."
docker-compose -f $COMPOSE_FILE up -d --build

# Wait for services to be healthy
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check if backend is running
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
echo "============================"
echo "✅ Docker setup complete!"
echo "============================"
echo ""
echo "🌐 URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000"
echo "  Health:   http://localhost:3000/health"
echo ""
echo "📝 Next steps:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Click 'Register' to create an account"
echo "  3. Use these test credentials:"
echo "     Email: test@example.com"
echo "     Password: Test123!"
echo "     Tenant ID: test-tenant"
echo ""
echo "🐛 If registration still fails:"
echo "  1. Check logs: docker-compose logs -f backend"
echo "  2. Read: DOCKER_QUICK_FIX.md"
echo ""
echo "🛑 To stop: docker-compose down"
echo ""
