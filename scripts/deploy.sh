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

echo "==> pnpm run build"
export LOW_MEMORY_BUILD=1
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
pnpm run build

echo "==> pm2 restart all"
pm2 restart all

echo "==> Deploy complete"
