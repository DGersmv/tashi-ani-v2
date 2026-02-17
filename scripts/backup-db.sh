#!/bin/bash
# Скрипт автоматического бэкапа базы данных SQLite

DB_PATH="/var/lib/tashi-ani/db/tashi-ani.db"
BACKUP_DIR="/var/backups/tashi-ani"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db-${DATE}.sqlite"

# Проверяем что БД существует
if [ ! -f "${DB_PATH}" ]; then
    echo "ERROR: Database file not found: ${DB_PATH}"
    exit 1
fi

# Создаем директорию если не существует
mkdir -p "${BACKUP_DIR}"

# Делаем бэкап
echo "Creating backup: ${BACKUP_FILE}"
sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"

# Проверяем что бэкап создан
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup failed!"
    exit 1
fi

# Удаляем старые бэкапы (оставляем последние 30 дней)
echo "Cleaning old backups (older than 30 days)..."
find "${BACKUP_DIR}" -name "db-*.sqlite" -mtime +30 -delete

# Логируем
SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "$(date '+%Y-%m-%d %H:%M:%S'): Backup created: ${BACKUP_FILE} (${SIZE})" >> "${BACKUP_DIR}/backup.log"

echo "Backup completed successfully: ${BACKUP_FILE} (${SIZE})"



