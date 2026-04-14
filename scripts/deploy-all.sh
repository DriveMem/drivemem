#!/bin/bash
# Deploy to both servers after git push
set -e

echo "=== Deploying to OLD server (local) ==="
cd ~/repos/ai-drive

# Build API
echo "Building API..."
cd apps/api && npx tsc 2>&1 | tail -1
cd ../..

# Build Web
echo "Building Web..."
cd apps/web && pnpm build 2>&1 | tail -2
cd ../..

# Restart
pm2 restart ai-drive-api ai-drive-web --update-env
echo "✅ Old server deployed"

echo ""
echo "=== Deploying to NEW server (43.165.168.72) ==="
ssh ubuntu@43.165.168.72 "source ~/.nvm/nvm.sh; \
  cd ~/repos/ai-drive && \
  git fetch origin && \
  git reset --hard origin/main && \
  cd apps/api && npx tsc 2>&1 | tail -1 && \
  cd ../web && rm -rf .next && pnpm build 2>&1 | tail -2 && \
  pm2 restart ai-drive-api ai-drive-web 2>&1 | grep -E 'online|ERROR'"
echo "✅ New server deployed"

echo ""
echo "=== Both servers deployed ==="
