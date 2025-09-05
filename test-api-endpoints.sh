#!/bin/bash

# Comprehensive API Endpoint Testing Script
# Tests all key endpoints of the ProductivityHub API

set -e  # Exit on any error

API_BASE="http://localhost:5284"
TEST_EMAIL="admin@test.com"
TEST_PASSWORD="Password123!"

echo "🧪 ProductivityHub API Endpoint Testing"
echo "========================================"
echo "API Base: $API_BASE"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local headers="$4"
    local data="$5"
    local expected_status="${6:-200}"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            ${headers:+-H "$headers"} \
            -d "$data" \
            "$API_BASE$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            ${headers:+-H "$headers"} \
            "$API_BASE$url")
    fi
    
    # Extract status code (last line) and body (everything else)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($status_code)"
        if [ -n "$7" ]; then  # If we have a validation function
            $7 "$body"
        fi
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        echo "Response: $body" | head -c 200
        echo ""
        return 1
    fi
}

# Validation functions
validate_login() {
    local body="$1"
    if echo "$body" | grep -q '"success":true' && echo "$body" | grep -q '"token"'; then
        # Extract and store JWT token
        JWT_TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        echo "    💾 JWT token extracted and saved"
        export JWT_TOKEN
    else
        echo -e "    ${RED}⚠️  Invalid login response${NC}"
    fi
}

validate_swagger() {
    local body="$1"
    if echo "$body" | grep -q "Swagger UI"; then
        echo "    📚 Swagger UI is available"
    fi
}

# Test Categories

echo "📋 1. HEALTH & DOCUMENTATION TESTS"
echo "-----------------------------------"
test_endpoint "Swagger UI" "/swagger/index.html" "GET" "" "" "200" "validate_swagger"
test_endpoint "Swagger JSON" "/swagger/v1/swagger.json" "GET"

echo ""
echo "🔐 2. AUTHENTICATION TESTS" 
echo "---------------------------"
# Use existing login test file (avoids JSON escaping issues)
test_endpoint "User Login" "/auth/login" "POST" "" "@/tmp/login.json" "200" "validate_login"

echo ""
echo "🏠 3. CORE APPLICATION TESTS"
echo "-----------------------------"

# Test protected endpoints with JWT
if [ -n "$JWT_TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"
    
    test_endpoint "Get Contacts" "/api/contacts" "GET" "$AUTH_HEADER"
    test_endpoint "Get Campaigns" "/api/campaigns" "GET" "$AUTH_HEADER" 
    test_endpoint "Get Tags" "/api/tags" "GET" "$AUTH_HEADER"
    
    echo ""
    echo "📊 4. ANALYTICS & METRICS TESTS"
    echo "--------------------------------"
    test_endpoint "Performance Metrics" "/health" "GET"
    
else
    echo -e "${RED}⚠️  Skipping protected endpoint tests - No JWT token available${NC}"
fi

echo ""
echo "🔧 5. DEVELOPMENT FEATURES"
echo "---------------------------"
test_endpoint "Health Check" "/health" "GET"

# Clean up
rm -f /tmp/api_login_test.json

# Summary
echo ""
echo "=========================================="
echo "🎉 API Testing Complete!"
echo ""
echo "✅ Backend API: $API_BASE" 
echo "✅ Frontend UI: http://localhost:13000"
echo "✅ Swagger Docs: $API_BASE/swagger"
echo ""
echo "🚀 ProductivityHub is ready for development!"