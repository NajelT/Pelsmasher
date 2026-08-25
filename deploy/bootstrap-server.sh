#!/usr/bin/env bash
set -euo pipefail

# One-time (idempotent) server setup. Run once as root when provisioning a new
# server, or again later if you need to re-apply permissions/sudoers.
#
# Usage:
#   ./deploy/bootstrap-server.sh SERVER_IP path/to/deploy_key.pub
#
# After this runs, routine deploys use deploy.sh as the unprivileged
# 'deploy' user — root/SSH access is no longer needed for day-to-day deploys.

SERVER_HOST="${1:-}"
DEPLOY_PUBKEY_FILE="${2:-}"
SSH_USER="${SSH_USER:-root}"

if [[ -z "$SERVER_HOST" || -z "$DEPLOY_PUBKEY_FILE" ]]; then
  echo "Usage: ./deploy/bootstrap-server.sh SERVER_IP path/to/deploy_key.pub"
  exit 1
fi

if [[ ! -f "$DEPLOY_PUBKEY_FILE" ]]; then
  echo "Public key file not found: $DEPLOY_PUBKEY_FILE"
  exit 1
fi

DEPLOY_PUBKEY="$(cat "$DEPLOY_PUBKEY_FILE")"
REMOTE="$SSH_USER@$SERVER_HOST"

echo "1/2 Installing packages and creating system users..."
ssh "$REMOTE" '
  set -e
  apt-get clean
  rm -rf /var/lib/apt/lists/*
  mkdir -p /var/lib/apt/lists/partial
  apt-get update
  apt-get install -y curl nginx openjdk-21-jre-headless openssl postgresql rsync

  if ! id pelsmasher >/dev/null 2>&1; then
    useradd --system --home /opt/pelsmasher --shell /usr/sbin/nologin pelsmasher
  fi
  mkdir -p /opt/pelsmasher/backend /var/www/pelsmasher
  install -d -m 750 -o root -g pelsmasher /etc/pelsmasher

  systemctl enable --now postgresql

  if [ -f /etc/pelsmasher/backend.env ]; then
    set -a
    . /etc/pelsmasher/backend.env
    set +a
  else
    SPRING_DATASOURCE_PASSWORD="$(openssl rand -hex 24)"
    cat > /etc/pelsmasher/backend.env <<EOF
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/pelsmasher
SPRING_DATASOURCE_USERNAME=pelsmasher
SPRING_DATASOURCE_PASSWORD=$SPRING_DATASOURCE_PASSWORD
EOF
    chown root:pelsmasher /etc/pelsmasher/backend.env
    chmod 640 /etc/pelsmasher/backend.env
  fi

  runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '"'"'pelsmasher'"'"'" | grep -q 1 || runuser -u postgres -- createuser pelsmasher
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 --set=db_user="pelsmasher" --set=db_password="$SPRING_DATASOURCE_PASSWORD" <<'"'"'SQL'"'"'
ALTER USER :"db_user" WITH PASSWORD :'"'"'db_password'"'"';
SQL
  runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname = '"'"'pelsmasher'"'"'" | grep -q 1 || runuser -u postgres -- createdb -O pelsmasher pelsmasher
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 --set=db_name="pelsmasher" --set=db_user="pelsmasher" <<'"'"'SQL'"'"'
ALTER DATABASE :"db_name" OWNER TO :"db_user";
GRANT ALL PRIVILEGES ON DATABASE :"db_name" TO :"db_user";
SQL
  runuser -u postgres -- psql -d pelsmasher -v ON_ERROR_STOP=1 --set=db_user="pelsmasher" <<'"'"'SQL'"'"'
GRANT ALL ON SCHEMA public TO :"db_user";
SQL

  if ! id deploy >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash deploy
  fi
  mkdir -p /home/deploy/.ssh
  chown deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
'

echo "2/2 Installing deploy key and permissions..."
ssh "$REMOTE" "
  set -e
  echo '$DEPLOY_PUBKEY' > /home/deploy/.ssh/authorized_keys
  chown deploy:deploy /home/deploy/.ssh/authorized_keys
  chmod 600 /home/deploy/.ssh/authorized_keys

  chown -R deploy:pelsmasher /opt/pelsmasher/backend
  chmod -R u+rwX,g+rX /opt/pelsmasher/backend

  chown -R deploy:www-data /var/www/pelsmasher
  chmod -R u+rwX,g+rX /var/www/pelsmasher

  cat > /etc/sudoers.d/deploy-pelsmasher <<'SUDOERS'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart pelsmasher-backend, /usr/bin/systemctl reload nginx, /usr/bin/systemctl status pelsmasher-backend
SUDOERS
  chmod 440 /etc/sudoers.d/deploy-pelsmasher
  visudo -c
"

echo "3/3 Installing daily Postgres backup timer..."
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scp "$ROOT_DIR/deploy/pelsmasher-backup.sh" "$REMOTE:/usr/local/bin/pelsmasher-backup.sh"
scp "$ROOT_DIR/deploy/pelsmasher-backup.service" "$REMOTE:/etc/systemd/system/pelsmasher-backup.service"
scp "$ROOT_DIR/deploy/pelsmasher-backup.timer" "$REMOTE:/etc/systemd/system/pelsmasher-backup.timer"
ssh "$REMOTE" '
  set -e
  chmod +x /usr/local/bin/pelsmasher-backup.sh
  systemctl daemon-reload
  systemctl enable --now pelsmasher-backup.timer
'

echo
echo "Done. Upload deploy/pelsmasher-backend.service and deploy/nginx-pelsmasher.conf once via root,"
echo "then use deploy.sh as the 'deploy' user for routine deploys:"
echo "  scp deploy/pelsmasher-backend.service $REMOTE:/etc/systemd/system/pelsmasher-backend.service"
echo "  scp deploy/nginx-pelsmasher.conf $REMOTE:/etc/nginx/sites-available/pelsmasher"
echo "  ssh $REMOTE 'ln -sf /etc/nginx/sites-available/pelsmasher /etc/nginx/sites-enabled/pelsmasher && rm -f /etc/nginx/sites-enabled/default && systemctl daemon-reload && systemctl enable pelsmasher-backend && nginx -t && systemctl reload nginx'"
