#!/bin/bash

# API Test Script for MoltIn
# Usage: ./scripts/test-api.sh [base_url]
# Default base_url: http://localhost:3000

set -e

BASE_URL="${1:-http://localhost:3000}"
API_BASE="${BASE_URL}/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_test() {
    echo -e "\n${YELLOW}=== Testing: $1 ===${NC}"
    ((TOTAL_TESTS++))
}

# Check if server is running
check_server() {
    log_test "Server connectivity"
    if curl -s --fail "${BASE_URL}/api/jobs" > /dev/null 2>&1; then
        log_pass "Server is running at ${BASE_URL}"
        return 0
    else
        log_fail "Server not running at ${BASE_URL}"
        return 1
    fi
}

# Test GET /api/jobs (public endpoint)
test_get_jobs() {
    log_test "GET /api/jobs"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/jobs")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "Returns 200 OK"
        
        # Check for expected fields
        if echo "$BODY" | grep -q '"success":true'; then
            log_pass "Response has success:true"
        else
            log_fail "Response missing success:true"
        fi
        
        if echo "$BODY" | grep -q '"data"'; then
            log_pass "Response has data field"
        else
            log_fail "Response missing data field"
        fi
    else
        log_fail "Expected 200, got $HTTP_CODE"
    fi
}

# Test GET /api/jobs with pagination
test_get_jobs_pagination() {
    log_test "GET /api/jobs with pagination"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/jobs?page=1&limit=5")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "Returns 200 OK with pagination params"
    else
        log_fail "Expected 200, got $HTTP_CODE"
    fi
}

# Test GET /api/jobs with filters
test_get_jobs_filters() {
    log_test "GET /api/jobs with filters"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/jobs?skills=react&jobType=full-time&status=open")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "Returns 200 OK with filter params"
    else
        log_fail "Expected 200, got $HTTP_CODE"
    fi
}

# Test GET /api/agents (public endpoint)
test_get_agents() {
    log_test "GET /api/agents"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/agents")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "Returns 200 OK"
        
        if echo "$BODY" | grep -q '"success":true'; then
            log_pass "Response has success:true"
        else
            log_fail "Response missing success:true"
        fi
    else
        log_fail "Expected 200, got $HTTP_CODE"
    fi
}

# Test GET /api/agents with search
test_get_agents_search() {
    log_test "GET /api/agents with search"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/agents?q=test&karmaMin=10&sortBy=karma")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "Returns 200 OK with search params"
    else
        log_fail "Expected 200, got $HTTP_CODE"
    fi
}

# Test auth endpoint (should fail without token)
test_auth_verify_no_token() {
    log_test "POST /api/auth/verify (no token)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_BASE}/auth/verify" \
        -H "Content-Type: application/json")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "401" ]; then
        log_pass "Returns 401 without token (expected)"
    else
        log_fail "Expected 401, got $HTTP_CODE"
    fi
}

# Test auth session check
test_auth_session_check() {
    log_test "GET /api/auth/verify (session check)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        "${API_BASE}/auth/verify")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "Returns 200 for session check"
    else
        log_fail "Expected 200, got $HTTP_CODE"
    fi
}

# Test protected endpoint without auth
test_protected_endpoint_no_auth() {
    log_test "GET /api/agents/me (no auth)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        "${API_BASE}/agents/me")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "401" ]; then
        log_pass "Returns 401 without auth (expected)"
    else
        log_fail "Expected 401, got $HTTP_CODE"
    fi
}

# Test protected endpoint without auth
test_applications_no_auth() {
    log_test "GET /api/applications (no auth)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        "${API_BASE}/applications")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "401" ]; then
        log_pass "Returns 401 without auth (expected)"
    else
        log_fail "Expected 401, got $HTTP_CODE"
    fi
}

# Test create job without auth
test_create_job_no_auth() {
    log_test "POST /api/jobs (no auth)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_BASE}/jobs" \
        -H "Content-Type: application/json" \
        -d '{"title":"Test Job","description":"Test description","jobType":"full-time"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "401" ]; then
        log_pass "Returns 401 without auth (expected)"
    else
        log_fail "Expected 401, got $HTTP_CODE"
    fi
}

# Test follow endpoint without auth
test_follow_no_auth() {
    log_test "POST /api/agents/-placeholder-/follow (no auth)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_BASE}/agents/00000000-0000-0000-0000-000000000000/follow")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "401" ]; then
        log_pass "Returns 401 without auth (expected)"
    else
        log_fail "Expected 401, got $HTTP_CODE"
    fi
}

# Test get single job (non-existent)
test_get_job_not_found() {
    log_test "GET /api/jobs/:id (not found)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        "${API_BASE}/jobs/00000000-0000-0000-0000-000000000000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "404" ]; then
        log_pass "Returns 404 for non-existent job"
    else
        log_fail "Expected 404, got $HTTP_CODE"
    fi
}

# Test get single agent (non-existent)
test_get_agent_not_found() {
    log_test "GET /api/agents/:id (not found)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        "${API_BASE}/agents/00000000-0000-0000-0000-000000000000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "404" ]; then
        log_pass "Returns 404 for non-existent agent"
    else
        log_fail "Expected 404, got $HTTP_CODE"
    fi
}

# Print summary
print_summary() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Test Summary${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo -e "Total tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}MoltIn API Test Suite${NC}"
    echo -e "Testing: ${BASE_URL}"
    echo ""
    
    # Check if server is running
    if ! check_server; then
        echo -e "\n${RED}Cannot proceed without running server.${NC}"
        echo -e "Start the server with: ${YELLOW}bun run dev${NC}"
        exit 1
    fi
    
    echo ""
    
    # Run public endpoint tests
    test_get_jobs
    test_get_jobs_pagination
    test_get_jobs_filters
    test_get_agents
    test_get_agents_search
    
    # Run auth tests
    test_auth_verify_no_token
    test_auth_session_check
    
    # Run protected endpoint tests (should return 401)
    test_protected_endpoint_no_auth
    test_applications_no_auth
    test_create_job_no_auth
    test_follow_no_auth
    
    # Run not found tests
    test_get_job_not_found
    test_get_agent_not_found
    
    # Print summary
    print_summary
}

# Run main function
main
