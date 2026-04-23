#!/bin/bash
# Zero-Downtime Deploy to both servers after git push
# Key: BUILD FIRST, RESTART AFTER. Never rm -rf before build.
set -e

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== Deploying to MAIN server (local) ==="
cd ~/repos/ai-drive
git pull --ff-only

# Build API (MUST clean dist — incremental tsc leaves stale files)
log "Building shared package..."
cd packages/shared && npx tsc && cd ../..

log "Building API..."
cd apps/api && rm -rf dist tsconfig.tsbuildinfo && npx tsc && cd ../..

# Sync DB schema (auto-migrate new columns/tables)
log "Syncing DB schema..."
PGPASSWORD=aidrive_dev bash scripts/db-sync.sh 2>&1 | tail -1

# Build Web (next build overwrites .next in-place, no need to rm)
log "Building Web..."
cd apps/web && npx next build && cd ../..

# Restart AFTER build completes
log "Restarting services..."
pm2 restart ai-drive-api ai-drive-worker ai-drive-web --update-env

# Health check
sleep 4
API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null || echo "000")
WEB=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
log "Main server — API: $API | Web: $WEB"
[ "$API" != "200" ] && log "⚠️  API health check failed!"
[ "$WEB" != "200" ] && log "⚠️  Web health check failed!"
# Auto BM25 backfill check
MISSING=$(curl -s -X POST "http://localhost:6333/collections/document_chunks/points/scroll" \
  -H "Content-Type: application/json" -d '{"limit":1,"with_vector":["bm25"]}' 2>/dev/null | \
  node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const p=d.result?.points?.[0];console.log(p&&(!p.vector?.bm25||p.vector.bm25.indices?.length===0)?'yes':'no')}catch{console.log('skip')}" 2>/dev/null || echo "skip")
if [ "$MISSING" = "yes" ]; then
  log "BM25 sparse vectors missing — running backfill..."
  node scripts/backfill-bm25.ts 2>&1 | tail -3
fi
log "✅ Main server deployed"

echo ""
log "=== Deploying to NEW server (43.165.168.72) ==="
ssh ubuntu@43.165.168.72 "source ~/.nvm/nvm.sh; \
  cd ~/repos/ai-drive && \
  git fetch origin && \
  git reset --hard origin/main && \
  cd apps/api && rm -rf dist tsconfig.tsbuildinfo && npx tsc 2>&1 | tail -1 && \
  cd ../.. && DB_CMD='docker exec -i aidrive-postgres psql -U aidrive -d aidrive' bash scripts/db-sync.sh 2>&1 | tail -1 && \
  cd ../web && npx next build 2>&1 | tail -2 && \
  pm2 restart ai-drive-api ai-drive-worker ai-drive-web --update-env 2>&1 | grep -E 'online|ERROR' && \
  sleep 3 && \
  echo \"Health: API=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/v1/health 2>/dev/null) Web=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null)\ && \
  node scripts/backfill-bm25.ts 2>&1 | tail -2"
log "✅ New server deployed"

echo ""
log "=== Both servers deployed ==="
