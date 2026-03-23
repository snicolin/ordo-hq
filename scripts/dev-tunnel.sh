#!/bin/bash
# Dev tunnel script - starts Next.js with ngrok tunnel
# Kills conflicting ports and forces takeover of existing ngrok endpoints
#
# Usage:
#   ./dev-tunnel.sh          - Normal start with ngrok OAuth protection
#   ./dev-tunnel.sh --open   - Start without OAuth (public access)
#   ./dev-tunnel.sh --clean  - Clean install (deletes node_modules)

set -a
source .env.local 2>/dev/null || source .env 2>/dev/null || true
set +a

NGROK_DOMAIN="${NGROK_DOMAIN:-hunter2.ngrok.dev}"

CLEAN_INSTALL=false
OPEN_MODE=false
for arg in "$@"; do
  case $arg in
    --clean)
      CLEAN_INSTALL=true
      ;;
    --open)
      OPEN_MODE=true
      ;;
  esac
done

if [ "$CLEAN_INSTALL" = true ]; then
  echo "🧹 Clean install: removing node_modules..."
  rm -rf node_modules
fi
echo "Installing dependencies..."
bun install

echo "Running pending database migrations..."
bunx prisma migrate deploy

echo "Generating Prisma client..."
bunx prisma generate

echo "Cleaning .next cache..."
rm -rf .next

echo "Killing existing ngrok processes..."
pkill -9 ngrok 2>/dev/null || true

echo "Killing existing Next.js processes..."
pkill -9 -f "next dev" 2>/dev/null || true

echo "Killing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Force-stop any existing ngrok endpoints (allows device switching)
if [ -n "$NGROK_API_KEY" ]; then
  echo "Checking for existing ngrok endpoints..."
  endpoints=$(curl -s -H "Authorization: Bearer $NGROK_API_KEY" -H "Ngrok-Version: 2" https://api.ngrok.com/endpoints)
  if [ -n "$endpoints" ]; then
    session_ids=$(echo "$endpoints" | grep -o '"tunnel_session":{"id":"ts_[^"]*"' | grep -o 'ts_[^"]*')
    for id in $session_ids; do
      echo "Stopping tunnel session: $id"
      curl -s -X POST -H "Authorization: Bearer $NGROK_API_KEY" -H "Ngrok-Version: 2" -H "Content-Type: application/json" -d '{}' "https://api.ngrok.com/tunnel_sessions/$id/stop" >/dev/null
    done
    sleep 2
  fi
fi

echo "Starting Next.js dev server..."
BROWSER=none AUTH_URL="https://$NGROK_DOMAIN" bun next dev &
NEXT_PID=$!

echo "Waiting for Next.js to start..."
sleep 3

echo ""
echo "🚀 Tunnel ready at: https://$NGROK_DOMAIN"
echo ""

echo "Starting ngrok tunnel to $NGROK_DOMAIN..."
if [ "$OPEN_MODE" = true ]; then
  ngrok http 3000 --domain="$NGROK_DOMAIN"
else
  if [ -n "$NGROK_OAUTH_EMAIL" ]; then
    ngrok http 3000 --domain="$NGROK_DOMAIN" --oauth=google --oauth-allow-email="$NGROK_OAUTH_EMAIL"
  else
    ngrok http 3000 --domain="$NGROK_DOMAIN"
  fi
fi
