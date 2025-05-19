#!/usr/bin/env bash
# deploy_crm005.sh
# Pull latest changes for CRM-005 and restart the PM2 service.

set -euo pipefail          # stop on first error, undefined var, or failed pipe
IFS=$'\n\t'                # safer word splitting

REPO_DIR="/home/administrator/CRM-005"
PM2_APP="crm-backend"

echo "==> Switching to $REPO_DIR"
cd "$REPO_DIR"

echo "==> Fetching remote refs…"
git fetch origin

echo "==> Rebasing local branch on latest origin/main…"
git pull origin main   # change ‘main’ if your branch differs

echo "==> Restarting $PM2_APP via PM2 (with refreshed env)…"
pm2 restart "$PM2_APP" --update-env

echo "==> Done."