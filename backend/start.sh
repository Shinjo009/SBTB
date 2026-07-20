#!/bin/sh
set -e

echo "==> Running database migrations..."
alembic upgrade head

ADMIN_EMAIL="${BOOTSTRAP_ADMIN_EMAIL:-sbtb.vasudharanade@gmail.com}"
ADMIN_NAME="${BOOTSTRAP_ADMIN_NAME:-Store Admin}"
ADMIN_PASSWORD="${BOOTSTRAP_ADMIN_PASSWORD:-}"

if [ -n "$ADMIN_PASSWORD" ]; then
  echo "==> Ensuring admin user exists: $ADMIN_EMAIL"
  python -m app.cli.bootstrap create-admin \
    --email "$ADMIN_EMAIL" \
    --name "$ADMIN_NAME" \
    --password "$ADMIN_PASSWORD" || true
  python -m app.cli.bootstrap seed || true
else
  echo "==> Skipping admin bootstrap (set BOOTSTRAP_ADMIN_PASSWORD to enable)"
fi

echo "==> Starting API server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
