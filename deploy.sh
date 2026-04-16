#!/bin/bash
# DriveMem Deploy Script — pull, build, restart
# Usage: ./deploy.sh [--api-only|--web-only|--all]

set -euo pipefail

REPO="/home/ubuntu/repos/ai-drive"
cd "$REPO"

MODE="${1:---all}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] === DriveMem Deploy Start (mode: $MODE) ==="

# Pull latest
echo "[$TIMESTAMP] Pulling latest..."
git pull --ff-only || { echo "ERROR: git pull failed. Resolve conflicts first."; exit 1; }

COMMIT=$(git log --oneline -1)
echo "[$TIMESTAMP] Latest commit: $COMMIT"

# Build API
if [[ "$MODE" == "--all" || "$MODE" == "--api-only" ]]; then
  echo "[$TIMESTAMP] Building API (TypeScript)..."
  npm run build --workspace=apps/api
  echo "[$TIMESTAMP] Restarting API + Worker..."
  pm2 restart ai-drive-api ai-drive-worker
fi

# Build Web
if [[ "$MODE" == "--all" || "$MODE" == "--web-only" ]]; then
  echo "[$TIMESTAMP] Building Web (Next.js)..."
  npm run build --workspace=apps/web
  echo "[$TIMESTAMP] Restarting Web..."
  pm2 restart ai-drive-web
fi

# Health check
sleep 3
echo "[$TIMESTAMP] Health check..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null || echo "000")
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")

echo "[$TIMESTAMP] API: HTTP $API_STATUS | Web: HTTP $WEB_STATUS"

if [[ "$API_STATUS" != "200" && "$MODE" != "--web-only" ]]; then
  echo "WARNING: API health check failed (HTTP $API_STATUS)"
fi

echo "[$TIMESTAMP] === Deploy Complete ==="
pm2 status
