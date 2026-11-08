#!/bin/bash
# ==============================================================================
# EPSS EDRMS Automated Database Backup Script
# Ethiopian Pharmaceutical Supply Service (EPSS) - IT Infrastructure Division
# ==============================================================================

set -euo pipefail

BACKUP_ROOT="/app/data/backups"
STORE_FILE="/app/data/edrms_store.json"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_ROOT}/epss_edrms_backup_${TIMESTAMP}.json"
TAR_FILE="${BACKUP_ROOT}/epss_edrms_backup_${TIMESTAMP}.tar.gz"

echo "[$(date -u)] Starting EPSS EDRMS backup process..."

mkdir -p "${BACKUP_ROOT}"

if [ ! -f "${STORE_FILE}" ]; then
    echo "[ERROR] Store file ${STORE_FILE} does not exist!"
    exit 1
fi

# Copy JSON store and calculate SHA-256
cp "${STORE_FILE}" "${BACKUP_FILE}"
SHA256=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')

# Compress archive
tar -czf "${TAR_FILE}" -C "${BACKUP_ROOT}" "epss_edrms_backup_${TIMESTAMP}.json"

echo "[$(date -u)] Backup created: ${TAR_FILE}"
echo "[$(date -u)] SHA-256 Checksum: ${SHA256}"

# Retention: Delete backup archives older than 30 days
find "${BACKUP_ROOT}" -type f -name "epss_edrms_backup_*.tar.gz" -mtime +30 -exec rm -f {} \;
echo "[$(date -u)] Automated 30-day retention cleanup complete."
