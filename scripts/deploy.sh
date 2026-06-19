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
pnpm run build

echo "==> pm2 restart all"
pm2 restart all

echo "==> Deploy complete"
