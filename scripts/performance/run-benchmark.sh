#!/bin/bash

# Contact List Performance Benchmark Runner
# Validates <150ms p95 requirement from PRD

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:7001}"
TEST_TENANT_ID="${TEST_TENANT_ID:-test-tenant-123}"
AUTH_TOKEN="${AUTH_TOKEN:-test-token}"
BENCHMARK_DURATION="${BENCHMARK_DURATION:-5m}"
MAX_VUS="${MAX_VUS:-50}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Starting Contact List Performance Benchmark"
echo "=================================================="
echo "Target: <150ms p95 response time (PRD requirement)"
echo "Base URL: $BASE_URL"
echo "Duration: $BENCHMARK_DURATION"
echo "Max VUs: $MAX_VUS"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed. Please install k6 first.${NC}"
    echo "Installation instructions: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if API is accessible
echo "🔍 Checking API health..."
if ! curl -f -s "$BASE_URL/health" > /dev/null; then
    echo -e "${RED}❌ API is not accessible at $BASE_URL${NC}"
    echo "Please ensure the backend API is running."
    exit 1
fi

echo -e "${GREEN}✅ API is accessible${NC}"

# Create results directory
RESULTS_DIR="$(dirname "$0")/results"
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$RESULTS_DIR/benchmark_report_$TIMESTAMP.json"

echo ""
echo "🏃 Running performance benchmark..."
echo "Results will be saved to: $REPORT_FILE"

# Run k6 benchmark with custom configuration
k6 run \
    --vus $MAX_VUS \
    --duration $BENCHMARK_DURATION \
    --out json="$REPORT_FILE" \
    -e BASE_URL="$BASE_URL" \
    -e TEST_TENANT_ID="$TEST_TENANT_ID" \
    -e AUTH_TOKEN="$AUTH_TOKEN" \
    "$(dirname "$0")/contact-search-benchmark.js"

# Check if benchmark completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Benchmark completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Benchmark failed!${NC}"
    exit 1
fi

# Analyze results
echo ""
echo "📊 Performance Analysis"
echo "======================"

# Extract key metrics from the results
if [ -f "$REPORT_FILE" ]; then
    # Parse JSON results to extract key metrics
    SEARCH_P95=$(jq -r '.metrics.search_duration.values.p95 // "N/A"' "$REPORT_FILE")
    SEARCH_P99=$(jq -r '.metrics.search_duration.values.p99 // "N/A"' "$REPORT_FILE")
    LIST_P95=$(jq -r '.metrics.list_duration.values.p95 // "N/A"' "$REPORT_FILE")
    ERROR_RATE=$(jq -r '.metrics.errors.values.rate // "N/A"' "$REPORT_FILE")
    HTTP_REQ_P95=$(jq -r '.metrics.http_req_duration.values.p95 // "N/A"' "$REPORT_FILE")
    
    echo "Search Performance:"
    echo "  - P95: ${SEARCH_P95}ms"
    echo "  - P99: ${SEARCH_P99}ms"
    echo ""
    echo "List Performance:"
    echo "  - P95: ${LIST_P95}ms"
    echo ""
    echo "Overall HTTP Performance:"
    echo "  - P95: ${HTTP_REQ_P95}ms"
    echo ""
    echo "Error Rate: ${ERROR_RATE}"
    echo ""

    # Check if performance targets are met
    TARGET_MET=true
    
    # Check search P95 < 150ms
    if [ "$SEARCH_P95" != "N/A" ] && [ "$SEARCH_P95" != "null" ]; then
        SEARCH_P95_INT=$(echo "$SEARCH_P95" | cut -d'.' -f1)
        if [ "$SEARCH_P95_INT" -gt 150 ]; then
            echo -e "${RED}⚠️  Search P95 (${SEARCH_P95}ms) exceeds target (150ms)${NC}"
            TARGET_MET=false
        else
            echo -e "${GREEN}✅ Search P95 (${SEARCH_P95}ms) meets target (<150ms)${NC}"
        fi
    fi
    
    # Check list P95 < 150ms
    if [ "$LIST_P95" != "N/A" ] && [ "$LIST_P95" != "null" ]; then
        LIST_P95_INT=$(echo "$LIST_P95" | cut -d'.' -f1)
        if [ "$LIST_P95_INT" -gt 150 ]; then
            echo -e "${RED}⚠️  List P95 (${LIST_P95}ms) exceeds target (150ms)${NC}"
            TARGET_MET=false
        else
            echo -e "${GREEN}✅ List P95 (${LIST_P95}ms) meets target (<150ms)${NC}"
        fi
    fi
    
    # Check error rate < 1%
    if [ "$ERROR_RATE" != "N/A" ] && [ "$ERROR_RATE" != "null" ]; then
        ERROR_RATE_PERCENT=$(echo "scale=2; $ERROR_RATE * 100" | bc)
        if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo -e "${RED}⚠️  Error rate (${ERROR_RATE_PERCENT}%) exceeds target (<1%)${NC}"
            TARGET_MET=false
        else
            echo -e "${GREEN}✅ Error rate (${ERROR_RATE_PERCENT}%) meets target (<1%)${NC}"
        fi
    fi

    echo ""
    if [ "$TARGET_MET" = true ]; then
        echo -e "${GREEN}🎉 All performance targets met!${NC}"
        echo "The contact list meets the PRD requirement of <150ms p95 response time."
    else
        echo -e "${YELLOW}⚠️  Some performance targets not met.${NC}"
        echo "Consider optimizing database indexes, query performance, or infrastructure."
    fi

else
    echo -e "${RED}❌ Could not find results file for analysis${NC}"
fi

echo ""
echo "📁 Full results saved to: $REPORT_FILE"
echo ""
echo "🔧 Performance Tuning Suggestions:"
echo "=================================="
echo "1. Database Indexes:"
echo "   - Apply performance migration: backend/ProductivityHub.Api/Migrations/Performance/001_OptimizeContactListIndexes.sql"
echo "   - Monitor index usage with: SELECT * FROM pg_stat_user_indexes WHERE tablename='contacts';"
echo ""
echo "2. PostgreSQL Configuration:"
echo "   - Apply optimized config: docker/postgres/postgresql.conf"
echo "   - Adjust shared_buffers and effective_cache_size based on available RAM"
echo ""
echo "3. Application Performance:"
echo "   - Enable database connection pooling"
echo "   - Implement response caching for frequent queries"
echo "   - Add query result pagination to limit large result sets"
echo ""
echo "4. Monitoring:"
echo "   - Monitor slow queries with: SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;"
echo "   - Check cache hit ratios with: SELECT * FROM pg_statio_user_tables;"
echo ""
echo "🏁 Benchmark completed at $(date)"