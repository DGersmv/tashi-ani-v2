#!/bin/bash
# Безопасное обновление сервера с сохранением данных
# Запускать из /var/www/tashi-ani

set -e  # Остановка при ошибке

PROJECT_DIR="${PROJECT_DIR:-/var/www/tashi-ani}"
cd "$PROJECT_DIR" || exit 1

echo "🔍 Проверка текущего состояния..."
echo ""

# 1. Проверяем текущую БД (prisma/prod.db или из DATABASE_URL)
DB_PATH="${PROJECT_DIR}/prisma/prod.db"
echo "=== Проверка базы данных ==="
if [ -f "$DB_PATH" ]; then
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    echo "✅ БД найдена: $DB_PATH ($DB_SIZE)"
else
    echo "❌ БД не найдена: $DB_PATH"
    exit 1
fi

# 2. Проверяем .env.local
echo ""
echo "=== Проверка .env.local ==="
if [ -f ".env.local" ]; then
    echo "✅ .env.local найден"
else
    echo "⚠️  .env.local не найден (проверьте вручную)"
fi

# 3. Создаем бэкап текущего состояния
echo ""
echo "=== Создание бэкапа ==="
BACKUP_DIR="/var/backups/tashi-ani/pre-update-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp "$DB_PATH" "$BACKUP_DIR/prod.db"
echo "✅ БД скопирована в $BACKUP_DIR"

[ -f ".env.local" ] && cp .env.local "$BACKUP_DIR/.env.local" && echo "✅ .env.local скопирован"

# Бэкап текущих изменений (если есть git)
if [ -d ".git" ] && [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    git stash push -m "Backup before update $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
fi

# 4. Обновляем код
echo ""
echo "=== Обновление кода из GitHub ==="
git fetch origin
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH)

if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo "ℹ️  Код уже актуален"
else
    echo "Обновление с $CURRENT_COMMIT на $REMOTE_COMMIT"
    git pull origin $CURRENT_BRANCH
    echo "✅ Код обновлен"
fi

# 5. Устанавливаем зависимости
echo ""
echo "=== Установка зависимостей ==="
npm install
echo "✅ Зависимости установлены"

# 6. Применяем миграции
echo ""
echo "=== Применение миграций ==="
npx prisma migrate deploy
echo "✅ Миграции применены"

# 7. Пересобираем приложение
echo ""
echo "=== Сборка приложения ==="
npm run build
echo "✅ Приложение собрано"

# 8. Перезапускаем приложение
echo ""
echo "=== Перезапуск приложения ==="
pm2 restart tashi-ani
echo "✅ Приложение перезапущено"

# 9. Проверяем статус
echo ""
echo "=== Проверка статуса ==="
sleep 2
pm2 status
pm2 logs tashi-ani --lines 10 --nostream

echo ""
echo "✅ Обновление завершено!"
echo "📦 Бэкап сохранен в: $BACKUP_DIR"



