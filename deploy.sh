#!/bin/bash
# DriveMem Deploy Script
# Usage: ./deploy.sh [--api-only|--web-only|--all]
#
# Deploys to production VPS (43.165.168.72) via SSH.
# Run from any machine with SSH access.

set -euo pipefail

VPS="ubuntu@43.165.168.72"
VPS_REPO="~/repos/ai-drive"
MODE="${1:---all}"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== Deploy Start (mode: $MODE) ==="

# Pull latest code on VPS
log "Pulling on VPS..."
ssh "$VPS" "source ~/.nvm/nvm.sh && cd $VPS_REPO && git pull --ff-only" 2>&1 | tail -3

# Always build shared packages first
log "Building shared packages..."
ssh "$VPS" "source ~/.nvm/nvm.sh && cd $VPS_REPO && cd packages/shared-types && npx tsc && cd ../shared && npx tsc" 2>&1 | tail -3
log "Shared packages built ✅"

if [[ "$MODE" == "--all" || "$MODE" == "--api-only" ]]; then
  log "Building API..."
  ssh "$VPS" "source ~/.nvm/nvm.sh && cd $VPS_REPO/apps/api && npx tsc" 2>&1 | tail -3
  log "Restarting API + Worker..."
  ssh "$VPS" "source ~/.nvm/nvm.sh && cd $VPS_REPO && pm2 restart ai-drive-api ai-drive-worker --update-env 2>/dev/null || true"
fi

if [[ "$MODE" == "--all" || "$MODE" == "--web-only" ]]; then
  log "Building Web..."
  ssh "$VPS" "source ~/.nvm/nvm.sh && cd $VPS_REPO/apps/web && npx next build" 2>&1 | tail -5
  log "Restarting Web..."
  ssh "$VPS" "source ~/.nvm/nvm.sh && cd $VPS_REPO && pm2 restart ai-drive-web --update-env 2>/dev/null || true"
fi

# Health check
sleep 4
log "Health check..."
VPS_WEB=$(ssh "$VPS" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null" || echo "000")
log "Web: $VPS_WEB $([ "$VPS_WEB" = "200" ] && echo '✅' || echo '❌')"

log "=== Deploy Complete ==="
ssh "$VPS" "source ~/.nvm/nvm.sh && pm2 status" 2>&1
