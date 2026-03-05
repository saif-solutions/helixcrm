#!/bin/bash
# Load environment variables
if [ -f .env ]; then
  source .env
else
  echo "❌ .env file not found"
  exit 1
fi

# Use DB_PORT in pg_dump command

# Database Backup Script for HelixCRM
# Usage: ./backup-db.sh [environment]

set -e

ENV=${1:-production}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/d/backups/helixcrm"
DB_NAME="helixcrm"
DB_USER="postgres"
DB_HOST="localhost"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${ENV}_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "🔄 Starting backup for $ENV environment..."

# Run pg_dump
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE
echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "${DB_NAME}_${ENV}_*.sql.gz" -mtime +7 -delete
echo "🧹 Cleaned up backups older than 7 days"