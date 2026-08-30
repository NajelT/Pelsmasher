#!/usr/bin/env bash
set -euo pipefail

# Routine deploy. Builds frontend + backend and ships them to a server that
# has already been provisioned with bootstrap-server.sh. Runs entirely as the
# unprivileged 'deploy' user (no root/SSH access needed).
#
# Usage:
#   ./deploy/deploy.sh SERVER_IP
#
# Also used by .github/workflows/deploy.yml (same script, run on the CI runner).

SERVER_HOST="${1:-}"
SSH_USER="${SSH_USER:-deploy}"

if [[ -z "$SERVER_HOST" ]]; then
  echo "Usage: ./deploy/deploy.sh SERVER_IP"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

for command_name in npm ssh scp rsync; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing command: $command_name"
    exit 1
  fi
done

echo "1/6 Installing frontend deps..."
npm ci

echo "2/6 Checking + testing frontend (aborts deploy on failure)..."
npm run typecheck
npm test

echo "3/6 Building frontend..."
VITE_API_BASE_URL=/api npm run build

echo "4/6 Testing + building backend (aborts deploy on test failure)..."
(cd backend && ./gradlew clean test bootJar)
JAR_FILE="$(find backend/build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*plain*' | head -n 1)"

if [[ -z "$JAR_FILE" ]]; then
  echo "Backend jar was not found in backend/build/libs"
  exit 1
fi

REMOTE="$SSH_USER@$SERVER_HOST"
SSH_CONTROL_PATH="/tmp/pelsmasher-deploy-$$.sock"
SSH_OPTIONS=(
  -o ControlMaster=auto
  -o ControlPath="$SSH_CONTROL_PATH"
  -o ControlPersist=10m
)
RSYNC_SSH_COMMAND="ssh -o ControlMaster=auto -o ControlPath=$SSH_CONTROL_PATH -o ControlPersist=10m"

echo "5/6 Uploading frontend and backend..."
rsync -e "$RSYNC_SSH_COMMAND" -az --delete dist/ "$REMOTE:/var/www/pelsmasher/"
scp "${SSH_OPTIONS[@]}" "$JAR_FILE" "$REMOTE:/opt/pelsmasher/backend/pelsmasher-backend.jar"

echo "6/6 Restarting services and checking health..."
ssh "${SSH_OPTIONS[@]}" "$REMOTE" '
  set -e
  sudo systemctl restart pelsmasher-backend
  sudo systemctl reload nginx

  for attempt in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:8080/api/health >/dev/null; then
      exit 0
    fi
    sleep 1
  done

  echo "Backend did not become healthy in 30 seconds"
  sudo systemctl status pelsmasher-backend
  exit 1
'

echo
echo "Done. Open this in your browser:"
echo "  http://$SERVER_HOST"
