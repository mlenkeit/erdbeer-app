#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8080/api}"
TOKEN="${2:-}"
PASS=0
FAIL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() {
    PASS=$((PASS + 1))
    echo -e "${GREEN}  PASS${NC} $1"
}

fail() {
    FAIL=$((FAIL + 1))
    echo -e "${RED}  FAIL${NC} $1: $2"
}

assert_status() {
    local description="$1"
    local expected="$2"
    local actual="$3"
    if [ "$actual" = "$expected" ]; then
        pass "$description"
    else
        fail "$description" "expected $expected, got $actual"
    fi
}

assert_json_field() {
    local description="$1"
    local body="$2"
    local field="$3"
    local expected="$4"
    local actual
    actual=$(echo "$body" | jq -r "$field")
    if [ "$actual" = "$expected" ]; then
        pass "$description"
    else
        fail "$description" "expected $expected, got $actual"
    fi
}

assert_header() {
    local description="$1"
    local headers="$2"
    local header_name="$3"
    if echo "$headers" | grep -qi "$header_name"; then
        pass "$description"
    else
        fail "$description" "header $header_name not found"
    fi
}

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}Usage: $0 <BASE_URL> <INVITE_TOKEN>${NC}"
    echo "  BASE_URL defaults to http://localhost:8080/api"
    echo "  INVITE_TOKEN is required (32 hex chars)"
    exit 1
fi

echo ""
echo "=== Smoke Tests ==="
echo "Base URL: $BASE_URL"
echo "Token:    ${TOKEN:0:8}..."
echo ""

# --- OPTIONS preflight ---
echo "--- OPTIONS preflight ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE_URL/group/$TOKEN")
assert_status "OPTIONS /group returns 204" "204" "$STATUS"

HEADERS=$(curl -sI -X OPTIONS "$BASE_URL/group/$TOKEN")
assert_header "CORS Allow-Origin header present" "$HEADERS" "access-control-allow-origin"
assert_header "CORS Allow-Methods header present" "$HEADERS" "access-control-allow-methods"

# --- GET /group/:token ---
echo ""
echo "--- GET /group/:token ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/group/$TOKEN")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "GET /group returns 200" "200" "$STATUS"
assert_json_field "Response has group name" "$BODY" ".data.name" "$(echo "$BODY" | jq -r '.data.name')"
assert_json_field "Response has season" "$BODY" ".data.season.id" "$(echo "$BODY" | jq -r '.data.season.id')"

# --- GET /group with invalid token ---
echo ""
echo "--- Invalid token ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/group/00000000000000000000000000000000")
assert_status "Invalid token returns 404" "404" "$STATUS"

BODY=$(curl -s "$BASE_URL/group/00000000000000000000000000000000")
assert_json_field "Error code is GROUP_NOT_FOUND" "$BODY" ".error.code" "GROUP_NOT_FOUND"

# --- Security headers ---
echo ""
echo "--- Security headers ---"
HEADERS=$(curl -sI "$BASE_URL/group/$TOKEN")
assert_header "X-Content-Type-Options present" "$HEADERS" "x-content-type-options"
assert_header "Referrer-Policy present" "$HEADERS" "referrer-policy"
assert_header "Cache-Control present" "$HEADERS" "cache-control"
assert_header "Content-Type is JSON" "$HEADERS" "content-type: application/json"

# --- POST /purchases/:token (create) ---
echo ""
echo "--- POST /purchases/:token ---"

SEASON_START=$(curl -s "$BASE_URL/group/$TOKEN" | jq -r '.data.season.startDate')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/purchases/$TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"purchasedAt\":\"$SEASON_START\",\"items\":[{\"bagSizeGrams\":500,\"quantity\":2,\"priceCents\":399,\"priceUnit\":\"kg\"}]}")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "POST /purchases returns 201" "201" "$STATUS"

PURCHASE_ID=$(echo "$BODY" | jq -r '.data.id')
assert_json_field "Created purchase has totalGrams" "$BODY" ".data.totalGrams" "1000"
assert_json_field "Created purchase has pricePerKgCents" "$BODY" ".data.items[0].pricePerKgCents" "399"

# --- POST without Content-Type ---
echo ""
echo "--- Content-Type enforcement ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/purchases/$TOKEN" \
    -d "{\"purchasedAt\":\"$SEASON_START\",\"items\":[{\"bagSizeGrams\":500,\"quantity\":1,\"priceCents\":100,\"priceUnit\":\"kg\"}]}")
