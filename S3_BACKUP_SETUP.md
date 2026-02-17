# Настройка бэкапов в S3 (Reg.ru)

## Информация о хранилище

- **S3 Endpoint**: https://s3.regru.cloud
- **Bucket**: copybases
- **Квота**: 10 ГБ
- **ID набора ключей**: ecc418db-feb2-4ad7-b696-a1c4f90c50e6

## Шаг 1: Получение ключей доступа

1. Зайди в панель Reg.ru → Хранилище S3 → copybases
2. Перейди в раздел "Ключи доступа"
3. Если нет ключей - создай новый ключ
4. Скопируй:
   - **Access Key ID** (выглядит как: `AKIA...`)
   - **Secret Access Key** (длинная строка)

## Шаг 2: Добавление ключей на сервер

SSH на сервер и добавь ключи в `.env.local`:

```bash
ssh root@46.8.40.19
cd /var/www/tashi-ani
nano .env.local
```

Добавь строки (замени на свои ключи):

```
# S3 Backup (Reg.ru)
AWS_ACCESS_KEY_ID=твой_access_key_id
AWS_SECRET_ACCESS_KEY=твой_secret_access_key
```

## Шаг 3: Установка AWS CLI

```bash
sudo apt update
sudo apt install -y awscli
```

Проверка:
```bash
aws --version
```

## Шаг 4: Проверка подключения к S3

```bash
cd /var/www/tashi-ani
source .env.local
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

# Проверяем список файлов в бакете
aws s3 ls s3://copybases/ --endpoint-url https://s3.regru.cloud --region ru-1
```

## Шаг 5: Ручной бэкап

```bash
chmod +x scripts/backup-to-s3.sh
./scripts/backup-to-s3.sh
```

## Шаг 6: Автоматический бэкап (cron)

Добавляем в cron ежедневный бэкап в 3:00:

```bash
crontab -e
```

Добавь строку:
```
0 3 * * * /var/www/tashi-ani/scripts/backup-to-s3.sh >> /var/log/tashi-ani-backup.log 2>&1
```

## Восстановление из бэкапа

### Посмотреть список бэкапов:
```bash
./scripts/restore-from-s3.sh
```

### Восстановить конкретный бэкап:
```bash
./scripts/restore-from-s3.sh db-20251219_120000.sqlite
```

## Структура в S3

```
copybases/
├── country-house/          # Бэкапы country-house
│   ├── db-20251219_120000.sqlite
│   ├── db-20251220_030000.sqlite
│   └── ...
└── tashi-ani/              # Бэкапы tashi-ani
    └── ...
```

## Полезные команды

```bash
# Список всех бэкапов в S3
aws s3 ls s3://copybases/tashi-ani/ \
    --endpoint-url https://s3.regru.cloud \
    --region ru-1

# Скачать бэкап вручную
aws s3 cp s3://copybases/tashi-ani/db-20251219_120000.sqlite ./backup.sqlite \
    --endpoint-url https://s3.regru.cloud \
    --region ru-1

# Загрузить файл в S3
aws s3 cp ./my-file.sqlite s3://copybases/tashi-ani/ \
    --endpoint-url https://s3.regru.cloud \
    --region ru-1

# Удалить файл из S3
aws s3 rm s3://copybases/tashi-ani/old-backup.sqlite \
    --endpoint-url https://s3.regru.cloud \
    --region ru-1
```

## Проблемы и решения

### Ошибка "Access Denied"
- Проверь правильность ключей
- Убедись что ключи активны в панели Reg.ru

### Ошибка "Bucket not found"
- Имя бакета: `copybases` (точное написание)
- Endpoint: `https://s3.regru.cloud`

### AWS CLI не найден
```bash
sudo apt install -y awscli
```
