#!/bin/bash
# Скрипт для поиска старых баз данных на сервере

echo "=========================================="
echo "Поиск старых баз данных SQLite"
echo "=========================================="
echo ""

echo "=== Поиск в /var/www/tashi-ani ==="
find /var/www/tashi-ani -name "*.db" 2>/dev/null | while read file; do
    if [ -f "$file" ]; then
        SIZE=$(du -h "$file" | cut -f1)
        echo "  $file ($SIZE)"
        sqlite3 "$file" ".tables" 2>/dev/null | head -5
    fi
done

echo ""
echo "=== Поиск в /var/lib ==="
find /var/lib -name "*.db" 2>/dev/null | grep -i tashi

echo ""
echo "=== Поиск в /home/deploy ==="
find /home/deploy -name "*.db" 2>/dev/null

echo ""
echo "=== Поиск в /tmp ==="
find /tmp -name "*.db" 2>/dev/null | head -10

echo ""
echo "=== Поиск в /var/backups ==="
find /var/backups -name "*.db" 2>/dev/null

echo ""
echo "=== Поиск в текущей директории ==="
find . -name "*.db" 2>/dev/null

echo ""
echo "=== Полный поиск по всему серверу (может занять время) ==="
echo "Выполняется поиск всех .db файлов..."
find / -type f -name "*.db" 2>/dev/null | grep -v "/proc\|/sys\|/dev\|/run" | head -20

echo ""
echo "=========================================="
echo "Поиск завершен"
echo "=========================================="



