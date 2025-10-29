#!/bin/bash

# Comprehensive Test Suite for User Creation API
# Tests security, validation, and business logic

BASE_URL="http://localhost:3000/api"
ADMIN_TOKEN=""
CUSTOMER_TOKEN=""
TRAINER_TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test result
print_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        echo -e "${RED}   Error: $3${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

print_section() {
    echo -e "\n${YELLOW}======================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}======================================${NC}\n"
}

# Get admin token (assuming admin user exists)
get_admin_token() {
    echo "Getting ADMIN token..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin1@test.no",
            "password": "Admin123!"
        }')

    ADMIN_TOKEN=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null)

    if [ -z "$ADMIN_TOKEN" ]; then
        echo "Failed to get ADMIN token. Response: $RESPONSE"
        exit 1
    fi
    echo "ADMIN token obtained: ${ADMIN_TOKEN:0:20}..."
}

# Test 1: Authentication - No token
print_section "TEST CATEGORY 1: AUTHENTICATION & AUTHORIZATION"

test_no_token() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@test.no",
            "password": "Test123!",
            "firstName": "Test",
            "lastName": "User",
            "role": "CUSTOMER"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "401" ]; then
        print_result 0 "Unauthenticated request rejected"
    else
        print_result 1 "Unauthenticated request should be rejected" "HTTP $HTTP_CODE: $BODY"
    fi
}

# Test 2: CUSTOMER trying to create user
test_customer_forbidden() {
    # First get customer token (you'll need a customer account)
    echo "Note: Skipping CUSTOMER test - requires customer account setup"
}

# Test 3: Valid ADMIN request
test_valid_admin_create() {
    RANDOM_EMAIL="test$(date +%s)@test.no"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$RANDOM_EMAIL\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "201" ]; then
        print_result 0 "ADMIN can create CUSTOMER user"
    else
        print_result 1 "ADMIN should be able to create CUSTOMER" "HTTP $HTTP_CODE: $BODY"
    fi
}

print_section "TEST CATEGORY 2: ROLE VALIDATION & PRIVILEGE ESCALATION"

# Test 4: Attempt to create ADMIN (privilege escalation)
test_create_admin_role() {
    RANDOM_EMAIL="admin$(date +%s)@test.no"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$RANDOM_EMAIL\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"Hacker\",
            \"lastName\": \"Admin\",
            \"role\": \"ADMIN\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Privilege escalation to ADMIN prevented"
    else
        print_result 1 "Should prevent ADMIN role creation" "HTTP $HTTP_CODE: $BODY"
    fi
}

# Test 5: Attempt to create SUPER_ADMIN (critical security)
test_create_super_admin_role() {
    RANDOM_EMAIL="superadmin$(date +%s)@test.no"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$RANDOM_EMAIL\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"Hacker\",
            \"lastName\": \"SuperAdmin\",
            \"role\": \"SUPER_ADMIN\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "CRITICAL: Privilege escalation to SUPER_ADMIN prevented"
    else
        print_result 1 "CRITICAL: Should prevent SUPER_ADMIN role creation" "HTTP $HTTP_CODE: $BODY"
    fi
}

# Test 6: Create TRAINER role (allowed)
test_create_trainer_role() {
    RANDOM_EMAIL="trainer$(date +%s)@test.no"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$RANDOM_EMAIL\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"Test\",
            \"lastName\": \"Trainer\",
            \"role\": \"TRAINER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "201" ]; then
        print_result 0 "ADMIN can create TRAINER user"
    else
        print_result 1 "ADMIN should be able to create TRAINER" "HTTP $HTTP_CODE: $BODY"
    fi
}

print_section "TEST CATEGORY 3: INPUT VALIDATION"

# Test 7: Missing required fields
test_missing_fields() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "email": "test@test.no"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Missing required fields rejected"
    else
        print_result 1 "Should reject missing required fields" "HTTP $HTTP_CODE"
    fi
}

# Test 8: Invalid email format
test_invalid_email() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "email": "invalid-email",
            "password": "ValidPass123!",
            "firstName": "Test",
            "lastName": "User",
            "role": "CUSTOMER"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Invalid email format rejected"
    else
        print_result 1 "Should reject invalid email" "HTTP $HTTP_CODE"
    fi
}

# Test 9: Weak password
test_weak_password() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"test$(date +%s)@test.no\",
            \"password\": \"weak\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Weak password rejected"
    else
        print_result 1 "Should reject weak password" "HTTP $HTTP_CODE"
    fi
}

# Test 10: Password without uppercase
test_password_no_uppercase() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"test$(date +%s)@test.no\",
            \"password\": \"nouppercase123!\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Password without uppercase rejected"
    else
        print_result 1 "Should reject password without uppercase" "HTTP $HTTP_CODE"
    fi
}

