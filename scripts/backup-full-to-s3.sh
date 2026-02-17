#!/bin/bash
# Полный бэкап проекта tashi-ani в S3 (Reg.ru)
# Включает: SQLite БД + папка uploads
# БЕЗ УДАЛЕНИЯ - только добавление новых бэкапов

set -e

# === НАСТРОЙКИ ===
PROJECT_NAME="tashi-ani"
PROJECT_DIR="/var/www/tashi-ani"
DB_PATH="${PROJECT_DIR}/prisma/prod.db"
UPLOADS_DIR="${PROJECT_DIR}/public/uploads"
LOCAL_BACKUP_DIR="/var/backups/tashi-ani"
DATE=$(date +%Y%m%d_%H%M%S)

# Имена файлов бэкапов
DB_BACKUP_FILE="db-${DATE}.sqlite"
UPLOADS_BACKUP_FILE="uploads-${DATE}.tar.gz"
DB_LOCAL_BACKUP="${LOCAL_BACKUP_DIR}/${DB_BACKUP_FILE}"
UPLOADS_LOCAL_BACKUP="${LOCAL_BACKUP_DIR}/${UPLOADS_BACKUP_FILE}"

# S3 настройки (Reg.ru)
S3_ENDPOINT="https://s3.regru.cloud"
S3_BUCKET="tashi-ani-base"
S3_PREFIX="tashi-ani/backups/"
S3_REGION="ru-1"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# === ФУНКЦИИ ===
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# === ЗАГРУЗКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ===
if [ -f "${PROJECT_DIR}/.env.local" ]; then
    export $(grep -E '^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)' "${PROJECT_DIR}/.env.local" | xargs)
fi

# === НАЧАЛО ===
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║       ПОЛНЫЙ БЭКАП ПРОЕКТА ${PROJECT_NAME}                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
log_info "Дата: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# === ПРОВЕРКИ ===
log_info "Проверка окружения..."

# Проверяем существование БД
if [ ! -f "${DB_PATH}" ]; then
    log_error "База данных не найдена: ${DB_PATH}"
    exit 1
fi
log_success "База данных найдена"

# Проверяем существование папки uploads
if [ ! -d "${UPLOADS_DIR}" ]; then
    log_warning "Папка uploads не найдена: ${UPLOADS_DIR}"
    UPLOADS_EXISTS=false
else
    UPLOADS_SIZE=$(du -sh "${UPLOADS_DIR}" | cut -f1)
    log_success "Папка uploads найдена (размер: ${UPLOADS_SIZE})"
    UPLOADS_EXISTS=true
fi

# Проверяем S3 ключи
if [ -z "${AWS_ACCESS_KEY_ID}" ] || [ -z "${AWS_SECRET_ACCESS_KEY}" ]; then
    log_error "S3 ключи не настроены в .env.local"
    echo ""
    echo "Добавьте в ${PROJECT_DIR}/.env.local:"
    echo "  AWS_ACCESS_KEY_ID=ваш_access_key"
    echo "  AWS_SECRET_ACCESS_KEY=ваш_secret_key"
    exit 1
fi
log_success "S3 ключи найдены"

# Проверяем AWS CLI
if ! command -v aws &> /dev/null; then
    log_warning "AWS CLI не установлен. Устанавливаю..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y awscli
        log_success "AWS CLI установлен"
    else
        log_error "Не могу установить AWS CLI автоматически"
        exit 1
    fi
else
    log_success "AWS CLI установлен"
fi

# === СОЗДАНИЕ ДИРЕКТОРИИ ДЛ�� БЭКАПОВ ===
mkdir -p "${LOCAL_BACKUP_DIR}"
log_success "Директория бэкапов готова: ${LOCAL_BACKUP_DIR}"

echo ""
echo "─────────────────────────────────────────────────────────────"
echo ""

# === БЭКАП БАЗЫ ДАННЫХ ===
log_info "1/2: Создание бэкапа базы данных..."

if command -v sqlite3 &> /dev/null; then
    sqlite3 "${DB_PATH}" ".backup '${DB_LOCAL_BACKUP}'"
else
    # Альтернативный метод если sqlite3 не установлен
    cp "${DB_PATH}" "${DB_LOCAL_BACKUP}"
fi

if [ ! -f "${DB_LOCAL_BACKUP}" ]; then
    log_error "Не удалось создать бэкап БД!"
    exit 1
fi

DB_SIZE=$(du -h "${DB_LOCAL_BACKUP}" | cut -f1)
log_success "Локальный бэкап БД создан: ${DB_SIZE}"

# Загрузка БД в S3
log_info "Загрузка БД в S3..."
aws s3 cp "${DB_LOCAL_BACKUP}" "s3://${S3_BUCKET}/${S3_PREFIX}${DB_BACKUP_FILE}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" \
    --no-verify-ssl

if [ $? -eq 0 ]; then
    log_success "БД загружена в S3: s3://${S3_BUCKET}/${S3_PREFIX}${DB_BACKUP_FILE}"