assert_status "POST without Content-Type returns 415" "415" "$STATUS"

# --- POST with validation errors ---
echo ""
echo "--- Validation errors ---"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/purchases/$TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"purchasedAt\":\"$SEASON_START\",\"items\":[]}")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "Empty items returns 400" "400" "$STATUS"
assert_json_field "Error code is VALIDATION_ERROR" "$BODY" ".error.code" "VALIDATION_ERROR"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/purchases/$TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"purchasedAt\":\"2000-01-01\",\"items\":[{\"bagSizeGrams\":500,\"quantity\":1,\"priceCents\":100,\"priceUnit\":\"kg\"}]}")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "Date outside season returns 400" "400" "$STATUS"
assert_json_field "Error code is VALIDATION_ERROR" "$BODY" ".error.code" "VALIDATION_ERROR"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/purchases/$TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"purchasedAt\":\"$SEASON_START\",\"items\":[{\"bagSizeGrams\":999,\"quantity\":1,\"priceCents\":100,\"priceUnit\":\"kg\"}]}")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "Invalid bagSizeGrams returns 400" "400" "$STATUS"

# --- GET /purchases/:token (list) ---
echo ""
echo "--- GET /purchases/:token (list) ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/purchases/$TOKEN")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "GET /purchases returns 200" "200" "$STATUS"
assert_json_field "Response has summary" "$BODY" ".data.summary.totalGrams" "$(echo "$BODY" | jq -r '.data.summary.totalGrams')"

PURCHASE_COUNT=$(echo "$BODY" | jq '.data.purchases | length')
if [ "$PURCHASE_COUNT" -ge 1 ]; then
    pass "Purchases list is not empty"
else
    fail "Purchases list is not empty" "got $PURCHASE_COUNT purchases"
fi

# --- GET /purchases/:token/:id (single) ---
echo ""
echo "--- GET /purchases/:token/:id ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/purchases/$TOKEN/$PURCHASE_ID")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "GET single purchase returns 200" "200" "$STATUS"
assert_json_field "Purchase ID matches" "$BODY" ".data.id" "$PURCHASE_ID"

# --- GET single purchase with wrong ID ---
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/purchases/$TOKEN/999999")
assert_status "Non-existent purchase returns 404" "404" "$STATUS"

# --- PUT /purchases/:token/:id ---
echo ""
echo "--- PUT /purchases/:token/:id ---"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/purchases/$TOKEN/$PURCHASE_ID" \
    -H "Content-Type: application/json" \
    -d "{\"purchasedAt\":\"$SEASON_START\",\"items\":[{\"bagSizeGrams\":250,\"quantity\":3,\"priceCents\":249,\"priceUnit\":\"500g\"}]}")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "PUT returns 200" "200" "$STATUS"
assert_json_field "Updated purchase has totalGrams 750" "$BODY" ".data.totalGrams" "750"

# --- GET /leaderboard/:token ---
echo ""
echo "--- GET /leaderboard/:token ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/leaderboard/$TOKEN")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "GET /leaderboard returns 200" "200" "$STATUS"
assert_json_field "Response has season" "$BODY" ".data.season.id" "$(echo "$BODY" | jq -r '.data.season.id')"
assert_json_field "Response has currentGroupId" "$BODY" ".data.currentGroupId" "$(echo "$BODY" | jq -r '.data.currentGroupId')"

LB_COUNT=$(echo "$BODY" | jq '.data.leaderboard | length')
if [ "$LB_COUNT" -ge 1 ]; then
    pass "Leaderboard has entries"
else
    fail "Leaderboard has entries" "got $LB_COUNT entries"
fi

RANK1=$(echo "$BODY" | jq '.data.leaderboard[0].rank')
assert_status "First entry has rank 1" "1" "$RANK1"

GAP1=$(echo "$BODY" | jq '.data.leaderboard[0].gapToNextGrams')
assert_status "First entry has null gap" "null" "$GAP1"

# --- DELETE /purchases/:token/:id ---
echo ""
echo "--- DELETE /purchases/:token/:id ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/purchases/$TOKEN/$PURCHASE_ID")
assert_status "DELETE returns 204" "204" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/purchases/$TOKEN/$PURCHASE_ID")
assert_status "Deleted purchase returns 404" "404" "$STATUS"

# --- Summary ---
echo ""
echo "=== Results ==="
TOTAL=$((PASS + FAIL))
echo -e "Total: $TOTAL  ${GREEN}Pass: $PASS${NC}  ${RED}Fail: $FAIL${NC}"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
exit 0
