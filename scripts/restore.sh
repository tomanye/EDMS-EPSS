#!/bin/bash
# ==============================================================================
# EPSS EDRMS Database Snapshot Restoration Script
# Ethiopian Pharmaceutical Supply Service (EPSS) - IT Infrastructure Division
# ==============================================================================

set -euo pipefail

STORE_FILE="/app/data/edrms_store.json"

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup_file.json>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] Backup target ${BACKUP_FILE} not found."
    exit 1
fi

echo "=========================================================="
echo "EPSS EDRMS SYSTEM RESTORATION PROCEDURE"
echo "Target Backup: ${BACKUP_FILE}"
echo "=========================================================="
read -p "WARNING: This will overwrite active database records. Proceed? (y/N): " -r CONFIRM

if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    # Create safety fallback snapshot of current state
    if [ -f "${STORE_FILE}" ]; then
        FALLBACK="/app/data/edrms_pre_restore_fallback_$(date +%s).json"
        cp "${STORE_FILE}" "${FALLBACK}"
        echo "[INFO] Fallback copy preserved at: ${FALLBACK}"
    fi

    cp "${BACKUP_FILE}" "${STORE_FILE}"
    echo "[SUCCESS] Database restored successfully. Please restart the EPSS service or container."
else
    echo "[CANCELLED] Restoration aborted by operator."
fi
