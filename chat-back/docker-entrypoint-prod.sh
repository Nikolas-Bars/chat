#!/bin/sh
set -e

echo "[entrypoint-prod] migrations..."
yarn migration:run:prod

echo "[entrypoint-prod] start"
exec node dist/main
