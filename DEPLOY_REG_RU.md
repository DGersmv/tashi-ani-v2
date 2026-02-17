# Пошаговая инструкция по развертыванию на сервере reg.ru

## Информация о сервере

- **IP адрес**: 130.49.150.175
- **Логин**: root
- **Пароль**: hccWnbOuC25bkRq7
- **ОС**: Ubuntu 24.04 LTS
- **S3 хранилище**: https://s3.regru.cloud/tashi-ani-base/

---

## ШАГ 1: Подключение к серверу

### Windows (PowerShell или CMD):
```powershell
ssh root@130.49.150.175
# Введите пароль: hccWnbOuC25bkRq7
```

### Или используйте PuTTY:
- Host: 130.49.150.175
- Port: 22
- Username: root
- Password: hccWnbOuC25bkRq7

---

## ШАГ 2: Обновление системы и установка базовых пакетов

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем необходимые пакеты
apt install -y curl wget git build-essential sqlite3
```

---

## ШАГ 3: Установка Node.js

```bash
# Устанавливаем Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверяем версии
node --version  # Должно быть v20.x.x
npm --version   # Должно быть 10.x.x
```

---

## ШАГ 4: Установка PM2

```bash
# Устанавливаем PM2 глобально
npm install -g pm2

# Проверяем установку
pm2 --version
```

---

## ШАГ 5: Создание директории для проекта

```bash
# Создаем директорию для проекта
mkdir -p /var/www/tashi-ani
cd /var/www/tashi-ani
```

---

## ШАГ 6: Загрузка проекта на сервер

### Вариант А: Через SCP (из Windows PowerShell)

Откройте **новое окно PowerShell** на вашем компьютере (не закрывая SSH сессию):

```powershell
# Переходим в папку с проектом
cd D:\tashi-ani

# Создаем архив проекта (исключая ненужные файлы)
# Используем tar через WSL или Git Bash, или создаем архив вручную

# Загружаем файлы на сервер через SCP
scp -r * root@130.49.150.175:/var/www/tashi-ani/
```

### Вариант Б: Через Git (если проект в репозитории)

```bash
# На сервере
cd /var/www/tashi-ani
git clone <ваш-репозиторий> .
```

### Вариант В: Через WinSCP или FileZilla

1. Подключитесь к серверу:
   - Host: 130.49.150.175
   - Username: root
   - Password: hccWnbOuC25bkRq7
   - Protocol: SFTP

2. Загрузите все файлы из `D:\tashi-ani` в `/var/www/tashi-ani/`

**Важно**: Не загружайте:
- `node_modules/`
- `.next/`
- `.git/`
- `.env.local` (создадим на сервере)
- `prisma/dev.db` (создастся автоматически)

---

## ШАГ 7: Установка зависимостей проекта

```bash
cd /var/www/tashi-ani

# Устанавливаем зависимости
npm install

# Если возникают проблемы с памятью при сборке:
# npm install --legacy-peer-deps
```

---

## ШАГ 8: Настройка переменных окружения

```bash
cd /var/www/tashi-ani
nano .env.local
```

Добавьте следующее содержимое (замените значения на свои):

```env
# База данных (SQLite)
DATABASE_URL="file:./prisma/dev.db"

# JWT секрет (используйте свой уникальный)
JWT_SECRET="9JIrDqLHlKvg3CwYIQJa5lKmRoAp1khQlU7fInuPjp3"

# Админ пользователь
MASTER_ADMIN_EMAIL="admin@227.info"
MASTER_ADMIN_PASSWORD="admin123"

# S3 хранилище (Reg.ru)
# Получите ключи в панели Reg.ru → Хранилище S3 → tashi-ani-base → Ключи доступа
AWS_ACCESS_KEY_ID="ваш_access_key_id"
AWS_SECRET_ACCESS_KEY="ваш_secret_access_key"

# Настройки приложения
NODE_ENV="production"
PORT=3000
```

**Сохраните файл**: `Ctrl+O`, затем `Enter`, затем `Ctrl+X`

---

## ШАГ 9: Получение ключей доступа к S3

1. Войдите в панель управления Reg.ru
2. Перейдите: **Хранилище S3** → **tashi-ani-base**
3. Откройте раздел **"Ключи доступа"**
4. Если ключей нет - создайте новый набор ключей
5. Скопируйте:
   - **Access Key ID**
   - **Secret Access Key**

6. Добавьте их в `.env.local` (см. ШАГ 8)

---

## ШАГ 10: Установка AWS CLI для работы с S3

```bash
# Устанавливаем AWS CLI
apt install -y awscli

# Проверяем установку
aws --version
```

---

## ШАГ 11: Проверка подключения к S3

```bash
cd /var/www/tashi-ani

# Загружаем переменные окружения
source .env.local
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

