#!/bin/bash
# 收集各 agent 心跳信息写入 Cloudflare KV
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/.env" 2>/dev/null || true

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN not set}"
: "${CLOUDFLARE_ACCOUNT_ID:=41ccba169bc859c3f529c09f72882c5d}"
: "${KV_NAMESPACE_ID:=98ad0fb0de3049ec864eca589ef83e59}"

declare -A AGENT_PATHS=(
  [main]="$HOME/.openclaw/workspace"
  [ad-manager]="$HOME/.openclaw/workspaces/ad-manager"
  [ad-master]="$HOME/.openclaw/workspaces/ad-master"
  [ad-frontend]="$HOME/.openclaw/workspaces/ad-frontend"
  [ad-backend]="$HOME/.openclaw/workspaces/ad-backend"
  [ad-tester]="$HOME/.openclaw/workspaces/ad-tester"
  [ad-operator]="$HOME/.openclaw/workspaces/ad-operator"
)

NOW=$(date +%s)
THRESHOLD=300  # 5 minutes

write_kv() {
  local key="$1" value="$2"
  local url="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces/$KV_NAMESPACE_ID/values/$key"
  if ! curl -sf -X PUT "$url" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$value" >/dev/null; then
    echo "[sync-heartbeat] WARN: failed to write KV key=$key" >&2
    return 1
  fi
}

updated=0
errors=0

for agent_id in "${!AGENT_PATHS[@]}"; do
  ws="${AGENT_PATHS[$agent_id]}"
  active_dir="$ws/tasks/active"
  
  # Find latest modification time in active tasks
  last_active=0
  current_task=""
  if [ -d "$active_dir" ]; then
    while IFS= read -r f; do
      [ -f "$f" ] || continue
      mtime=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo 0)
      if [ "$mtime" -gt "$last_active" ]; then
        last_active=$mtime
        # Extract title from JSON
        current_task=$(grep -o '"title"[[:space:]]*:[[:space:]]*"[^"]*"' "$f" 2>/dev/null | head -1 | sed 's/.*: *"//;s/"$//' || true)
      fi
    done < <(ls -t "$active_dir"/*.json 2>/dev/null)
  fi

  # Determine status
  if [ "$last_active" -eq 0 ]; then
    status="idle"
    last_ts=$(date -Iseconds)
  else
    last_ts=$(date -d "@$last_active" -Iseconds 2>/dev/null || date -r "$last_active" -Iseconds 2>/dev/null || echo "unknown")
    elapsed=$((NOW - last_active))
    if [ "$elapsed" -le "$THRESHOLD" ]; then
      status="active"
    else
      status="idle"
    fi
  fi

  # Build JSON payload
  payload=$(printf '{"timestamp":"%s","lastActive":"%s","status":"%s","currentTask":"%s","agent":"%s"}' \
    "$(date -Iseconds)" "$last_ts" "$status" "$current_task" "$agent_id")

  if write_kv "heartbeat:$agent_id" "$payload"; then
    ((updated++))
    echo "[sync-heartbeat] $agent_id → $status (task: ${current_task:-none})"
  else
    ((errors++))
  fi
done

echo "[sync-heartbeat] $(date -Iseconds) updated=$updated errors=$errors"
