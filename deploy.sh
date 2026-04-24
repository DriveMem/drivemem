#!/bin/bash
# DriveMem Zero-Downtime Deploy Script
# Usage: ./deploy.sh [--api-only|--web-only|--all]
#
# Key: BUILD FIRST, RESTART AFTER. Never rm -rf dist.

set -euo pipefail

REPO="/home/ubuntu/repos/ai-drive"
cd "$REPO"

MODE="${1:---all}"
log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== Deploy Start (mode: $MODE) ==="

log "Pulling..."
git pull --ff-only || { log "ERROR: git pull failed"; exit 1; }
log "Commit: $(git log --oneline -1)"

# Always build shared packages first (API and Web both depend on them)
log "Building shared packages..."
(cd packages/shared-types && npx tsc) || { log "ERROR: shared-types build failed!"; exit 1; }
(cd packages/shared && npx tsc) || { log "ERROR: shared build failed!"; exit 1; }
log "Shared packages built ✅"

if [[ "$MODE" == "--all" || "$MODE" == "--api-only" ]]; then
  log "Building API..."
  (cd apps/api && npx tsc) || { log "ERROR: API build failed!"; exit 1; }
  log "Restarting API + Worker..."
  pm2 restart ai-drive-api ai-drive-worker --update-env 2>/dev/null || true
fi

if [[ "$MODE" == "--all" || "$MODE" == "--web-only" ]]; then
  log "Building Web..."
  (cd apps/web && npx next build) || { log "ERROR: Web build failed!"; exit 1; }
  log "Restarting Web..."
  pm2 restart ai-drive-web --update-env 2>/dev/null || true
fi

sleep 4
log "Health check..."
for i in 1 2 3; do
  API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null || echo "000")
  WEB=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
  [[ "$API" == "200" && "$WEB" == "200" ]] && break
  sleep 2
done
log "API: $API $([ "$API" = "200" ] && echo '✅' || echo '❌') | Web: $WEB $([ "$WEB" = "200" ] && echo '✅' || echo '❌')"
log "=== Deploy Complete ==="
pm2 status