# Проверяем подключение к S3
aws s3 ls s3://tashi-ani-base/ --endpoint-url https://s3.regru.cloud --region ru-1
```

Если команда выполнилась успешно - подключение работает!

---

## ШАГ 12: Инициализация базы данных

```bash
cd /var/www/tashi-ani

# Генерируем Prisma Client
npx prisma generate

# Применяем миграции (создаст базу данных)
npx prisma migrate deploy

# Проверяем что база создана
ls -lh prisma/dev.db
```

---

## ШАГ 13: Создание директорий для загрузок

```bash
cd /var/www/tashi-ani

# Создаем директории для загружаемых файлов
mkdir -p public/uploads/objects
mkdir -p public/uploads/projects
mkdir -p public/uploads/panoramas
mkdir -p public/uploads/bim-models
mkdir -p public/uploads/documents
mkdir -p public/uploads/thumbnails

# Устанавливаем права доступа
chmod -R 755 public/uploads
```

---

## ШАГ 14: Сборка проекта

```bash
cd /var/www/tashi-ani

# Собираем проект для production
npm run build

# Если сборка падает из-за памяти, используйте:
# NODE_OPTIONS='--max-old-space-size=4096' npm run build
```

**Важно**: Сборка может занять 5-10 минут. Дождитесь завершения.

---

## ШАГ 15: Настройка PM2

```bash
cd /var/www/tashi-ani

