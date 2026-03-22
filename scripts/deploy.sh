#!/bin/sh
set -e

echo "==> Running database migrations..."
bunx prisma migrate deploy

if [ "$SEED_ON_DEPLOY" = "true" ]; then
  echo "==> Running seed script..."
  bun prisma/seed.ts
fi

echo "==> Init complete."
