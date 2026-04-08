#!/bin/bash
# AI Drive Deploy Script
# Usage: ./scripts/deploy.sh [api|web|all]
#
# Safety: validates build output before restarting PM2 processes.
# Never use `pm2 restart all` — always restart specific processes.

set -e

REPO_DIR="/home/ubuntu/repos/ai-drive"
cd "$REPO_DIR"

# Pull latest
echo "📥 Pulling latest code..."
git pull origin main

TARGET=${1:-all}

if [ "$TARGET" = "api" ] || [ "$TARGET" = "all" ]; then
  echo "🔧 Building API..."
  cd "$REPO_DIR/apps/api"
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  npx tsc

  # Validate build output
  if [ ! -f "dist/index.js" ]; then
    echo "❌ API build failed — dist/index.js not found. Aborting restart."
    exit 1
  fi

  echo "🔄 Restarting API..."
  pm2 restart ai-drive-api --update-env
  echo "🔄 Restarting Worker..."
  pm2 restart ai-drive-worker --update-env
  echo "🔄 Restarting Insight Worker..."
  pm2 restart ai-drive-insight --update-env
fi

if [ "$TARGET" = "web" ] || [ "$TARGET" = "all" ]; then
  echo "🔧 Building Web..."
  cd "$REPO_DIR/apps/web"
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  pnpm build

  # Validate .next build output exists
  if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Web build failed — .next/BUILD_ID not found. Aborting restart."
    exit 1
  fi

  echo "✅ Web build verified (.next/BUILD_ID exists)"
  echo "🔄 Restarting Web..."
  pm2 restart ai-drive-web --update-env
fi

echo "💾 Saving PM2 config..."
pm2 save

echo "✅ Deploy complete!"
pm2 list
