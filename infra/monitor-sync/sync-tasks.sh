#!/bin/bash
# 同步各 agent tasks 到 R2
# queue/active/blocked: 全量同步（有变更才上传）
# done: 只同步最新 20 个文件
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/.env" 2>/dev/null || true

CACHE_DIR="$SCRIPT_DIR/.sync-cache"
mkdir -p "$CACHE_DIR"
CACHE_FILE="$CACHE_DIR/tasks-hashes.txt"
touch "$CACHE_FILE"

BUCKET="monitor-data"

declare -A AGENT_PATHS=(
  [main]="$HOME/.openclaw/workspace"
  [ad-manager]="$HOME/.openclaw/workspaces/ad-manager"
  [ad-master]="$HOME/.openclaw/workspaces/ad-master"
  [ad-frontend]="$HOME/.openclaw/workspaces/ad-frontend"
  [ad-backend]="$HOME/.openclaw/workspaces/ad-backend"
  [ad-tester]="$HOME/.openclaw/workspaces/ad-tester"
  [ad-operator]="$HOME/.openclaw/workspaces/ad-operator"
)

upload_to_r2() {
  local local_file="$1" r2_key="$2" ct="${3:-application/json}"
  if ! wrangler r2 object put "$BUCKET/$r2_key" --file="$local_file" --content-type="$ct" 2>/dev/null; then
    echo "[sync-tasks] WARN: failed to upload $r2_key" >&2
    return 1
  fi
}

file_hash() { md5sum "$1" 2>/dev/null | awk '{print $1}'; }

hash_changed() {
  local file="$1" current_hash
  current_hash=$(file_hash "$file")
  ! grep -qF "${file}=${current_hash}" "$CACHE_FILE" 2>/dev/null
}

update_hash() {
  local file="$1" current_hash
  current_hash=$(file_hash "$file")
  grep -v "^${file}=" "$CACHE_FILE" > "$CACHE_FILE.tmp" 2>/dev/null || true
  echo "${file}=${current_hash}" >> "$CACHE_FILE.tmp"
  mv "$CACHE_FILE.tmp" "$CACHE_FILE"
}

uploaded=0
skipped=0
errors=0

for agent_id in "${!AGENT_PATHS[@]}"; do
  ws="${AGENT_PATHS[$agent_id]}"
  tasks_dir="$ws/tasks"
  [ -d "$tasks_dir" ] || continue

  for status in queue active blocked; do
    status_dir="$tasks_dir/$status"
    [ -d "$status_dir" ] || continue
    for f in "$status_dir"/*.json; do
      [ -f "$f" ] || continue
      if hash_changed "$f"; then
        r2_key="agents/$agent_id/tasks/$status/$(basename "$f")"
        if upload_to_r2 "$f" "$r2_key"; then
          update_hash "$f"
          ((uploaded++))
        else
          ((errors++))
        fi
      else
        ((skipped++))
      fi
    done
  done

  # Done: 只上传最新 20 个
  done_dir="$tasks_dir/done"
  if [ -d "$done_dir" ]; then
    while IFS= read -r f; do
      [ -f "$f" ] || continue
      if hash_changed "$f"; then
        r2_key="agents/$agent_id/tasks/done/$(basename "$f")"
        if upload_to_r2 "$f" "$r2_key"; then
          update_hash "$f"
          ((uploaded++)) || true
        else
          ((errors++)) || true
        fi
      else
        ((skipped++)) || true
      fi
    done < <(ls -t "$done_dir"/*.json 2>/dev/null | head -20)
  fi
done

echo "[sync-tasks] $(date -Iseconds) uploaded=$uploaded skipped=$skipped errors=$errors"
