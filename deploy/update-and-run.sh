#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/chat-backend}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"

if [[ -z "${REPO_URL}" ]]; then
  echo "REPO_URL is required"
  exit 1
fi

mkdir -p "$(dirname "$APP_DIR")"

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ ! -f deploy/.env.prod ]]; then
  echo "Missing deploy/.env.prod on server"
  exit 1
fi

git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"

docker compose -f deploy/docker-compose.prod.yml up -d --build
docker image prune -f
