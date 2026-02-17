#!/bin/bash
# Восстановление проекта tashi-ani из S3 бэкапов

set -e

# === НАСТРОЙКИ ===
PROJECT_NAME="tashi-ani"
PROJECT_DIR="/var/www/tashi-ani"
DB_PATH="${PROJECT_DIR}/prisma/dev.db"
UPLOADS_DIR="${PROJECT_DIR}/public/uploads"
LOCAL_BACKUP_DIR="/var/backups/tashi-ani"

# S3 настройки
S3_ENDPOINT="https://s3.regru.cloud"
S3_BUCKET="tashi-ani-base"
S3_PREFIX="tashi-ani/backups/"
S3_REGION="ru-1"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# === ЗАГРУЗКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ===
if [ -f "${PROJECT_DIR}/.env.local" ]; then
    export $(grep -E '^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)' "${PROJECT_DIR}/.env.local" | xargs)
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║       ВОССТАНОВЛЕНИЕ ПРОЕКТА ${PROJECT_NAME}                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# === СПИСОК ДОСТУПНЫХ БЭКАПОВ ===
log_info "Доступные бэкапы в S3:"
echo ""

aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" | \
    sort -r | head -20

echo ""
read -p "Введите имя файла БД для восстановления (db-YYYYMMDD_HHMMSS.sqlite): " DB_FILE
read -p "Введите имя файла uploads для восстановления (uploads-YYYYMMDD_HHMMSS.tar.gz) или Enter для пропуска: " UPLOADS_FILE

# === ВОССТАНОВЛЕНИЕ БД ===
log_info "Скачивание БД из S3..."
mkdir -p "${LOCAL_BACKUP_DIR}"

aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}${DB_FILE}" "${LOCAL_BACKUP_DIR}/${DB_FILE}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}"

log_success "БД скачана"

# Создаем бэкап текущей БД
if [ -f "${DB_PATH}" ]; then
    log_warning "Создание бэкапа тек��щей БД..."
    cp "${DB_PATH}" "${DB_PATH}.backup-$(date +%Y%m%d_%H%M%S)"
fi

# Восстанавливаем БД
cp "${LOCAL_BACKUP_DIR}/${DB_FILE}" "${DB_PATH}"
log_success "БД восстановлена: ${DB_PATH}"

# === ВОССТАНОВЛЕНИЕ UPLOADS ===
if [ -n "${UPLOADS_FILE}" ]; then
    log_info "Скачивание uploads из S3..."
    
    aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}${UPLOADS_FILE}" "${LOCAL_BACKUP_DIR}/${UPLOADS_FILE}" \
        --endpoint-url "${S3_ENDPOINT}" \
        --region "${S3_REGION}"
    
    log_success "Архив uploads скачан"
    
    # Создаем бэкап текущей папки
    if [ -d "${UPLOADS_DIR}" ]; then
        log_warning "Создание бэкапа текущей папки uploads..."
        mv "${UPLOADS_DIR}" "${UPLOADS_DIR}.backup-$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Распаковываем
    log_info "Распаковка uploads..."
    tar -xzf "${LOCAL_BACKUP_DIR}/${UPLOADS_FILE}" -C "${PROJECT_DIR}/public"
    
    log_success "Папка uploads восстановлена: ${UPLOADS_DIR}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
log_info "Не забудьте перезапустить приложение:"
echo "  cd ${PROJECT_DIR}"
echo "  pm2 restart tashi-ani"
echo ""