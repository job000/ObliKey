#!/bin/bash

# Security test for Exercise Media API
# Tests all security validations

echo "==================================="
echo "Security Test: Exercise Media API"
echo "==================================="

# Setup: Get a valid token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZmIyMDc5Mi0yYjRhLTRjZjgtODcwMC1kN2QyOTU3NWE5NGQiLCJ0ZW5hbnRJZCI6ImI3OWYxYzJhLTdiMTItNGRlZC1hNmY4LWRmMzI3ZDRiZjEwYyIsImVtYWlsIjoidGVzdGFkbWluQG9ibGlrZXkubm8iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NjE5NDQ5MzQsImV4cCI6MTc2MjU0OTczNH0.TsS8H9xchEdrxyoXfupClYKtaXLx3wvnswAuZFLm1Wk"

# Valid system exercise ID for testing
VALID_EXERCISE_ID="6f5b8a40-3c1e-4d89-a2f3-8e9d0c1f2b3a"

echo ""
echo "Test 1: Invalid UUID format (should fail with 400)"
echo "---------------------------------------------------"
curl -s -X GET "http://localhost:3000/api/workouts/exercises/not-a-uuid/media?exerciseType=system" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "Test 2: Invalid exercise type (should fail with 400)"
echo "-----------------------------------------------------"
curl -s -X GET "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media?exerciseType=invalid" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "Test 3: SSRF Attack - Localhost URL (should fail with 400)"
echo "-----------------------------------------------------------"
curl -s -X POST "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3000/api/users",
    "mediaType": "IMAGE",
    "title": "Test",
    "exerciseType": "system"
  }' | jq .

echo ""
echo "Test 4: SSRF Attack - Private IP (should fail with 400)"
echo "---------------------------------------------------------"
curl -s -X POST "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://192.168.1.1/admin",
    "mediaType": "IMAGE",
    "title": "Test",
    "exerciseType": "system"
  }' | jq .

echo ""
echo "Test 5: SSRF Attack - AWS Metadata (should fail with 400)"
echo "-----------------------------------------------------------"
curl -s -X POST "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://169.254.169.254/latest/meta-data/",
    "mediaType": "IMAGE",
    "title": "Test",
    "exerciseType": "system"
  }' | jq .

echo ""
echo "Test 6: XSS Attack - HTML in title (should be sanitized)"
echo "----------------------------------------------------------"
curl -s -X POST "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/image.jpg",
    "mediaType": "IMAGE",
    "title": "<script>alert(\"XSS\")</script>Test Title",
    "description": "<img src=x onerror=alert(\"XSS\")>Description",
    "exerciseType": "system"
  }' | jq .

echo ""
echo "Test 7: Invalid media type (should fail with 400)"
echo "---------------------------------------------------"
curl -s -X POST "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/file.pdf",
    "mediaType": "PDF",
    "title": "Test",
    "exerciseType": "system"
  }' | jq .

echo ""
echo "Test 8: Invalid sort order (should fail with 400)"
echo "---------------------------------------------------"
curl -s -X POST "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/image.jpg",
    "mediaType": "IMAGE",
    "title": "Test",
    "sortOrder": 9999,
    "exerciseType": "system"
  }' | jq .

echo ""
echo "Test 9: Valid request (should succeed with 200)"
echo "-------------------------------------------------"
curl -s -X POST "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/valid-image.jpg",
    "mediaType": "IMAGE",
    "title": "Valid Test Image",
    "description": "This is a valid test image",
    "sortOrder": 10,
    "exerciseType": "system"
  }' | jq .

echo ""
echo "Test 10: Rate Limiting (should fail after 30 requests)"
echo "--------------------------------------------------------"
echo "Sending 35 rapid requests to trigger rate limit..."
for i in {1..35}; do
  RESPONSE=$(curl -s -X POST "http://localhost:3000/api/workouts/exercises/$VALID_EXERCISE_ID/media" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "url": "https://example.com/test.jpg",
      "mediaType": "IMAGE",
      "title": "Rate limit test '"$i"'",
      "exerciseType": "system"
    }')

  if echo "$RESPONSE" | grep -q "Too many requests"; then
    echo "✅ Rate limit triggered at request $i"
    echo "$RESPONSE" | jq .
    break
  elif [ $i -eq 35 ]; then
    echo "⚠️  Rate limit not triggered after 35 requests"
  fi
done

echo ""
echo "==================================="
echo "Security Test Complete"
echo "==================================="
