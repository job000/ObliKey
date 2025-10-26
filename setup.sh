#!/bin/bash

# ObliKey Quick Setup Script
# This script sets up the entire ObliKey platform for local development

set -e  # Exit on error

echo "🚀 ObliKey Setup Script"
echo "======================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on supported OS
OS="$(uname -s)"
echo "📊 Detected OS: $OS"
echo ""

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to print success
print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
  NODE_VERSION=$(node --version)
  print_success "Node.js installed: $NODE_VERSION"
else
  print_error "Node.js is not installed"
  echo "  Please install Node.js v20 or higher from https://nodejs.org/"
  exit 1
fi

# Check npm
if command_exists npm; then
  NPM_VERSION=$(npm --version)
  print_success "npm installed: $NPM_VERSION"
else
  print_error "npm is not installed"
  exit 1
fi

# Check PostgreSQL
if command_exists psql; then
  PSQL_VERSION=$(psql --version | awk '{print $3}')
  print_success "PostgreSQL installed: $PSQL_VERSION"
else
  print_warning "PostgreSQL is not installed or not in PATH"
  echo "  You can continue with Docker setup or install PostgreSQL manually"
fi

# Check Docker
if command_exists docker; then
  DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
  print_success "Docker installed: $DOCKER_VERSION"
  DOCKER_AVAILABLE=true
else
  print_warning "Docker is not installed"
  DOCKER_AVAILABLE=false
fi

# Check Docker Compose
if command_exists docker-compose; then
  DOCKER_COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
  print_success "Docker Compose installed: $DOCKER_COMPOSE_VERSION"
elif command_exists docker && docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE_VERSION=$(docker compose version | awk '{print $4}')
  print_success "Docker Compose (plugin) installed: $DOCKER_COMPOSE_VERSION"
  DOCKER_COMPOSE_AVAILABLE=true
else
  print_warning "Docker Compose is not installed"
  DOCKER_COMPOSE_AVAILABLE=false
fi

echo ""
echo "================================"
echo ""

# Ask user for setup method
echo "Choose setup method:"
echo "1) Docker (recommended - easiest)"
echo "2) Manual (requires PostgreSQL and Redis installed)"
echo ""
read -p "Enter choice [1 or 2]: " SETUP_CHOICE

if [ "$SETUP_CHOICE" = "1" ]; then
  if [ "$DOCKER_AVAILABLE" = false ]; then
    print_error "Docker is not available. Please install Docker or choose manual setup."
    exit 1
  fi

  echo ""
  echo "🐳 Setting up with Docker..."
  echo ""

  # Start Docker services
  echo "Starting PostgreSQL and Redis containers..."
  docker-compose up -d postgres redis

  print_success "Docker services started"

  # Wait for PostgreSQL to be ready
  echo "Waiting for PostgreSQL to be ready..."
  sleep 5

  print_success "PostgreSQL is ready"

elif [ "$SETUP_CHOICE" = "2" ]; then
  echo ""
  echo "🔧 Manual setup selected"
  echo ""

  # Check if PostgreSQL is running
  if command_exists psql; then
    echo "Checking PostgreSQL connection..."
    if psql -h localhost -U postgres -d postgres -c '\q' 2>/dev/null; then
      print_success "PostgreSQL is running"
    else
      print_warning "Cannot connect to PostgreSQL"
      echo "  Make sure PostgreSQL is running:"
      echo "  - macOS: brew services start postgresql@16"
      echo "  - Linux: sudo systemctl start postgresql"
      read -p "Press Enter when PostgreSQL is running..."
    fi
  else
    print_error "PostgreSQL is not installed"
    exit 1
  fi

  # Check if Redis is running
  if command_exists redis-cli; then
    if redis-cli ping >/dev/null 2>&1; then
      print_success "Redis is running"
    else
      print_warning "Redis is not running (optional but recommended)"
      echo "  Start Redis with:"
      echo "  - macOS: brew services start redis"
      echo "  - Linux: sudo systemctl start redis"
    fi
  fi

else
  print_error "Invalid choice. Exiting."
  exit 1
fi

echo ""
echo "================================"
echo ""

# Backend setup
echo "📦 Setting up Backend..."
echo ""

cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install
print_success "Backend dependencies installed"

# Setup .env file
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env

  # Generate random JWT secret
  JWT_SECRET=$(openssl rand -base64 32 | tr -d /=+ | cut -c1-32)

  # Update .env with generated JWT secret
  if [[ "$OS" == "Darwin" ]]; then
    # macOS
    sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
  else
    # Linux
    sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
  fi

  print_success ".env file created with random JWT secret"
else
  print_warning ".env file already exists, skipping"
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init
print_success "Database migrations completed"

cd ..

echo ""
echo "================================"
echo ""

# Frontend setup
echo "📦 Setting up Frontend..."
echo ""

cd frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

# Setup .env file
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  print_success ".env file created"
else
  print_warning ".env file already exists, skipping"
fi

cd ..

echo ""
echo "================================"
echo ""

# Create start script
echo "📝 Creating start scripts..."

# Create start.sh
cat > start.sh << 'EOF'
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
EOF

chmod +x start.sh

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash
# Stop all ObliKey processes

echo "🛑 Stopping ObliKey..."

# Kill all node processes running dev servers
pkill -f "npm run dev"
pkill -f "vite"
pkill -f "ts-node-dev"

echo "✅ All servers stopped"
EOF

chmod +x stop.sh

# Create test script
cat > test.sh << 'EOF'
#!/bin/bash
# Run all tests

echo "🧪 Running Tests..."
echo ""

cd backend
npm test -- --coverage

echo ""
echo "✅ Tests completed"
EOF

chmod +x test.sh

print_success "Scripts created (start.sh, stop.sh, test.sh)"

echo ""
echo "================================"
echo ""
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the application:"
echo "   ./start.sh"
echo ""
echo "2. Open your browser:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000/health"
echo ""
echo "3. Create your first user:"
echo "   Go to http://localhost:5173/register"
echo ""
echo "4. Run tests:"
echo "   ./test.sh"
echo ""
echo "5. Stop all servers:"
echo "   ./stop.sh"
echo ""
echo "📚 Documentation:"
echo "   - MANUAL_TESTING_GUIDE.md - Complete testing guide"
echo "   - API_DOCUMENTATION.md     - API reference"
echo "   - TESTING_GUIDE.md         - Automated testing guide"
echo ""
echo "Happy coding! 🎉"
echo ""
