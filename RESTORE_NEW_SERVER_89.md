# Восстановление сайта на новом сервере 89.111.154.8

Пошаговый чек-лист: развернуть tashi-ani и восстановить БД + uploads из локальных копий.

---

## Подготовка: что должно быть под рукой

- Доступ по SSH: `ssh root@89.111.154.8`
- Локальные файлы на ПК: `E:\tashi-ani\backups\db-20250216.sqlite`, `E:\tashi-ani\backups\uploads-20250216.tar.gz`
- Проект на ПК: `E:\tashi-ani\` (код без обязательной загрузки `node_modules` и `.next` — на сервере сделаем `npm install` и `npm run build`)
- Секреты для `.env.local`: JWT_SECRET, MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD, при необходимости ключи S3

---

## Часть 1. На сервере: зависимости и каталог

Подключитесь: `ssh root@89.111.154.8`, затем выполните по блокам.

```bash
# Обновление и базовые пакеты
apt update && apt upgrade -y
apt install -y curl wget git build-essential sqlite3 nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2

# Каталог проекта
mkdir -p /var/www/tashi-ani
cd /var/www/tashi-ani
```

---

## Часть 1b. Swap-файл (рекомендуется при 4 GB RAM)

Чтобы при сборке и пиках нагрузки не заканчивалась память, создайте swap 2–4 GB:

```bash
# Создать файл 2 GB (для 4 GB RAM обычно достаточно)
fallocate -l 2G /swapfile

# Права только root
chmod 600 /swapfile

# Оформить как swap
mkswap /swapfile

# Включить
swapon /swapfile

# Подключить после перезагрузки
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Проверка
free -h
```

В выводе `free -h` должна появиться строка `Swap` с ~2 GiB. Если нужен swap 4 GB — замените `2G` на `4G` в первой команде.

---

## Часть 2. Загрузить проект на сервер

**Вариант А — с ПК через SCP (PowerShell):**  
Загрузите содержимое проекта (можно без `node_modules` и `.next`):

```powershell
scp -r E:\tashi-ani\* root@89.111.154.8:/var/www/tashi-ani/
```

Если копируете всё подряд (включая `node_modules`), дождитесь окончания. Если исключили тяжёлые папки — на сервере потом выполните `npm install`.

**Вариант Б — на сервере через Git:**

```bash
cd /var/www/tashi-ani
git clone https://github.com/DGersmv/tashi-ani.git .
```

(Тогда с ПК отдельно нужно будет передать только `.env.local` и бэкапы.)

---

## Часть 3. На сервере: .env.local и установка проекта

```bash
cd /var/www/tashi-ani

# Создать .env.local (подставьте свои значения)
nano .env.local
```

Минимум для восстановления с SQLite:

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="ваш_секрет_минимум_32_символа"
MASTER_ADMIN_EMAIL="2277277@bk.ru"
MASTER_ADMIN_PASSWORD="ваш_пароль_админа"
NODE_ENV="production"
PORT=3000
```

При необходимости добавьте `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` и переменные для email. Сохраните (Ctrl+O, Enter, Ctrl+X).

```bash
# Зависимости и сборка (если не загружали node_modules — обязательно)
npm install
npx prisma generate
npm run build
```

БД пока не создаём — подставим восстановленную `prod.db` ниже.

---

## Часть 4. С ПК: скопировать бэкап БД и uploads на сервер

В **новом** окне PowerShell на вашем ПК:

```powershell
# База
scp E:\tashi-ani\backups\db-20250216.sqlite root@89.111.154.8:/var/www/tashi-ani/prisma/prod.db

# Архив загрузок (около 401 MB — подождите)
scp E:\tashi-ani\backups\uploads-20250216.tar.gz root@89.111.154.8:/tmp/
```

Пароль root — по запросу.

---

## Часть 5. На сервере: распаковать uploads и права

```bash
cd /var/www/tashi-ani

# Убрать пустую uploads, если есть
mv public/uploads public/uploads.bak 2>/dev/null || true

# Распаковать архив
tar -xzf /tmp/uploads-20250216.tar.gz -C public/

# Владелец — www-data (чтобы приложение и nginx читали файлы)
chown -R www-data:www-data public/uploads

# Проверка
ls -la public/uploads
ls prisma/prod.db
```

---

## Часть 6. Запуск приложения и автозапуск

```bash
cd /var/www/tashi-ani
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Выполните команду, которую выведет pm2 startup (sudo env PATH=...)
pm2 status
pm2 logs tashi-ani --lines 20
```

Убедитесь, что процесс `tashi-ani` в статусе `online`.

---

## Часть 7. Nginx

```bash
cp /var/www/tashi-ani/nginx-tashi-ani.conf /etc/nginx/sites-available/tashi-ani
ln -sf /etc/nginx/sites-available/tashi-ani /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
```

---

## Часть 8. Проверка

- Откройте в браузере: `http://89.111.154.8`
- Зайдите в админку (логин/пароль из `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD`), проверьте объекты и фото.
- При необходимости настройте домен и SSL (certbot), в Nginx укажите `server_name ваш_домен.ru`.

---

## Краткая шпаргалка команд

| Действие              | Команда |
|-----------------------|--------|
| Подключение (по ключу) | `ssh -i C:\Users\DGer\.ssh\tashi_ani root@89.111.154.8` |
| Логи приложения       | `pm2 logs tashi-ani` |
| Перезапуск приложения | `cd /var/www/tashi-ani && pm2 restart tashi-ani` |
| Статус                | `pm2 status` |
| Перезапуск Nginx      | `systemctl restart nginx` |
| **Безопасное обновление** (бэкап + git + build + restart) | `cd /var/www/tashi-ani && ./scripts/safe-update-server.sh` |

Перед обновлением скрипт копирует БД и `.env.local` в `/var/backups/tashi-ani/pre-update-...`. Быстрое обновление без бэкапа: `./scripts/update-from-github.sh`.

---

## Ошибка: колонка `fcmToken` не существует в базе

Если при запуске `fix-admin-password.js` или при входе появляется ошибка про `users.fcmToken`, в восстановленной базе нет этой колонки. Добавьте её один раз:

```bash
sqlite3 /var/www/tashi-ani/prisma/prod.db "ALTER TABLE users ADD COLUMN fcmToken TEXT;"
```

После этого снова запустите `node scripts/fix-admin-password.js`.

---

## Не получается войти (500 или «неверный пароль»)

Скрипт `scripts/fix-admin-password.js` уже лежит на сервере (он в составе проекта при деплое). Запускать его нужно **один раз**, когда нужно выставить известный пароль админу в базе.

На сервере по SSH:

```bash
cd /var/www/tashi-ani
node scripts/fix-admin-password.js
```

В `.env.local` должны быть заданы **MASTER_ADMIN_EMAIL** и **MASTER_ADMIN_PASSWORD** (желательно те же, что и email админа в базе, например `admin@227.info`). Скрипт обновит пароль этого пользователя в БД. После этого зайдите на сайт с этими email и паролем.

Если что-то пойдёт не так — пришлите вывод `pm2 logs tashi-ani --lines 50` и сообщение об ошибке.
