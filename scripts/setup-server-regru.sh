#!/bin/bash
# Автоматическая настройка сервера для tashi-ani на reg.ru
# ВНИМАНИЕ: Запускайте только на чистом сервере Ubuntu 24.04

set -e

echo "=========================================="
echo "Настройка сервера для tashi-ani"
echo "=========================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}ОШИБКА: Запустите скрипт от root (sudo)${NC}"
    exit 1
fi

PROJECT_DIR="/var/www/tashi-ani"

# Шаг 1: Обновление системы
echo -e "${GREEN}[1/10] Обновление системы...${NC}"
apt update && apt upgrade -y

# Шаг 2: Установка базовых пакетов
echo -e "${GREEN}[2/10] Установка базовых пакетов...${NC}"
apt install -y curl wget git build-essential sqlite3 nginx ufw

# Шаг 3: Установка Node.js
echo -e "${GREEN}[3/10] Установка Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "Node.js версия: $(node --version)"
echo "npm версия: $(npm --version)"

# Шаг 4: Установка PM2
echo -e "${GREEN}[4/10] Установка PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "PM2 версия: $(pm2 --version)"

# Шаг 5: Установка AWS CLI
echo -e "${GREEN}[5/10] Установка AWS CLI...${NC}"
if ! command -v aws &> /dev/null; then
    apt install -y awscli
fi
echo "AWS CLI версия: $(aws --version)"

# Шаг 6: Создание директории проекта
echo -e "${GREEN}[6/10] Создание директории проекта...${NC}"
mkdir -p "${PROJECT_DIR}"
mkdir -p /var/backups/tashi-ani
mkdir -p "${PROJECT_DIR}/logs"

# Шаг 7: Настройка файрвола
echo -e "${GREEN}[7/10] Настройка файрвола...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

# Шаг 8: Создание базовой конфигурации Nginx
echo -e "${GREEN}[8/10] Настройка Nginx...${NC}"
cat > /etc/nginx/sites-available/tashi-ani << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
    }
}
EOF

# Активация конфигурации
ln -sf /etc/nginx/sites-available/tashi-ani /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
nginx -t

# Шаг 9: Информация для пользователя
echo -e "${GREEN}[9/10] Базовая настройка завершена!${NC}"
echo ""
echo -e "${YELLOW}Следующие шаги:${NC}"
echo "1. Загрузите файлы проекта в ${PROJECT_DIR}"
echo "2. Создайте файл .env.local с настройками"
echo "3. Выполните: cd ${PROJECT_DIR} && npm install"
echo "4. Выполните: npx prisma generate && npx prisma migrate deploy"
echo "5. Выполните: npm run build"
echo "6. Выполните: pm2 start ecosystem.config.js && pm2 save"
echo "7. Выполните: systemctl restart nginx"
echo ""
echo -e "${YELLOW}Для получения SSL сертификата:${NC}"
echo "apt install -y certbot python3-certbot-nginx"
echo "certbot --nginx -d yourdomain.ru -d www.yourdomain.ru"
echo ""

# Шаг 10: Проверка
echo -e "${GREEN}[10/10] Проверка установки...${NC}"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "AWS CLI: $(aws --version 2>&1 | head -n1)"
echo ""
echo -e "${GREEN}=========================================="
echo "Настройка сервера завершена!"
echo "==========================================${NC}"
