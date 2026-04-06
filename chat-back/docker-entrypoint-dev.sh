#!/bin/sh
set -e
echo "[entrypoint] migrations..."
yarn migration:run
echo "[entrypoint] seed..."
yarn db:seed
echo "[entrypoint] nest start:dev"
exec yarn start:dev
