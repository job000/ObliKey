#!/bin/bash

echo "🔍 ObliKey Docker Diagnostics"
echo "=============================="
echo ""

# Check if containers are running
echo "📦 Docker Containers Status:"
docker-compose ps
echo ""

# Check backend logs
echo "📋 Backend Logs (last 20 lines):"
docker-compose logs --tail=20 app
echo ""

# Check database connection
echo "🗄️ Database Connection:"
docker-compose exec postgres pg_isready -U oblikey
echo ""

# Check if backend is responding
echo "🌐 Backend Health Check:"
curl -f http://localhost:3000/health 2>/dev/null
if [ $? -eq 0 ]; then
  echo " ✅ Backend is responding"
else
  echo " ❌ Backend is NOT responding"
fi
echo ""

# Check environment variables
echo "⚙️ Environment Variables in Backend:"
docker-compose exec app printenv | grep -E "DATABASE_URL|JWT_SECRET|NODE_ENV"
echo ""

echo "=============================="
echo "Diagnostic complete!"
