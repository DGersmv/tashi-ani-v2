# Быстрая инструкция по развертыванию на reg.ru

## Краткая версия (для опытных)

### 1. Подключение
```bash
ssh root@130.49.150.175
# Пароль: hccWnbOuC25bkRq7
```

### 2. Установка зависимостей
```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential sqlite3 nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
apt install -y awscli
```

### 3. Создание директории
```bash
mkdir -p /var/www/tashi-ani
cd /var/www/tashi-ani
```

### 4. Загрузка проекта
Используйте SCP, WinSCP или FileZilla для загрузки файлов из `D:\tashi-ani` в `/var/www/tashi-ani/`

### 5. Установка проекта
```bash
cd /var/www/tashi-ani
npm install
```

### 6. Настройка .env.local
```bash
nano .env.local
```
Добавьте:
```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="9JIrDqLHlKvg3CwYIQJa5lKmRoAp1khQlU7fInuPjp3"
MASTER_ADMIN_EMAIL="admin@227.info"
MASTER_ADMIN_PASSWORD="admin123"
AWS_ACCESS_KEY_ID="ваш_key"
AWS_SECRET_ACCESS_KEY="ваш_secret"
NODE_ENV="production"
PORT=3000
```

### 7. Инициализация БД
```bash
npx prisma generate
npx prisma migrate deploy
```

### 8. Сборка
```bash
npm run build
```

### 9. Запуск PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 10. Настройка Nginx
```bash
nano /etc/nginx/sites-available/tashi-ani
```
Добавьте конфигурацию (см. полную инструкцию)
```bash
ln -s /etc/nginx/sites-available/tashi-ani /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 11. SSL (опционально)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.ru -d www.yourdomain.ru
```

---

**Полная инструкция**: см. `DEPLOY_REG_RU.md`
