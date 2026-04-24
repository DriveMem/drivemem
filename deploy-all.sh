#!/bin/bash
# Deploy AI Drive to BOTH VPS servers sequentially.
# Prevents the "forgot to deploy VPS2" regression (#95, #97).
#
# Usage: ./deploy-all.sh [--api-only|--web-only|--all]
# Runs deploy.sh on VPS1 (local), then on VPS2 (remote) via SSH.

set -euo pipefail

MODE="${1:---all}"
VPS2_HOST="ubuntu@43.165.168.72"
REPO="/home/ubuntu/repos/ai-drive"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== Deploy ALL servers (mode: $MODE) ==="

# ── VPS1 (local) ─────────────────────────────────────────────
log "▶ VPS1 (local) — starting deploy..."
bash "$REPO/deploy.sh" "$MODE"
log "✅ VPS1 deployed"

# ── VPS2 (remote: 43.165.168.72) ─────────────────────────────
log "▶ VPS2 ($VPS2_HOST) — starting deploy..."
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$VPS2_HOST" \
  "source ~/.nvm/nvm.sh && cd $REPO && git pull --ff-only && bash deploy.sh $MODE"

# Remote health check
VPS2_API=$(ssh "$VPS2_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/v1/health 2>/dev/null" || echo "000")
VPS2_WEB=$(ssh "$VPS2_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null" || echo "000")
log "VPS2 health — API: $VPS2_API $([ "$VPS2_API" = "200" ] && echo '✅' || echo '❌') | Web: $VPS2_WEB $([ "$VPS2_WEB" = "200" ] && echo '✅' || echo '❌')"

log "=== All servers deployed ==="