# Test 11: Password without lowercase
test_password_no_lowercase() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"test$(date +%s)@test.no\",
            \"password\": \"NOLOWERCASE123!\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Password without lowercase rejected"
    else
        print_result 1 "Should reject password without lowercase" "HTTP $HTTP_CODE"
    fi
}

# Test 12: Password without number
test_password_no_number() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"test$(date +%s)@test.no\",
            \"password\": \"NoNumber!\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Password without number rejected"
    else
        print_result 1 "Should reject password without number" "HTTP $HTTP_CODE"
    fi
}

print_section "TEST CATEGORY 4: BUSINESS LOGIC"

# Test 13: Duplicate email
test_duplicate_email() {
    EMAIL="duplicate$(date +%s)@test.no"

    # Create first user
    curl -s -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$EMAIL\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"First\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\"
        }" > /dev/null

    # Try to create duplicate
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$EMAIL\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"Duplicate\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "409" ]; then
        print_result 0 "Duplicate email rejected with 409 Conflict"
    else
        print_result 1 "Should reject duplicate email with 409" "HTTP $HTTP_CODE"
    fi
}

# Test 14: Username generation
test_username_generation() {
    RANDOM_EMAIL="nouser$(date +%s)@test.no"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$RANDOM_EMAIL\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"John\",
            \"lastName\": \"Doe\",
            \"role\": \"CUSTOMER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "201" ]; then
        USERNAME=$(echo $BODY | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('username', ''))" 2>/dev/null)
        if [ -n "$USERNAME" ]; then
            print_result 0 "Username auto-generated: $USERNAME"
        else
            print_result 1 "Username should be auto-generated" "No username in response"
        fi
    else
        print_result 1 "User creation failed" "HTTP $HTTP_CODE"
    fi
}

# Test 15: Custom username
test_custom_username() {
    RANDOM_EMAIL="customuser$(date +%s)@test.no"
    CUSTOM_USERNAME="custom_user_$(date +%s)"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$RANDOM_EMAIL\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"Custom\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\",
            \"username\": \"$CUSTOM_USERNAME\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "201" ]; then
        USERNAME=$(echo $BODY | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('username', ''))" 2>/dev/null)
        if [ "$USERNAME" = "$CUSTOM_USERNAME" ]; then
            print_result 0 "Custom username accepted: $USERNAME"
        else
            print_result 1 "Custom username should be preserved" "Expected: $CUSTOM_USERNAME, Got: $USERNAME"
        fi
    else
        print_result 1 "User creation with custom username failed" "HTTP $HTTP_CODE"
    fi
}

# Test 16: Invalid username format
test_invalid_username() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"test$(date +%s)@test.no\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\",
            \"username\": \"invalid username with spaces\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "Invalid username format rejected"
    else
        print_result 1 "Should reject invalid username format" "HTTP $HTTP_CODE"
    fi
}

print_section "TEST CATEGORY 5: SQL INJECTION & XSS TESTS"

# Test 17: SQL Injection in email
test_sql_injection_email() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "email": "test@test.no OR 1=1--",
            "password": "ValidPass123!",
            "firstName": "Test",
            "lastName": "User",
            "role": "CUSTOMER"
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "400" ]; then
        print_result 0 "SQL injection in email prevented"
    else
        print_result 1 "SQL injection should be prevented" "HTTP $HTTP_CODE"
    fi
}

# Test 18: XSS in firstName
test_xss_firstname() {
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"email\": \"test$(date +%s)@test.no\",
            \"password\": \"ValidPass123!\",
            \"firstName\": \"<script>alert('XSS')</script>\",
            \"lastName\": \"User\",
            \"role\": \"CUSTOMER\"
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    # Check if user was created and firstName is sanitized
    if [ "$HTTP_CODE" = "201" ]; then
        FIRSTNAME=$(echo $BODY | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('firstName', ''))" 2>/dev/null)
        if [[ "$FIRSTNAME" == *"<script>"* ]]; then
            print_result 1 "XSS content should be sanitized" "Script tag found in firstName"
        else
            print_result 0 "XSS content handled (created but may need sanitization check)"
        fi
    else
        print_result 0 "XSS payload rejected"
    fi
}

# Run all tests
main() {
    echo "====================================="
    echo "USER CREATION API - COMPREHENSIVE TEST SUITE"
    echo "====================================="
    echo ""

    get_admin_token

    test_no_token
    test_customer_forbidden
    test_valid_admin_create

    test_create_admin_role
    test_create_super_admin_role
    test_create_trainer_role

    test_missing_fields
    test_invalid_email
    test_weak_password
    test_password_no_uppercase
    test_password_no_lowercase
    test_password_no_number

    test_duplicate_email
    test_username_generation
    test_custom_username
    test_invalid_username

    test_sql_injection_email
    test_xss_firstname

    # Print summary
    print_section "TEST SUMMARY"
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed. Please review the output above.${NC}"
        exit 1
    fi
}

main
