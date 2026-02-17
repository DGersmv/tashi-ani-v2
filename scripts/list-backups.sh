#!/bin/bash
# Просмотр всех бэкапов в S3

set -e

# === НАСТРОЙКИ ===
PROJECT_DIR="/var/www/tashi-ani"
S3_ENDPOINT="https://s3.regru.cloud"
S3_BUCKET="tashi-ani-base"
S3_PREFIX="tashi-ani/backups/"
S3_REGION="ru-1"

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# === ЗАГРУЗКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ===
if [ -f "${PROJECT_DIR}/.env.local" ]; then
    export $(grep -E '^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)' "${PROJECT_DIR}/.env.local" | xargs)
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           ВСЕ БЭКАПЫ В S3 ХРАНИЛИЩЕ                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# === БЭКАПЫ БД ===
echo -e "${BLUE}=== БЭКАПЫ БАЗЫ ДАННЫХ ===${NC}"
echo ""
aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" | \
    grep "db-.*\.sqlite" | \
    sort -r

DB_COUNT=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" | \
    grep "db-.*\.sqlite" | wc -l)

echo ""
echo -e "${GREEN}Всего бэкапов БД: ${DB_COUNT}${NC}"

# === БЭКАПЫ UPLOADS ===
echo ""
echo -e "${BLUE}=== БЭКАПЫ ПАПКИ UPLOADS ===${NC}"
echo ""
aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" | \
    grep "uploads-.*\.tar\.gz" | \
    sort -r

UPLOADS_COUNT=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" | \
    grep "uploads-.*\.tar\.gz" | wc -l)

echo ""
echo -e "${GREEN}Всего бэкапов uploads: ${UPLOADS_COUNT}${NC}"

# === ОБЩИЙ РАЗМЕР ===
echo ""
echo -e "${BLUE}=== СТАТИСТИКА ХРАНИЛИЩА ===${NC}"
echo ""

TOTAL_SIZE=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}" \
    --endpoint-url "${S3_ENDPOINT}" \
    --region "${S3_REGION}" \
    --recursive \
    --summarize | grep "Total Size" | awk '{print $3}')

if [ -n "$TOTAL_SIZE" ]; then
    # Конвертируем в человекочитаемый формат
    if [ "$TOTAL_SIZE" -gt 1073741824 ]; then
        SIZE_GB=$(echo "scale=2; $TOTAL_SIZE / 1073741824" | bc)
        echo -e "Общий размер всех бэкапов: ${YELLOW}${SIZE_GB} GB${NC}"
    elif [ "$TOTAL_SIZE" -gt 1048576 ]; then
        SIZE_MB=$(echo "scale=2; $TOTAL_SIZE / 1048576" | bc)
        echo -e "Общий размер всех бэкапов: ${YELLOW}${SIZE_MB} MB${NC}"
    else
        SIZE_KB=$(echo "scale=2; $TOTAL_SIZE / 1024" | bc)
        echo -e "Общий размер всех бэкапов: ${YELLOW}${SIZE_KB} KB${NC}"
    fi
fi

echo ""