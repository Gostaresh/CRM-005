#!/usr/bin/env bash
# ------------------------------------------------------------------
#   Build Vue ➜ sync static files ➜ reload PM2 backend
# ------------------------------------------------------------------
ROOT_DIR="/home/administrator/CRM-005"
FRONT_DIR="$ROOT_DIR/frontend"
BACK_DIR="$ROOT_DIR/backend"
WEB_ROOT="/var/www/crm-005"
PM2_APP="crm-backend"

set -euo pipefail

echo "🚀  Deploy started  $(date '+%F %T')"
cd "$ROOT_DIR"

install_deps () {
  local dir="$1"
  echo "📦  Installing deps in ${dir##*/}…"

  # Prefer reproducible installs; gracefully fall back if lock‑file is out of sync
  if [[ -f "$dir/package-lock.json" ]]; then
    if ! npm ci --omit=optional --prefix "$dir"; then
      echo "⚠️  npm ci failed (lock‑file out of sync). Falling back to npm install…"
      npm install --omit=optional --prefix "$dir"
    fi
  else
    npm install --omit=optional --prefix "$dir"
  fi
}

# 1 ───── dependencies
install_deps "$BACK_DIR"
install_deps "$FRONT_DIR"

# 2 ───── build front-end
echo "🏗   Building Vue…"
npm run build --prefix "$FRONT_DIR"

# 3 ───── sync static files
echo "🚚  Syncing dist/ → $WEB_ROOT"
sudo rsync -a --delete "$FRONT_DIR/dist/" "$WEB_ROOT/"

# 4 ───── reload nginx
echo "🔄  Reloading Nginx"
sudo nginx -t && sudo systemctl reload nginx

# 5 ───── reload / start PM2 backend
echo "♻️   Reloading PM2 app: $PM2_APP"
if pm2 list | grep -q "$PM2_APP"; then
  pm2 reload "$PM2_APP"
else
  pm2 start "$BACK_DIR/src/index.js" --name "$PM2_APP"
fi
pm2 save

echo "✅  Deploy finished $(date '+%F %T')"