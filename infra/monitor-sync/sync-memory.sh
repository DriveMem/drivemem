#!/bin/bash
# 同步各 agent memory 到 R2（只处理今天和昨天的 .md 文件）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
set -a; source "$SCRIPT_DIR/.env" 2>/dev/null || true; set +a

CACHE_DIR="$SCRIPT_DIR/.sync-cache"
mkdir -p "$CACHE_DIR"
CACHE_FILE="$CACHE_DIR/memory-hashes.txt"
touch "$CACHE_FILE"

BUCKET="monitor-data"
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)

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
  local local_file="$1" r2_key="$2"
  if ! wrangler r2 object put --remote "$BUCKET/$r2_key" --file="$local_file" --content-type="text/markdown" 2>/dev/null; then
    echo "[sync-memory] WARN: failed to upload $r2_key" >&2
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
  mem_dir="$ws/memory"
  [ -d "$mem_dir" ] || continue

  for f in "$mem_dir"/${TODAY}*.md "$mem_dir"/${YESTERDAY}*.md; do
    [ -f "$f" ] || continue
    if hash_changed "$f"; then
      r2_key="memory/$agent_id/$(basename "$f")"
      if upload_to_r2 "$f" "$r2_key"; then
        update_hash "$f"
        ((uploaded++)) || true
      else
        ((errors++)) || true
      fi
    else
      ((skipped++)) || true
    fi
  done
done

echo "[sync-memory] $(date -Iseconds) uploaded=$uploaded skipped=$skipped errors=$errors"