# Обновляем ecosystem.config.js для правильного пути
nano ecosystem.config.js
```

Убедитесь что в файле указан правильный путь:

```javascript
module.exports = {
  apps: [{
    name: 'country-house',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/tashi-ani',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

Сохраните файл.

---

## ШАГ 16: Создание директории для логов

```bash
cd /var/www/tashi-ani
mkdir -p logs
```

---

## ШАГ 17: Запуск приложения через PM2

```bash
cd /var/www/tashi-ani

# Запускаем приложение
pm2 start ecosystem.config.js

# Сохраняем конфигурацию PM2 (для автозапуска после перезагрузки)
pm2 save

# Настраиваем автозапуск PM2 при загрузке системы
pm2 startup
# Выполните команду, которую выведет pm2 startup (обычно что-то вроде: sudo env PATH=...)

# Проверяем статус
pm2 status
pm2 logs country-house --lines 50
```

---

## ШАГ 18: Установка и настройка Nginx

```bash
# Устанавливаем Nginx
apt install -y nginx

# Копируем оптимизированную конфигурацию из проекта
cp /var/www/tashi-ani/nginx-tashi-ani.conf /etc/nginx/sites-available/tashi-ani

# Или создаем вручную
nano /etc/nginx/sites-available/tashi-ani
```

**Важно**: Используйте оптимизированную конфигурацию для поддержки больших файлов (панорамы, 3D модели до 500MB) и длительных загрузок.

Если создаете вручную, добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name _;

    # Увеличиваем размер загружаемых файлов до 500MB
    client_max_body_size 500M;
    client_body_buffer_size 128k;
    client_body_timeout 300s;
    client_header_timeout 300s;
    keepalive_timeout 300s;
    send_timeout 300s;
    
    # Увеличиваем размер буферов для прокси
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    
    # Таймауты для прокси (важно для больших файлов)
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    
    # Отключаем буферизацию для потоковой передачи
    proxy_buffering off;
    proxy_request_buffering off;

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
        
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # Оптимизация для API запросов с большими файлами
    location /api/upload {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 900s;
        proxy_send_timeout 900s;
        proxy_read_timeout 900s;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Статические файлы
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

Сохраните файл.

```bash
# Активируем конфигурацию
ln -s /etc/nginx/sites-available/tashi-ani /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию (если не нужна)
rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
nginx -t

# Перезапускаем Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## ШАГ 19: Настройка файрвола

```bash
# Устанавливаем UFW (если не установлен)
apt install -y ufw

# Разрешаем SSH
ufw allow 22/tcp

# Разрешаем HTTP и HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Включаем файрвол
ufw --force enable

# Проверяем статус
ufw status
```

---

## ШАГ 20: Настройка SSL сертификата (Let's Encrypt)

```bash
# Устанавливаем Certbot
apt install -y certbot python3-certbot-nginx

# Получаем SSL сертификат (замените yourdomain.ru на ваш домен)
certbot --nginx -d yourdomain.ru -d www.yourdomain.ru

# Следуйте инструкциям на экране
# Certbot автоматически обновит конфигурацию Nginx
```

**Важно**: Для получения SSL сертификата домен должен быть уже привязан к IP сервера (130.49.150.175).

---

## ШАГ 21: Настройка автоматических бэкапов в S3

```bash
cd /var/www/tashi-ani

# Делаем скрипты исполняемыми
chmod +x scripts/backup-to-s3-tashi-ani.sh
chmod +x scripts/restore-from-s3.sh

# Тестируем бэкап
./scripts/backup-to-s3-tashi-ani.sh
```

Если бэкап прошел успешно, настраиваем автоматический бэкап:

```bash
# Открываем crontab
crontab -e

# Добавляем строку для ежедневного бэкапа в 3:00
0 3 * * * /var/www/tashi-ani/scripts/backup-to-s3-tashi-ani.sh >> /var/log/tashi-ani-backup.log 2>&1
```

Сохраните и закройте редактор.

---

## ШАГ 22: Создание администратора (если нужно)

```bash
cd /var/www/tashi-ani

# Создаем администратора через скрипт
node create-admin-user.js
```

Или используйте переменные из `.env.local`:
- Email: `MASTER_ADMIN_EMAIL`
- Password: `MASTER_ADMIN_PASSWORD`

---

## ШАГ 23: Проверка работы сайта

1. **Проверьте что приложение запущено:**
   ```bash
   pm2 status
   pm2 logs country-house --lines 20
   ```

2. **Проверьте Nginx:**
   ```bash
   systemctl status nginx
   ```

3. **Откройте браузер и перейдите:**
   - `http://130.49.150.175` (или ваш домен)
   - Проверьте все функции сайта

---

## ШАГ 24: Настройка мониторинга

```bash
# Просмотр логов в реальном времени
pm2 logs country-house

# Мониторинг ресурсов
pm2 monit

# Статус приложения
pm2 status
```

---

## Полезные команды для управления

### Перезапуск приложения:
```bash
cd /var/www/tashi-ani
pm2 restart country-house
```

### Обновление проекта:
```bash
cd /var/www/tashi-ani
# Загрузите новые файлы (через SCP, Git и т.д.)
npm install
npm run build
pm2 restart country-house
```

### Просмотр логов:
```bash
# Логи приложения
pm2 logs country-house

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Логи бэкапов
tail -f /var/log/tashi-ani-backup.log
```

### Ручной бэкап:
```bash
cd /var/www/tashi-ani
./scripts/backup-to-s3-tashi-ani.sh
```

### Восстановление из бэкапа:
```bash
cd /var/www/tashi-ani
./scripts/restore-from-s3.sh
```

---

## Решение проблем

### Приложение не запускается:
```bash
# Проверьте логи
pm2 logs country-house --err

# Проверьте переменные окружения
cd /var/www/tashi-ani
cat .env.local

# Проверьте что порт 3000 свободен
netstat -tulpn | grep 3000
```

### Ошибки при сборке:
```bash
# Очистите кэш и пересоберите
cd /var/www/tashi-ani
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Проблемы с базой данных:
```bash
cd /var/www/tashi-ani
npx prisma migrate deploy
npx prisma generate
```

### Nginx не работает:
```bash
# Проверьте конфигурацию
nginx -t

# Перезапустите
systemctl restart nginx

# Проверьте статус
systemctl status nginx
```

---

## Безопасность

1. **Смените пароль root** (рекомендуется):
   ```bash
   passwd
   ```

2. **Настройте SSH ключи** вместо пароля (рекомендуется)

3. **Регулярно обновляйте систему:**
   ```bash
   apt update && apt upgrade -y
   ```

4. **Используйте сильные пароли** для всех сервисов

5. **Настройте регулярные бэкапы** (уже настроено в ШАГ 21)

---

## Контакты и поддержка

При возникновении проблем:
1. Проверьте логи: `pm2 logs country-house`
2. Проверьте статус сервисов: `pm2 status`, `systemctl status nginx`
3. Проверьте конфигурацию: `.env.local`, `ecosystem.config.js`, `/etc/nginx/sites-available/tashi-ani`

---

## Чек-лист развертывания

- [ ] Подключение к серверу
- [ ] Установка Node.js и npm
- [ ] Установка PM2
- [ ] Загрузка проекта на сервер
- [ ] Установка зависимостей (`npm install`)
- [ ] Создание `.env.local` с правильными значениями
- [ ] Получение ключей доступа к S3
- [ ] Установка AWS CLI
- [ ] Проверка подключения к S3
- [ ] Инициализация базы данных (`prisma migrate deploy`)
- [ ] Создание директорий для загрузок
- [ ] Сборка проекта (`npm run build`)
- [ ] Запуск через PM2
- [ ] Установка и настройка Nginx
- [ ] Настройка файрвола
- [ ] Настройка SSL (опционально)
- [ ] Настройка автоматических бэкапов
- [ ] Проверка работы сайта
- [ ] Тестирование всех функций

---

**Готово! Ваш сайт должен быть доступен по адресу http://130.49.150.175 или вашему домену.**
