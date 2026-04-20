#!/usr/bin/env bash
# Post-CF-Fix Smoke Test
# Verifies all new API routes and frontend are reachable after Cloudflare DNS fix.
# Usage: ./post-cf-fix-smoke-test.sh [API_BASE] [FRONTEND_URL]

set -euo pipefail

API_BASE="${1:-https://api.drivemem.cloud}"
FRONTEND="${2:-https://drivemem.cloud}"

PASS=0
FAIL=0
RESULTS=()

check() {
  local label="$1" method="$2" url="$3" shift_count=3
  shift 3
  local expect_codes=("$@")

  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$url" --max-time 10 2>/dev/null || echo "000")

  local matched=false
  for code in "${expect_codes[@]}"; do
    [[ "$status" == "$code" ]] && matched=true && break
  done

  if $matched; then
    RESULTS+=("✅ PASS  $label (HTTP $status)")
    ((PASS++)) || true
  else
    RESULTS+=("❌ FAIL  $label (HTTP $status, expected ${expect_codes[*]})")
    ((FAIL++)) || true
  fi
}

echo "🔍 Post-CF-Fix Smoke Test"
echo "   API:      $API_BASE"
echo "   Frontend: $FRONTEND"
echo "-------------------------------------------"

# API route checks (expect 200 or 401, NOT 404)
check "GET  /api/v1/activation-status" GET  "$API_BASE/api/v1/activation-status" 200 401
check "POST /api/v1/feedback"          POST "$API_BASE/api/v1/feedback"          401
check "GET  /api/v1/nudge/status"      GET  "$API_BASE/api/v1/nudge/status"      401
check "GET  /api/v1/digest/weekly"     GET  "$API_BASE/api/v1/digest/weekly"     401
check "GET  /api/v1/files"             GET  "$API_BASE/api/v1/files"             401

# Frontend check
check "Frontend drivemem.cloud"        GET  "$FRONTEND"                          200

# Plausible CSP header check
echo ""
CSP=$(curl -s -I "$FRONTEND" --max-time 10 2>/dev/null | grep -i 'content-security-policy' || true)
if echo "$CSP" | grep -qi 'plausible'; then
  RESULTS+=("✅ PASS  CSP includes plausible")
  ((PASS++)) || true
else
  RESULTS+=("❌ FAIL  CSP missing plausible (header: ${CSP:-<empty>})")
  ((FAIL++)) || true
fi

# Summary
echo ""
echo "==========================================="
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "==========================================="
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo "==========================================="

[[ $FAIL -eq 0 ]] && echo "🎉 ALL CHECKS PASSED" || echo "⚠️  SOME CHECKS FAILED"
exit $FAIL
