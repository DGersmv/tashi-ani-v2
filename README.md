# Tashi Ani - Система управления проектами

Система управления проектами для архитекторов и дизайнеров.

## Быстрый старт

### Локальная разработка

```bash
# Установите зависимости
npm install

# Создайте файл .env.local
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-min-32-chars"
MASTER_ADMIN_EMAIL="admin@example.com"
MASTER_ADMIN_PASSWORD="your-password"

# Создайте базу данных
npx prisma generate
npx prisma migrate dev

# Создайте админа
node create-admin-user.js

# Запустите dev сервер
npm run dev
```

### Деплой на сервер

См. инструкцию: [MINIMAL_SERVER_SETUP.md](./MINIMAL_SERVER_SETUP.md)

## Структура проекта

- `src/app` - Next.js App Router страницы и API routes
- `src/components` - React компоненты
- `src/lib` - Утилиты и библиотеки
- `prisma` - Схема базы данных и миграции

## Скрипты

- `npm run dev` - Запуск dev сервера
- `npm run build` - Сборка для production
- `npm run start` - Запуск production сервера
- `npm run db:migrate` - Применить миграции БД
- `node create-admin-user.js` - Создать/обновить админа
