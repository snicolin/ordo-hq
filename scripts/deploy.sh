#!/bin/sh
set -e

echo "==> Running database migrations..."

# Check if _prisma_migrations table exists (indicates migrate has been used before)
if npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
  echo "    Database is up to date."
elif npx prisma migrate status 2>&1 | grep -q "Following migration"; then
  echo "    Applying pending migrations..."
  npx prisma migrate deploy
else
  echo "    Fresh database detected — applying all migrations..."
  npx prisma migrate deploy
fi

if [ "$SEED_ON_DEPLOY" = "true" ]; then
  echo "==> Running seed script..."
  node --require dotenv/config prisma/seed.ts || npx tsx prisma/seed.ts
fi

echo "==> Starting server on port ${PORT:-3000}..."
exec node server.js
