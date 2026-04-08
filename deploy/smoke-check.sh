#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/chat-backend}"
API_URL="${API_URL:-https://api.chat-q.ru}"
FRONTEND_URL="${FRONTEND_URL:-https://app.chat-q.ru}"

cd "$APP_DIR"

echo "== docker compose ps =="
docker compose -f deploy/docker-compose.prod.yml ps

echo
echo "== backend root =="
curl -fsS "$API_URL/" | sed -n '1,3p'

echo
echo "== backend headers =="
curl -I "$API_URL/"

echo
echo "== frontend reachable =="
curl -I "$FRONTEND_URL"

echo
echo "Smoke check passed"
