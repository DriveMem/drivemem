#!/bin/bash
# watch-build.sh — 监控 .next/BUILD_ID 变更，自动重启 pm2
# 解决子 agent 在生产 .next 目录上 build 但不 restart PM2 的问题

NEXT_DIR="$HOME/repos/ai-drive/apps/web/.next"
BUILD_ID_FILE="$NEXT_DIR/BUILD_ID"
PM2_APP="ai-drive-web"
LOG_FILE="$HOME/repos/ai-drive/logs/watch-build.log"

mkdir -p "$(dirname "$LOG_FILE")"

# 获取当前 BUILD_ID
get_build_id() {
  cat "$BUILD_ID_FILE" 2>/dev/null || echo "MISSING"
}

LAST_BUILD_ID=$(get_build_id)
echo "[$(date -Iseconds)] watch-build started. BUILD_ID=$LAST_BUILD_ID" >> "$LOG_FILE"

while true; do
  sleep 5
  CURRENT_BUILD_ID=$(get_build_id)
  
  if [ "$CURRENT_BUILD_ID" = "MISSING" ]; then
    # BUILD_ID 被删了 = build 进行中，等待
    continue
  fi
  
  if [ "$CURRENT_BUILD_ID" != "$LAST_BUILD_ID" ]; then
    echo "[$(date -Iseconds)] BUILD_ID changed: $LAST_BUILD_ID -> $CURRENT_BUILD_ID. Restarting $PM2_APP..." >> "$LOG_FILE"
    
    # 等 2 秒确保 build 完全写完
    sleep 2
    
    # 重启 PM2
    pm2 restart "$PM2_APP" >> "$LOG_FILE" 2>&1
    
    LAST_BUILD_ID="$CURRENT_BUILD_ID"
    echo "[$(date -Iseconds)] Restart complete." >> "$LOG_FILE"
  fi
done
