#!/bin/bash
# DriveMem Zero-Downtime Deploy Script
# Usage: ./deploy.sh [--api-only|--web-only|--all]
#
# IMPORTANT: Web builds generate unique hashes per build. When running behind
# a load balancer (Cloudflare), both VPS must serve identical .next artifacts.
# This script builds locally, then rsyncs .next to VPS2 if reachable.
#
# Key: BUILD FIRST, RESTART AFTER. Never rm -rf dist.

set -euo pipefail

REPO="/home/ubuntu/repos/ai-drive"
VPS2="ubuntu@43.165.168.72"
VPS2_REPO="~/repos/ai-drive"
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
log "Health check (local)..."
for i in 1 2 3; do
  API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null || echo "000")
  WEB=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
  [[ "$API" == "200" && "$WEB" == "200" ]] && break
  sleep 2
done
log "API: $API $([ "$API" = "200" ] && echo '✅' || echo '❌') | Web: $WEB $([ "$WEB" = "200" ] && echo '✅' || echo '❌')"

# --- Sync to VPS2 (critical: both VPS must serve identical build artifacts) ---
log "=== Syncing to VPS2 ($VPS2) ==="
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$VPS2" "echo ok" 2>/dev/null; then
  # Pull latest code on VPS2
  ssh "$VPS2" "source ~/.nvm/nvm.sh && cd $VPS2_REPO && git pull --ff-only" 2>&1 | tail -3
  
  # Sync shared packages dist
  log "Syncing shared packages..."
  rsync -az --delete "$REPO/packages/shared/dist/" "$VPS2:$VPS2_REPO/packages/shared/dist/"
  rsync -az --delete "$REPO/packages/shared-types/dist/" "$VPS2:$VPS2_REPO/packages/shared-types/dist/"
  
  if [[ "$MODE" == "--all" || "$MODE" == "--api-only" ]]; then
    log "Syncing API dist..."
    rsync -az --delete "$REPO/apps/api/dist/" "$VPS2:$VPS2_REPO/apps/api/dist/"
    ssh "$VPS2" "source ~/.nvm/nvm.sh && cd $VPS2_REPO && pm2 restart ai-drive-api ai-drive-worker --update-env 2>/dev/null || true"
  fi
  
  if [[ "$MODE" == "--all" || "$MODE" == "--web-only" ]]; then
    log "Syncing Web .next (identical hashes required)..."
    rsync -az --delete "$REPO/apps/web/.next/" "$VPS2:$VPS2_REPO/apps/web/.next/"
    ssh "$VPS2" "source ~/.nvm/nvm.sh && cd $VPS2_REPO && pm2 restart ai-drive-web --update-env 2>/dev/null || true"
  fi
  
  # Health check VPS2
  sleep 3
  VPS2_WEB=$(ssh "$VPS2" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null" || echo "000")
  log "VPS2 Web: $VPS2_WEB $([ "$VPS2_WEB" = "200" ] && echo '✅' || echo '❌')"
  log "VPS2 sync complete ✅"
else
  log "⚠️ VPS2 unreachable — skipping sync. Deploy only applied to local VPS."
  log "⚠️ Run manually on VPS2 or fix connectivity before next deploy."
fi

log "=== Deploy Complete ==="
pm2 status
