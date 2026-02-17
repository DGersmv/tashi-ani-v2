# Сборка и деплой tashi-ani

Одна инструкция: что делать при первой настройке и при каждом обновлении.

---

## Первая настройка сервера (один раз)

### 1. Клонировать репозиторий
```bash
cd /var/www
git clone https://github.com/DGersmv/tashi-ani.git
cd tashi-ani
```

### 2. Переменные окружения
```bash
cp .env.local.example .env.local
nano .env.local
```
Обязательно задать: `DATABASE_URL`, `JWT_SECRET`, `MASTER_ADMIN_EMAIL`, `MASTER_ADMIN_PASSWORD`.  
Для продакшена БД: `DATABASE_URL="file:./prisma/prod.db"`.

### 3. Зависимости и БД
```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

### 4. Сборка
```bash
npm run build
```
Сборка идёт без флага `--webpack` (Next 15). ESLint при сборке не блокирует (ошибки линта не роняют build).

### 5. Запуск
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Nginx
Сайт слушает `127.0.0.1:3000`. В nginx для этого хоста: `proxy_pass http://127.0.0.1:3000;`.

---

## Каждое обновление (после push в GitHub)

Выполнять **на сервере** в каталоге проекта (`/var/www/tashi-ani`):

```bash
git pull origin master
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart tashi-ani
```

Или одной командой (скрипт делает то же самое):

```bash
./scripts/update-from-github.sh
```

---

## Важно

- **Не использовать** `next build --webpack` — такой опции в Next 15 нет, сборка без неё.
- **Миграции** только добавляют таблицы/поля, существующие данные не трогают. Перед деплоем при желании можно сделать бэкап: `cp prisma/prod.db prisma/prod.db.bak`.
- Если сборка падала из‑за ESLint — в проекте включено `eslint.ignoreDuringBuilds: true` в `next.config.js`, повторять отключение линта не нужно.
