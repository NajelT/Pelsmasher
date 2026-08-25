#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/pelsmasher"
KEEP_DAYS=14
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

runuser -u postgres -- pg_dump pelsmasher | gzip > "$BACKUP_DIR/pelsmasher-$STAMP.sql.gz"

find "$BACKUP_DIR" -name 'pelsmasher-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
