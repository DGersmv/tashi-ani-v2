# Шпаргалка команд для управления сервером

## Подключение к серверу
```bash
ssh root@130.49.150.175
# Пароль: hccWnbOuC25bkRq7
```

## Управление приложением (PM2)

### Статус
```bash
pm2 status
pm2 list
```

### Логи
```bash
# Все логи
pm2 logs country-house

# Последние 50 строк
pm2 logs country-house --lines 50

# Только ошибки
pm2 logs country-house --err

# Мониторинг в реальном времени
pm2 monit
```

### Перезапуск
```bash
pm2 restart country-house
pm2 reload country-house  # Graceful reload
pm2 stop country-house
pm2 start country-house
```

### Удаление из PM2
```bash
pm2 delete country-house
```

## Управление Nginx

### Статус
```bash
systemctl status nginx
```

### Перезапуск
```bash
systemctl restart nginx
systemctl reload nginx
```

### Логи
```bash
# Доступ
tail -f /var/log/nginx/access.log

# Ошибки
tail -f /var/log/nginx/error.log
```

### Проверка конфигурации
```bash
nginx -t
```

### Редактирование конфигурации
```bash
nano /etc/nginx/sites-available/tashi-ani
# После изменений:
nginx -t
systemctl reload nginx
```

## Работа с проектом

### Переход в директорию
```bash
cd /var/www/tashi-ani
```

### Обновление проекта
```bash
cd /var/www/tashi-ani
# 1. Загрузите новые файлы (через SCP, Git и т.д.)
# 2. Установите зависимости
npm install
# 3. Пересоберите проект
npm run build
# 4. Перезапустите приложение
pm2 restart country-house
```

### Очистка и пересборка
```bash
cd /var/www/tashi-ani
rm -rf .next
rm -rf node_modules
npm install
npm run build
pm2 restart country-house
```

## База данных

### Применение миграций
```bash
cd /var/www/tashi-ani
npx prisma migrate deploy
npx prisma generate
```

### Просмотр базы данных
```bash
cd /var/www/tashi-ani
sqlite3 prisma/dev.db
# В SQLite консоли:
.tables
.schema
SELECT * FROM users;
.quit
```

### Резервное копирование (вручную)
```bash
cd /var/www/tashi-ani
sqlite3 prisma/dev.db ".backup /var/backups/tashi-ani/manual-backup-$(date +%Y%m%d_%H%M%S).sqlite"
```

## Бэкапы в S3

### Ручной бэкап
```bash
cd /var/www/tashi-ani
./scripts/backup-to-s3-tashi-ani.sh
```

### Просмотр бэкапов в S3
```bash
cd /var/www/tashi-ani
source .env.local
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
aws s3 ls s3://tashi-ani-base/tashi-ani/ --endpoint-url https://s3.regru.cloud --region ru-1
```

### Восстановление из бэкапа
```bash
cd /var/www/tashi-ani
./scripts/restore-from-s3.sh
# Или укажите конкретный файл:
./scripts/restore-from-s3.sh db-20250123_120000.sqlite
```

### Логи бэкапов
```bash
tail -f /var/log/tashi-ani-backup.log
```

## Переменные окружения

### Просмотр
```bash
cd /var/www/tashi-ani
cat .env.local
```

### Редактирование
```bash
cd /var/www/tashi-ani
nano .env.local
# После изменений перезапустите приложение:
pm2 restart country-house
```

## Мониторинг системы

### Использование ресурсов
```bash
# CPU и память
htop
# или
top

# Дисковое пространство
df -h

# Использование диска по директориям
du -sh /var/www/tashi-ani/*
```

### Сетевые соединения
```bash
# Активные соединения
netstat -tulpn

# Проверка порта 3000
netstat -tulpn | grep 3000

# Проверка порта 80
netstat -tulpn | grep :80
```

### Процессы
```bash
# Поиск процесса Node.js
ps aux | grep node

# Поиск процесса PM2
ps aux | grep pm2
```

## Безопасность

### Обновление системы
```bash
apt update && apt upgrade -y
```

### Смена пароля root
```bash
passwd
```

### Проверка файрвола
```bash
ufw status
ufw status verbose
```

### Блокировка IP
```bash
ufw deny from IP_ADDRESS
```

## SSL сертификат

### Установка Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### Получение сертификата
```bash
certbot --nginx -d yourdomain.ru -d www.yourdomain.ru
```

### Обновление сертификата
```bash
certbot renew
```

### Автоматическое обновление (уже настроено в cron)
```bash
certbot renew --dry-run
```

## Полезные команды

### Поиск файлов
```bash
# Поиск файла
find /var/www/tashi-ani -name "filename"

# Поиск по содержимому
grep -r "search_text" /var/www/tashi-ani
```

### Размер директорий
```bash
du -sh /var/www/tashi-ani/*
```

### Просмотр последних изменений
```bash
# Последние измененные файлы
find /var/www/tashi-ani -type f -mtime -1

# Логи приложения
tail -f /var/www/tashi-ani/logs/combined.log
```

### Очистка логов PM2
```bash
pm2 flush
```

### Перезагрузка сервера
```bash
reboot
```

## Диагностика проблем

### Приложение не запускается
```bash
# 1. Проверьте логи
pm2 logs country-house --err

# 2. Проверьте переменные окружения
cd /var/www/tashi-ani
cat .env.local

# 3. Проверьте что порт свободен
netstat -tulpn | grep 3000

# 4. Проверьте права доступа
ls -la /var/www/tashi-ani
```

### Nginx не работает
```bash
# 1. Проверьте конфигурацию
nginx -t

# 2. Проверьте логи
tail -f /var/log/nginx/error.log

# 3. Проверьте статус
systemctl status nginx
```

### Проблемы с базой данных
```bash
cd /var/www/tashi-ani
# Проверьте что файл существует
ls -lh prisma/dev.db

# Проверьте права доступа
chmod 644 prisma/dev.db

# Примените миграции заново
npx prisma migrate deploy
```

### Проблемы с S3
```bash
cd /var/www/tashi-ani
source .env.local
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

# Проверьте подключение
aws s3 ls s3://tashi-ani-base/ --endpoint-url https://s3.regru.cloud --region ru-1
```

## Быстрая перезагрузка всего

```bash
cd /var/www/tashi-ani
pm2 restart country-house
systemctl reload nginx
```

## Полная перезагрузка после изменений

```bash
cd /var/www/tashi-ani
npm install
npm run build
pm2 restart country-house
systemctl reload nginx
```
