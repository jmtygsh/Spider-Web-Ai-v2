#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Deploying from ${ROOT_DIR}"

echo "==> git pull"
git pull origin main

echo "==> pnpm install"
if command -v corepack >/dev/null 2>&1; then
  corepack enable
fi
pnpm install --frozen-lockfile

echo "==> pm2 stop all"
pm2 stop all

echo "==> pnpm run build"
export NEXT_TELEMETRY_DISABLED=1
pnpm run build

echo "==> pm2 start all"
pm2 start all

echo "==> Deploy complete"
