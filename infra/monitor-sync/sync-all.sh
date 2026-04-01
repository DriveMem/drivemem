#!/bin/bash
# 统一入口：依次调用 sync-tasks, sync-memory, sync-heartbeat
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=== monitor-sync started at $(date -Iseconds) ==="

bash "$SCRIPT_DIR/sync-tasks.sh" || echo "[sync-all] WARN: sync-tasks failed"
bash "$SCRIPT_DIR/sync-memory.sh" || echo "[sync-all] WARN: sync-memory failed"
bash "$SCRIPT_DIR/sync-heartbeat.sh" || echo "[sync-all] WARN: sync-heartbeat failed"

echo "=== monitor-sync finished at $(date -Iseconds) ==="
