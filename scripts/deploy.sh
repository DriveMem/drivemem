#!/bin/bash
# AI Drive Deploy Script
# Usage: ./scripts/deploy.sh [api|web|all]

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
  echo "🔄 Restarting API + Worker + Insight..."
  pm2 restart ai-drive-api ai-drive-worker ai-drive-insight
fi

if [ "$TARGET" = "web" ] || [ "$TARGET" = "all" ]; then
  echo "🔧 Building Web..."
  cd "$REPO_DIR/apps/web"
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  pnpm build
  echo "🔄 Restarting Web..."
  pm2 restart ai-drive-web
fi

echo "💾 Saving PM2 config..."
pm2 save

echo "✅ Deploy complete!"
pm2 list
