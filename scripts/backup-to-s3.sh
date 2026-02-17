#!/bin/bash
# Скрипт бэкапа SQLite базы данных в S3 (Reg.ru)
# Проект: tashi-ani

set -e

# === НАСТРОЙКИ ===
PROJECT_NAME="tashi-ani"
DB_PATH="/var/www/tashi-ani/prisma/dev.db"
LOCAL_BACKUP_DIR="/var/backups/tashi-ani"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="db-${DATE}.sqlite"
LOCAL_BACKUP="${LOCAL_BACKUP_DIR}/${BACKUP_FILE}"

# S3 настройки (Reg.ru)
S3_ENDPOINT="https://s3.regru.cloud"
S3_BUCKET="copybases"
S3_PREFIX="${PROJECT_NAME}/"  # Папка в бакете

# Загружаем переменные окружения для S3 ключей
if [ -f "/var/www/tashi-ani/.env.local" ]; then
    export $(grep -E '^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)' /var/www/tashi-ani/.env.local | xargs)
fi

# === ПРОВЕРКИ ===
echo "=== Бэкап базы данных ${PROJECT_NAME} ==="
echo "Дата: $(date '+%Y-%m-%d %H:%M:%S')"

# Проверяем что БД существует
if [ ! -f "${DB_PATH}" ]; then
    echo "ОШИБКА: База данных не найдена: ${DB_PATH}"
    exit 1
fi

# Проверяем S3 ключи
if [ -z "${AWS_ACCESS_KEY_ID}" ] || [ -z "${AWS_SECRET_ACCESS_KEY}" ]; then
    echo "ПРЕДУПРЕЖДЕНИЕ: S3 ключи не настроены. Бэкап будет только локальным."
    echo "Добавьте в .env.local:"
    echo "  AWS_ACCESS_KEY_ID=ваш_access_key"
    echo "  AWS_SECRET_ACCESS_KEY=ваш_secret_key"
    S3_ENABLED=false
else
    S3_ENABLED=true
fi

# === СОЗДАНИЕ ЛОКАЛЬНОГО БЭКАПА ===
mkdir -p "${LOCAL_BACKUP_DIR}"

echo "Создаю локальный бэкап: ${LOCAL_BACKUP}"
sqlite3 "${DB_PATH}" ".backup '${LOCAL_BACKUP}'"

if [ ! -f "${LOCAL_BACKUP}" ]; then
    echo "ОШИБКА: Бэкап не создан!"
    exit 1
fi

SIZE=$(du -h "${LOCAL_BACKUP}" | cut -f1)
echo "Локальный бэкап создан: ${SIZE}"

# === ЗАГРУЗКА В S3 ===
if [ "${S3_ENABLED}" = true ]; then
    echo "Загружаю в S3: ${S3_BUCKET}/${S3_PREFIX}${BACKUP_FILE}"
    
    # Проверяем наличие AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "AWS CLI не установлен. Устанавливаю..."
        # Для Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y awscli
        else
            echo "ОШИБКА: Не могу установить AWS CLI. Установите вручную."
            exit 1
        fi
    fi
    
    # Загружаем в S3
    aws s3 cp "${LOCAL_BACKUP}" "s3://${S3_BUCKET}/${S3_PREFIX}${BACKUP_FILE}" \
        --endpoint-url "${S3_ENDPOINT}" \
        --region ru-1
    
    if [ $? -eq 0 ]; then
        echo "✓ Успешно загружено в S3!"
        
        # Удаляем старые бэкапы в S3 (оставляем последние 30)
        echo "Проверяю старые бэкапы в S3..."
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
            --endpoint-url "${S3_ENDPOINT}" \
            --region ru-1 | sort -r | tail -n +31 | while read -r line; do
            file=$(echo "$line" | awk '{print $4}')
            if [ -n "$file" ]; then
                echo "Удаляю старый бэкап: $file"
                aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}${file}" \
                    --endpoint-url "${S3_ENDPOINT}" \
                    --region ru-1
            fi
        done
    else
        echo "ОШИБКА: Не удалось загрузить в S3!"
    fi
else
    echo "S3 отключен - только локальный бэкап"
fi

# === ОЧИСТКА ЛОКАЛЬНЫХ БЭКАПОВ ===
echo "Удаляю локальные бэкапы старше 7 дней..."
find "${LOCAL_BACKUP_DIR}" -name "db-*.sqlite" -mtime +7 -delete

# === ЛОГИРОВАНИЕ ===
LOG_FILE="${LOCAL_BACKUP_DIR}/backup.log"
echo "$(date '+%Y-%m-%d %H:%M:%S'): ${BACKUP_FILE} (${SIZE}) S3:${S3_ENABLED}" >> "${LOG_FILE}"

echo ""
echo "=== Бэкап завершён успешно ==="
echo "Локальный файл: ${LOCAL_BACKUP}"
if [ "${S3_ENABLED}" = true ]; then
    echo "S3: s3://${S3_BUCKET}/${S3_PREFIX}${BACKUP_FILE}"
fi
