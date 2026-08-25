#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${1:-}"
SSH_USER="${SSH_USER:-root}"

if [[ -z "$SERVER_HOST" ]]; then
  echo "Usage: ./deploy/free-space-on-server.sh SERVER_IP"
  echo
  echo "Example:"
  echo "  ./deploy/free-space-on-server.sh 123.45.67.89"
  exit 1
fi

REMOTE="$SSH_USER@$SERVER_HOST"

ssh "$REMOTE" '
  set -e

  echo "Disk before cleanup:"
  df -h /
  echo

  echo "Cleaning apt cache..."
  apt-get clean || true
  apt-get autoclean || true
  apt-get autoremove -y || true
  rm -rf /var/cache/apt/archives/*.deb
  rm -rf /var/lib/apt/lists/*
  mkdir -p /var/lib/apt/lists/partial

  echo "Cleaning logs..."
  journalctl --vacuum-size=100M || true
  find /var/log -type f -name "*.gz" -delete || true
  find /var/log -type f -name "*.1" -delete || true
  find /var/log -type f -name "*.old" -delete || true
  find /var/log -type f -name "*.log.*" -delete || true
  find /var/log -type f -exec truncate -s 0 {} + || true

  echo "Cleaning crash dumps and core files..."
  rm -rf /var/crash/*
  find /root /home /tmp /var/tmp /opt -xdev -type f -name "core" -delete 2>/dev/null || true
  find /root /home /tmp /var/tmp /opt -xdev -type f -name "core.*" -delete 2>/dev/null || true

  echo "Cleaning temp folders..."
  rm -rf /tmp/*
  rm -rf /var/tmp/*
  rm -rf /root/.cache/*
  rm -rf /home/*/.cache/* 2>/dev/null || true
  rm -rf /var/cache/* 2>/dev/null || true
  mkdir -p /var/cache/apt/archives/partial

  if command -v docker >/dev/null 2>&1; then
    echo "Cleaning unused Docker data..."
    docker system prune -af --volumes || true
  fi

  if command -v npm >/dev/null 2>&1; then
    echo "Cleaning npm cache..."
    npm cache clean --force || true
  fi

  if command -v yarn >/dev/null 2>&1; then
    echo "Cleaning yarn cache..."
    yarn cache clean || true
  fi

  if command -v snap >/dev/null 2>&1; then
    echo "Cleaning old snap revisions..."
    snap list --all | awk "/disabled/{print \$1, \$3}" | while read -r snapname revision; do
      snap remove "$snapname" --revision="$revision" || true
    done
  fi

  echo
  echo "Disk after cleanup:"
  df -h /
  echo

  echo "Largest folders in /:"
  du -xhd1 / 2>/dev/null | sort -h | tail -n 12
'
