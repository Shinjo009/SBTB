#!/bin/sh
set -e

echo "==> Running database migrations..."
alembic upgrade head

if [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ]; then
  echo "==> Ensuring admin user exists..."
  python -m app.cli.bootstrap create-admin \
    --email "$BOOTSTRAP_ADMIN_EMAIL" \
    --name "${BOOTSTRAP_ADMIN_NAME:-Store Admin}" || true
  python -m app.cli.bootstrap seed || true
fi

echo "==> Starting API server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
