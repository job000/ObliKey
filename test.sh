#!/bin/bash
# Run all tests

echo "🧪 Running Tests..."
echo ""

cd backend
npm test -- --coverage

echo ""
echo "✅ Tests completed"
