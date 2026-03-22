#!/bin/bash
set -e

COMPOSE="docker compose"
SERVICE="app"
HEALTH_URL="http://localhost:3000/api/health"
MAX_WAIT=60

echo "==> Pulling latest image..."
$COMPOSE pull $SERVICE

OLD_CONTAINERS=$($COMPOSE ps -q $SERVICE)

echo "==> Starting new container alongside old..."
$COMPOSE up -d --no-deps --scale $SERVICE=2 $SERVICE

echo "==> Waiting for new container to be healthy..."
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  HEALTHY_COUNT=$($COMPOSE ps $SERVICE --format json | grep -c '"healthy"' || true)
  if [ "$HEALTHY_COUNT" -ge 2 ]; then
    echo "    New container is healthy."
    break
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
  echo "    Waiting... (${ELAPSED}s / ${MAX_WAIT}s)"
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo "==> ERROR: New container did not become healthy within ${MAX_WAIT}s."
  echo "    Rolling back — removing new container..."
  NEW_CONTAINERS=$($COMPOSE ps -q $SERVICE)
  for cid in $NEW_CONTAINERS; do
    if ! echo "$OLD_CONTAINERS" | grep -q "$cid"; then
      docker stop "$cid" && docker rm "$cid"
    fi
  done
  $COMPOSE up -d --no-deps --scale $SERVICE=1 $SERVICE
  echo "==> Rollback complete."
  exit 1
fi

echo "==> Stopping old container..."
for cid in $OLD_CONTAINERS; do
  docker stop "$cid" && docker rm "$cid"
done

echo "==> Scaling back to 1 replica..."
$COMPOSE up -d --no-deps --scale $SERVICE=1 $SERVICE

echo "==> Deploy complete. Zero downtime."
