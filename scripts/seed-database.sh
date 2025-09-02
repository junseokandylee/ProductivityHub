#!/bin/bash

# Database Seeding Script for Political Productivity Hub
# Seeds the database with test data for development and testing

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend/ProductivityHub.Api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌱 Political Productivity Hub - Database Seeding${NC}"
echo "=============================================="
echo ""

# Check if .NET SDK is available
if ! command -v dotnet &> /dev/null; then
    echo -e "${RED}❌ .NET SDK is not installed or not in PATH${NC}"
    exit 1
fi

# Check if Node.js is available (for test data generation)
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. CSV/JSON generation will be skipped.${NC}"
    SKIP_CSV_GENERATION=true
fi

# Navigate to backend directory
cd "$BACKEND_DIR"

echo -e "${BLUE}📊 Step 1: Database Migration${NC}"
echo "Running database migrations..."
if dotnet ef database update; then
    echo -e "${GREEN}✅ Database migrations applied successfully${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🌱 Step 2: EF Core Seed Data${NC}"
echo "Running EF Core seed service..."
if dotnet run --project "$BACKEND_DIR" --seed; then
    echo -e "${GREEN}✅ EF Core seed data created successfully${NC}"
else
    echo -e "${RED}❌ EF Core seeding failed${NC}"
    exit 1
fi

echo ""
if [ "$SKIP_CSV_GENERATION" != "true" ]; then
    echo -e "${BLUE}📄 Step 3: CSV/JSON Test Data Generation${NC}"
    echo "Installing Node.js dependencies..."
    
    cd "$SCRIPT_DIR"
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    echo "Generating test data files..."
    # Generate different sizes of test data
    node generate-test-data.js --contacts 1000 --campaigns 5 --output ./test-data/small
    node generate-test-data.js --contacts 5000 --campaigns 15 --output ./test-data/medium  
    node generate-test-data.js --contacts 10000 --campaigns 25 --output ./test-data/large
    
    echo -e "${GREEN}✅ CSV/JSON test data generated successfully${NC}"
    echo "   - Small dataset: 1,000 contacts, 5 campaigns"
    echo "   - Medium dataset: 5,000 contacts, 15 campaigns"  
    echo "   - Large dataset: 10,000 contacts, 25 campaigns"
else
    echo -e "${YELLOW}📄 Step 3: CSV/JSON Test Data Generation (SKIPPED)${NC}"
    echo "Node.js not available. Install Node.js to generate CSV/JSON test files."
fi

echo ""
echo -e "${BLUE}🧪 Step 4: Verification${NC}"
echo "Verifying seed data..."

cd "$BACKEND_DIR"

# Quick verification using EF Core CLI (if available) or custom verification
cat << 'EOF' > temp_verify.sql
SELECT 
    'tenants' as table_name, COUNT(*) as count 
FROM tenants 
UNION ALL
SELECT 
    'users' as table_name, COUNT(*) as count 
FROM users 
UNION ALL
SELECT 
    'contacts' as table_name, COUNT(*) as count 
FROM contacts
UNION ALL
SELECT 
    'campaigns' as table_name, COUNT(*) as count 
FROM campaigns
UNION ALL
SELECT 
    'tags' as table_name, COUNT(*) as count 
FROM tags;
EOF

# If PostgreSQL client is available, run the verification query
if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
    echo "Database verification results:"
    psql "$DATABASE_URL" -f temp_verify.sql
    rm temp_verify.sql
    echo -e "${GREEN}✅ Database verification completed${NC}"
else
    echo -e "${YELLOW}⚠️  Direct database verification skipped (psql or DATABASE_URL not available)${NC}"
    echo "Manual verification: Check your database for seeded data"
    rm temp_verify.sql
fi

echo ""
echo -e "${GREEN}🎉 Database seeding completed successfully!${NC}"
echo ""
echo "📊 What was created:"
echo "   • 3 tenant organizations (정치 정당)"
echo "   • 15 users (5 per tenant: Owner, Admin, 3 Staff)"  
echo "   • ~90 tags per tenant (직업, 관심사, 상태 태그)"
echo "   • 800-1200 contacts per tenant with encrypted PII"
echo "   • 5-11 campaigns per tenant with various statuses"

if [ "$SKIP_CSV_GENERATION" != "true" ]; then
echo "   • CSV/JSON test files in ./scripts/test-data/"
fi

echo ""
echo "🔑 Test Login Credentials:"
echo "   Email: admin@test.com"
echo "   Password: Password123!"
echo "   Role: Owner"
echo ""
echo "   Additional accounts: manager@test.com, staff1@test.com, staff2@test.com, staff3@test.com"
echo "   All passwords: Password123!"
echo ""
echo "🚀 Your Political Productivity Hub is ready for testing!"