else
    log_error "Не удалось загрузить БД в S3!"
    exit 1
fi

echo ""

# === БЭКАП ПАПКИ UPLOADS ===
if [ "${UPLOADS_EXISTS}" = true ]; then
    log_info "2/2: Создание бэкапа папки uploads..."
    
    # Создаем архив
    tar -czf "${UPLOADS_LOCAL_BACKUP}" -C "${PROJECT_DIR}/public" uploads
    
    if [ ! -f "${UPLOADS_LOCAL_BACKUP}" ]; then
        log_error "Не удалось создать архив uploads!"
        exit 1
    fi
    
    UPLOADS_ARCHIVE_SIZE=$(du -h "${UPLOADS_LOCAL_BACKUP}" | cut -f1)
    log_success "Локальный архив uploads создан: ${UPLOADS_ARCHIVE_SIZE}"
    
    # Загрузка в S3
    log_info "Загрузка uploads в S3..."
    aws s3 cp "${UPLOADS_LOCAL_BACKUP}" "s3://${S3_BUCKET}/${S3_PREFIX}${UPLOADS_BACKUP_FILE}" \
        --endpoint-url "${S3_ENDPOINT}" \
        --region "${S3_REGION}" \
        --no-verify-ssl
    
    if [ $? -eq 0 ]; then
        log_success "Uploads загружены в S3: s3://${S3_BUCKET}/${S3_PREFIX}${UPLOADS_BACKUP_FILE}"
    else
        log_error "Не удалось загрузить uploads в S3!"
        exit 1
    fi
else
    log_warning "2/2: Папка uploads не найдена, пропускаю..."
fi

echo ""
echo "─────────────────────────────────────────────────────────────"
echo ""

# === СТАТИСТИКА БЭКАПОВ В S3 ===
log_info "Статистика бэкапов в S3:"
echo ""

# Считаем количество бэкапов БД
DB_COUNT=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" \
    --no-verify-ssl | \
    grep "db-.*\.sqlite" | wc -l)

# Считаем количество бэкапов uploads
UPLOADS_COUNT=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" \
    --no-verify-ssl | \
    grep "uploads-.*\.tar\.gz" | wc -l)

log_info "  • Всего бэкапов БД в S3: ${DB_COUNT}"
log_info "  • Всего бэкапов uploads в S3: ${UPLOADS_COUNT}"

echo ""
log_info "Последние 5 бэкапов в S3:"
aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" \
    --no-verify-ssl | \
    sort -r | head -5

# === ОЧИСТКА СТАРЫХ ЛОКАЛЬНЫХ БЭКАПОВ (храним только 3 дня, остальное уже в S3) ===
DAYS_TO_KEEP=3
log_info "Удаление локальных бэкапов старше ${DAYS_TO_KEEP} дней..."
find "${LOCAL_BACKUP_DIR}" -maxdepth 1 -name "db-*.sqlite" -mtime +${DAYS_TO_KEEP} -delete 2>/dev/null || true
find "${LOCAL_BACKUP_DIR}" -maxdepth 1 -name "uploads-*.tar.gz" -mtime +${DAYS_TO_KEEP} -delete 2>/dev/null || true
log_success "Старые локальные бэкапы удалены"

# === ЛОГИРОВАНИЕ ===
LOG_FILE="${LOCAL_BACKUP_DIR}/backup.log"
echo "$(date '+%Y-%m-%d %H:%M:%S'): DB=${DB_SIZE} UPLOADS=${UPLOADS_ARCHIVE_SIZE:-N/A} S3_DB_COUNT=${DB_COUNT} S3_UPLOADS_COUNT=${UPLOADS_COUNT}" >> "${LOG_FILE}"

# === ИТОГ ===
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              БЭКАП ЗАВЕРШЁН УСПЕШНО!                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
log_success "Локальные бэкапы:"
echo "  • БД: ${DB_LOCAL_BACKUP} (${DB_SIZE})"
if [ "${UPLOADS_EXISTS}" = true ]; then
    echo "  • Uploads: ${UPLOADS_LOCAL_BACKUP} (${UPLOADS_ARCHIVE_SIZE})"
fi
echo ""
log_success "Бэкапы в S3:"
echo "  • s3://${S3_BUCKET}/${S3_PREFIX}${DB_BACKUP_FILE}"
if [ "${UPLOADS_EXISTS}" = true ]; then
    echo "  • s3://${S3_BUCKET}/${S3_PREFIX}${UPLOADS_BACKUP_FILE}"
fi
echo ""
log_info "Всего бэкапов в хранилище:"
echo "  • БД: ${DB_COUNT} файлов"
echo "  • Uploads: ${UPLOADS_COUNT} файлов"
echo ""
log_info "Просмотреть все бэкапы в S3:"
echo "  aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX} --endpoint-url ${S3_ENDPOINT} --region ${S3_REGION}"
echo ""