#!/bin/bash
# Бэкап PostgreSQL в S3 (tashi-ani-base)
# Использует DATABASE_URL из .env.local (postgresql://user:pass@host:port/dbname)

set -e

PROJECT_DIR="/var/www/tashi-ani"
LOCAL_BACKUP_DIR="/var/backups/tashi-ani"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="db-${DATE}.sql"
LOCAL_BACKUP="${LOCAL_BACKUP_DIR}/${BACKUP_FILE}"

S3_ENDPOINT="https://s3.regru.cloud"
S3_BUCKET="tashi-ani-base"
S3_PREFIX="tashi-ani/backups/"
S3_REGION="ru-1"

if [ -f "${PROJECT_DIR}/.env.local" ]; then
    set -a
    source "${PROJECT_DIR}/.env.local"
    set +a
fi

if [ -z "${DATABASE_URL}" ]; then
    echo "ОШИБКА: DATABASE_URL не задан. Задайте в .env.local или в окружении."
    exit 1
fi

# Парсим postgresql://user:pass@host:port/dbname
# Простой вариант: передаём всё в pg_dump через URI
if [[ "${DATABASE_URL}" != postgresql://* ]]; then
    echo "ОШИБКА: DATABASE_URL не похож на PostgreSQL connection string."
    exit 1
fi

mkdir -p "${LOCAL_BACKUP_DIR}"
echo "=== Бэкап PostgreSQL в S3 ==="
echo "Дата: $(date '+%Y-%m-%d %H:%M:%S')"

# pg_dump в SQL (без владельца и ACL для переносимости)
echo "Создаю дамп БД..."
pg_dump "${DATABASE_URL}" --no-owner --no-acl -f "${LOCAL_BACKUP}"

if [ ! -f "${LOCAL_BACKUP}" ]; then
    echo "ОШИБКА: Дамп не создан!"
    exit 1
fi

SIZE=$(du -h "${LOCAL_BACKUP}" | cut -f1)
echo "Дамп создан: ${LOCAL_BACKUP} (${SIZE})"

# Загрузка в S3 (если есть ключи)
if [ -n "${AWS_ACCESS_KEY_ID}" ] && [ -n "${AWS_SECRET_ACCESS_KEY}" ]; then
    echo "Загружаю в S3: s3://${S3_BUCKET}/${S3_PREFIX}${BACKUP_FILE}"
    aws s3 cp "${LOCAL_BACKUP}" "s3://${S3_BUCKET}/${S3_PREFIX}${BACKUP_FILE}" \
        --endpoint-url "${S3_ENDPOINT}" \
        --region "${S3_REGION}" \
        --no-verify-ssl
    echo "✓ Успешно загружено в S3"
else
    echo "ПРЕДУПРЕЖДЕНИЕ: AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY не заданы. Только локальный бэкап."
fi

# Очистка старых локальных дампов (старше 7 дней)
find "${LOCAL_BACKUP_DIR}" -name "db-*.sql" -mtime +7 -delete 2>/dev/null || true

echo "=== Бэкап завершён ==="
