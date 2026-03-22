#!/bin/bash
set -e

# Blue-Green Deployment Script for ordo-hq
# Usage: ./deploy.sh <image_tag> [--skip-migrations]
#
# Migrations:
#   - Additive migrations (new tables/columns) run automatically
#   - Destructive migrations (DROP/TRUNCATE) fail the deploy
#   - Use --skip-migrations after manually running destructive migrations

IMAGE_TAG=${1:-latest}
IMAGE="ghcr.io/snicolin/ordo-hq:${IMAGE_TAG}"
COMPOSE_FILE="/opt/ordo-hq/docker-compose.yml"
CADDYFILE="/opt/ordo-hq/Caddyfile"
HEALTH_TIMEOUT=30
HEALTH_INTERVAL=2
LOCK_FILE="/tmp/ordo-hq-deploy.lock"

echo "==> Deploying ordo-hq:${IMAGE_TAG}"

# ── Concurrent deploy protection ──
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "    Another deploy (PID $LOCK_PID) is running. Waiting up to 120s..."
        WAIT=0
        while [ -f "$LOCK_FILE" ] && kill -0 "$LOCK_PID" 2>/dev/null && [ $WAIT -lt 120 ]; do
            sleep 5
            WAIT=$((WAIT + 5))
        done
        if [ -f "$LOCK_FILE" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
            echo "==> ERROR: Previous deploy still running after 120s. Aborting."
            exit 1
        fi
    else
        echo "    Stale lock file found (PID $LOCK_PID not running). Removing."
        rm -f "$LOCK_FILE"
    fi
fi
echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# ── Determine current active slot from running containers ──
if docker ps --format '{{.Names}}' | grep -q "ordo-hq-blue"; then
    CURRENT="blue"
    TARGET="green"
elif docker ps --format '{{.Names}}' | grep -q "ordo-hq-green"; then
    CURRENT="green"
    TARGET="blue"
else
    CURRENT="none"
    TARGET="blue"
fi

echo "    Current: ${CURRENT}, Target: ${TARGET}"

# ── Pull image ──
echo "==> Pulling image ${IMAGE}..."
docker pull "${IMAGE}"

# ── Database migrations ──
# DATABASE_URL comes from docker-compose.yml environment (compose reads .env automatically)
if [[ "$*" == *"--skip-migrations"* ]]; then
    echo "==> Skipping migrations"
else
    echo "==> Checking database migrations..."

    export IMAGE_TAG
    MIGRATE_STATUS=$(docker compose -f ${COMPOSE_FILE} run --rm \
      ${TARGET} node node_modules/prisma/build/index.js migrate status 2>&1) || MIGRATE_EXIT=$?

    echo "$MIGRATE_STATUS"

    if [ "${MIGRATE_EXIT:-0}" -ne 0 ]; then
        if echo "$MIGRATE_STATUS" | grep -q "have not yet been applied"; then
            : # Pending migrations — handled below
        elif echo "$MIGRATE_STATUS" | grep -qE "Error code:|Error validating|error:"; then
            echo "==> ERROR: Migration status check failed. Aborting."
            exit 1
        else
            echo "==> ERROR: Unexpected migration exit code ${MIGRATE_EXIT}. Aborting."
            exit 1
        fi
    fi

    if echo "$MIGRATE_STATUS" | grep -q "have not yet been applied"; then
        PENDING_MIGRATIONS=$(echo "$MIGRATE_STATUS" | grep -B1000 "have not yet been applied" | grep -E "^[0-9]+" | awk '{print $1}' || true)

        if [ -n "$PENDING_MIGRATIONS" ]; then
            echo "    Pending migrations: $PENDING_MIGRATIONS"

            DESTRUCTIVE_PATTERNS="DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM"
            DESTRUCTIVE=""

            for migration in $PENDING_MIGRATIONS; do
                MIGRATION_PATH="/app/prisma/migrations/${migration}/migration.sql"
                FOUND=$(docker run --rm "${IMAGE}" \
                    grep -iE "${DESTRUCTIVE_PATTERNS}" "$MIGRATION_PATH" 2>/dev/null || true)
                if [ -n "$FOUND" ]; then
                    DESTRUCTIVE="$DESTRUCTIVE\n${migration}:\n$FOUND"
                fi
            done

            if [ -n "$DESTRUCTIVE" ]; then
                echo "==> ERROR: DESTRUCTIVE MIGRATION DETECTED!"
                echo ""
                echo -e "$DESTRUCTIVE"
                echo ""
                echo "    Deploy aborted. Run migrations manually, then retry with --skip-migrations."
                exit 1
            fi

            echo "==> Running additive migrations..."
            docker compose -f ${COMPOSE_FILE} run --rm \
              ${TARGET} node node_modules/prisma/build/index.js migrate deploy

            echo "    Migrations complete."
        fi
    else
        echo "    All migrations already applied."
    fi
fi

# ── Start target container ──
echo "==> Starting ${TARGET} container..."
export IMAGE_TAG
docker compose -f ${COMPOSE_FILE} up -d ${TARGET}

# ── Health check ──
echo "==> Waiting for health check..."
ELAPSED=0

while [ $ELAPSED -lt $HEALTH_TIMEOUT ]; do
    if docker exec ordo-hq-${TARGET} curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "    Health check passed."
        break
    fi
    sleep $HEALTH_INTERVAL
    ELAPSED=$((ELAPSED + HEALTH_INTERVAL))
    echo "    Waiting... (${ELAPSED}s/${HEALTH_TIMEOUT}s)"
done

if [ $ELAPSED -ge $HEALTH_TIMEOUT ]; then
    echo "==> ERROR: Health check failed. Rolling back..."
    docker compose -f ${COMPOSE_FILE} stop ${TARGET}
    exit 1
fi

# ── Switch Caddy upstream ──
echo "==> Switching traffic to ${TARGET}..."
# Write to the same inode (sed -i creates a new inode, breaking Docker bind mounts)
CADDY_CONTENT=$(sed "s/\(blue\|green\):3000/${TARGET}:3000/g" "$CADDYFILE")
printf '%s\n' "$CADDY_CONTENT" > "$CADDYFILE"
docker compose -f ${COMPOSE_FILE} exec caddy caddy reload --config /etc/caddy/Caddyfile

# Verify the switch
sleep 1
VERIFY=$(grep -oP '(blue|green):3000' "$CADDYFILE" | head -1)
if [ "$VERIFY" != "${TARGET}:3000" ]; then
    echo "==> ERROR: Caddy switch verification failed. Expected ${TARGET}:3000, got ${VERIFY}"
    exit 1
fi
echo "    Caddy verified: routing to ${TARGET}:3000"

# ── Stop old slot ──
if [ "$CURRENT" != "none" ]; then
    echo "==> Stopping ${CURRENT} container..."
    docker compose -f ${COMPOSE_FILE} stop ${CURRENT} 2>/dev/null || true
fi

# ── Cleanup old images (keep last 3) ──
echo "==> Cleaning up old images..."
docker images ghcr.io/snicolin/ordo-hq --format "{{.ID}} {{.CreatedAt}}" | \
    sort -k2 -r | tail -n +4 | awk '{print $1}' | \
    xargs -r docker rmi 2>/dev/null || true

echo "==> Deploy complete. Active: ${TARGET}"
echo "    https://hq.ordo.com"
