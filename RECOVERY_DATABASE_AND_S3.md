# Восстановление базы данных и данных из хранилища tashi-ani-base

Пошаговая инструкция: копирование БД с сервера (или из бэкапов S3), загрузка в tashi-ani-base и восстановление связей (пользователи, объекты, фото).

---

## Что где лежит

- **S3 хранилище**: `s3://tashi-ani-base/` (Reg.ru), endpoint: `https://s3.regru.cloud`, region: `ru-1`.
- **Бэкапы БД** могут быть в:
  - `s3://tashi-ani-base/tashi-ani/` — файлы `db-YYYYMMDD_HHMMSS.sqlite` (скрипт `backup-to-s3-tashi-ani.sh`).
  - `s3://tashi-ani-base/tashi-ani/backups/` — файлы `db-*.sqlite` и `uploads-*.tar.gz` (скрипты `backup-full-to-s3.sh`, `restore-from-s3.sh`).
- **На сервере** БД может быть:
  - **PostgreSQL** (как в вашем `.env`: `postgresql://...@79.174.89.232:15555/db1`) — дамп делается через `pg_dump`.
  - **SQLite** — файл `/var/www/tashi-ani/prisma/prod.db` или `prisma/dev.db` — копируем файл или делаем `.backup`.

---

## Часть 1. Зайти на сервер и сделать копию БД

### Как это сделать (кратко)

1. **Решите, куда подключаться:**
   - **Есть рабочий SSH** (сервер восстановлен или не заражён) → Вариант A ниже.
   - **Сервер «убивает» команды, доступ только через образ восстановления** → Вариант B (SystemRescueCD).

2. **Подключитесь:**
   - SSH к обычному серверу: `ssh root@130.49.150.175` (подставьте свой IP). Введите пароль по запросу.
   - **SystemRescueCD** — см. отдельный блок ниже (по инструкции поддержки).

3. **Сделайте копию БД:**
   - **Если БД — PostgreSQL** (в `.env` указан `postgresql://...`): на сервере установите `postgresql-client`, затем выполните `pg_dump` (команды в Варианте A) или запустите скрипт `scripts/backup-postgres-to-s3.sh` из каталога проекта.
   - **Если БД — SQLite** (файл `prisma/prod.db` или `dev.db`): выполните `sqlite3 ... .backup` или `cp` (команды в Варианте A).
   - **В SystemRescueCD**: скопируйте файл БД из `/mnt/var/www/tashi-ani/prisma/` в `/tmp/` и при необходимости создайте архив `uploads` (команды в Варианте B).

4. **Заберите копию к себе или отправьте в S3:**  
   С своей машины: `scp root@IP_сервера:/tmp/имя_файла E:\tashi-ani\backups\`  
   Либо с сервера загрузите файл в S3 (Часть 3).

---

### Вариант A: Подключение по SSH к восстановленному серверу

Если после восстановления из бэкапа у вас снова работает SSH:

```bash
# Подключение (подставьте ваш хост и пользователя)
ssh root@130.49.150.175
# или тот хост, где сейчас крутится приложение
```

Дальше шаги зависят от типа БД.

---

#### Если БД — PostgreSQL (как в .env: 79.174.89.232:15555)

На машине, с которой есть доступ к серверу и к БД (можно локально с Windows с установленным `pg_dump`, или на самом сервере):

```bash
# Установка клиента PostgreSQL (если ещё нет)
# Ubuntu/Debian на сервере:
apt-get update && apt-get install -y postgresql-client

# Дамп БД (подставьте свои хост, порт, пользователь, пароль и имя БД из DATABASE_URL)
export PGPASSWORD='ваш_пароль'
pg_dump -h 79.174.89.232 -p 15555 -U admin -d db1 -F c -f /tmp/db1_$(date +%Y%m%d_%H%M%S).dump

# Или в виде SQL (удобно для просмотра и восстановления в любой СУБД):
pg_dump -h 79.174.89.232 -p 15555 -U admin -d db1 --no-owner --no-acl -f /tmp/db1_$(date +%Y%m%d_%H%M%S).sql
```

Файл дампа будет в `/tmp/`. Его нужно скачать к себе (см. шаг 2) и при необходимости загрузить в S3.

---

#### Если БД — SQLite на сервере

```bash
# Переход в каталог проекта
cd /var/www/tashi-ani

# Проверка, какой файл БД используется (смотреть в .env.local: DATABASE_URL)
ls -la prisma/*.db

# Создание копии (без блокировки приложения)
sqlite3 prisma/prod.db ".backup '/tmp/db-backup-$(date +%Y%m%d_%H%M%S).sqlite'"

# Или просто копирование файла (при остановленном приложении надёжнее)
cp prisma/prod.db /tmp/db-backup-$(date +%Y%m%d_%H%M%S).sqlite
```

Копия будет в `/tmp/`. Дальше — скачать к себе и/или загрузить в S3.

---

### Вариант B: Подключение к SystemRescueCD (по инструкции поддержки)

Когда сервер заражён и поддержка предложила копировать данные через образ восстановления:

**Шаг 1 — Подключиться по SSH к SystemRescueCD**

- Откройте терминал на своём компьютере (PowerShell, CMD или Git Bash).
- IP-адрес — **тот же, что у вашего облачного сервера** (смотрите в личном кабинете хостера). Порт SSH обычно 22.
- Выполните:
  ```bash
  ssh root@IP_ВАШЕГО_СЕРВЕРА
  ```
- Когда запросит пароль, введите пароль доступа к **SystemRescueCD**:  
  **`ersCAo9evMinRGp`**  
  (именно тот, что указала поддержка в письме).

**Шаг 2 — Активировать окружение смонтированного диска**

После входа в SystemRescueCD выполните одну команду:

```bash
arch-chroot /mnt/
```

Теперь вы внутри файловой системы вашего сервера (диск смонтирован в `/mnt`, корень для вас — `/`).

**Шаг 3 — Найти и скопировать БД и загрузки**

```bash
# Поиск файлов БД
find / -name "*.db" 2>/dev/null
find /var/www -name "*.db" 2>/dev/null

# Обычные пути проекта:
# /var/www/tashi-ani/prisma/prod.db
# /var/www/tashi-ani/prisma/dev.db

# Копирование БД в /tmp (отсюда потом заберёте по SCP)
cp /var/www/tashi-ani/prisma/prod.db /tmp/db-rescue-$(date +%Y%m%d).sqlite

# Архив папки с фото и загрузками
tar -czvf /tmp/uploads-rescue-$(date +%Y%m%d).tar.gz -C /var/www/tashi-ani/public uploads
```

**Важно:** в SystemRescueCD папка `/tmp` в памяти. Сразу после копирования заберите файлы на свой ПК по SCP (Часть 2), иначе при отключении они пропадут.

Подробнее про копирование по SSH — в документации хостера: «Копирование файлов через SSH».

---

## Часть 2. Скачать копию БД и uploads на свой компьютер

С вашей машины (PowerShell или Git Bash), когда файлы лежат на сервере в `/tmp`:

```powershell
# Подставьте IP и путь к файлу на сервере.
# Если копии делали в SystemRescueCD внутри arch-chroot — путь на сервере: /mnt/tmp/backup/...
scp root@130.49.150.175:/tmp/db-backup-*.sqlite E:\tashi-ani\backups\
scp root@130.49.150.175:/tmp/uploads-rescue-*.tar.gz E:\tashi-ani\backups\
```

Если подключались к **SystemRescueCD** и копии делали внутри `arch-chroot /mnt/`, то при `scp` с вашего ПК путь на сервере не `/tmp/`, а **`/mnt/tmp/`** (файлы лежат на смонтированном диске). Пример: `scp root@IP:/mnt/tmp/backup/db-20250216.sqlite E:\tashi-ani\backups\`

---

## Часть 3. Отправить копию в хранилище tashi-ani-base (S3)

Нужны ключи S3 из личного кабинета Reg.ru: **Хранилище S3 → tashi-ani-base → Ключи доступа**.

### С вашего компьютера (Windows)

Установите [AWS CLI](https://aws.amazon.com/cli/) и выполните:

```powershell
cd E:\tashi-ani

set AWS_ACCESS_KEY_ID=ваш_access_key
set AWS_SECRET_ACCESS_KEY=ваш_secret_key

# Загрузка файла БД в папку tashi-ani/ (как делает backup-to-s3-tashi-ani.sh)
aws s3 cp backups\db-backup-YYYYMMDD_HHMMSS.sqlite s3://tashi-ani-base/tashi-ani/db-YYYYMMDD_HHMMSS.sqlite --endpoint-url https://s3.regru.cloud --region ru-1

# Загрузка архива uploads (если есть)
aws s3 cp backups\uploads-rescue-YYYYMMDD.tar.gz s3://tashi-ani-base/tashi-ani/uploads-YYYYMMDD.tar.gz --endpoint-url https://s3.regru.cloud --region ru-1
```

Или в ту же папку, откуда делается восстановление скриптом `restore-from-s3.sh`:

```powershell
aws s3 cp backups\db-backup-YYYYMMDD_HHMMSS.sqlite s3://tashi-ani-base/tashi-ani/backups/db-YYYYMMDD_HHMMSS.sqlite --endpoint-url https://s3.regru.cloud --region ru-1
aws s3 cp backups\uploads-rescue-YYYYMMDD.tar.gz s3://tashi-ani-base/tashi-ani/backups/uploads-YYYYMMDD.tar.gz --endpoint-url https://s3.regru.cloud --region ru-1
```

### Просмотр того, что уже есть в S3 (в т.ч. бэкап от 11 февраля)

```powershell
set AWS_ACCESS_KEY_ID=ваш_access_key
set AWS_SECRET_ACCESS_KEY=ваш_secret_key

# Список в корне префикса tashi-ani
aws s3 ls s3://tashi-ani-base/tashi-ani/ --endpoint-url https://s3.regru.cloud --region ru-1

# Список в tashi-ani/backups/
aws s3 ls s3://tashi-ani-base/tashi-ani/backups/ --endpoint-url https://s3.regru.cloud --region ru-1
```

По датам в именах файлов можно найти последнее копирование (11 февраля).

---

## Часть 4. Восстановить БД и данные на целевом сервере

Целевой сервер — чистый после восстановления из образа или новый. На нём должен быть развёрнут проект tashi-ani и настроен `.env.local` (в т.ч. `DATABASE_URL` и при необходимости S3).

### 4.0. Восстановление с локальных копий (без S3)

Если у вас уже есть скачанные файлы на ПК (например, `E:\tashi-ani\backups\db-20250216.sqlite` и `uploads-20250216.tar.gz`), в них есть всё необходимое — восстанавливать из S3 не обязательно.

**С вашего ПК (PowerShell):** скопировать файлы на новый сервер:

```powershell
scp E:\tashi-ani\backups\db-20250216.sqlite root@НОВЫЙ_IP_СЕРВЕРА:/var/www/tashi-ani/prisma/prod.db
scp E:\tashi-ani\backups\uploads-20250216.tar.gz root@НОВЫЙ_IP_СЕРВЕРА:/tmp/
```

**На сервере:** распаковать uploads и перезапустить приложение:

```bash
cd /var/www/tashi-ani
mv public/uploads public/uploads.bak 2>/dev/null || true
tar -xzf /tmp/uploads-20250216.tar.gz -C public/
chown -R www-data:www-data public/uploads
npx prisma generate
pm2 restart tashi-ani
```

В `.env.local` на сервере должен быть `DATABASE_URL="file:./prisma/prod.db"`. S3 в этом сценарии нужен только как дополнительная копия на случай потери ПК.

### 4.1. Скачать бэкап из S3 на сервер

На целевом сервере:

```bash
cd /var/www/tashi-ani
source .env.local
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

# Список бэкапов (найти нужную дату, например 11 февраля)
aws s3 ls s3://tashi-ani-base/tashi-ani/ --endpoint-url https://s3.regru.cloud --region ru-1
aws s3 ls s3://tashi-ani-base/tashi-ani/backups/ --endpoint-url https://s3.regru.cloud --region ru-1

# Скачать БД (подставьте имя файла)
mkdir -p /var/backups/tashi-ani
aws s3 cp s3://tashi-ani-base/tashi-ani/db-20250211_030000.sqlite /var/backups/tashi-ani/ --endpoint-url https://s3.regru.cloud --region ru-1

# Если бэкап в backups/
aws s3 cp s3://tashi-ani-base/tashi-ani/backups/db-20250211_030000.sqlite /var/backups/tashi-ani/ --endpoint-url https://s3.regru.cloud --region ru-1
```

### 4.2. Восстановить БД

Если на целевом сервере используется **SQLite** (`DATABASE_URL="file:./prisma/prod.db"`):

```bash
cd /var/www/tashi-ani

# Бэкап текущей БД (если есть)
cp prisma/prod.db prisma/prod.db.bak-$(date +%Y%m%d) 2>/dev/null || true

# Подставить имя скачанного файла
cp /var/backups/tashi-ani/db-20250211_030000.sqlite prisma/prod.db

npx prisma generate
pm2 restart tashi-ani   # или как у вас называется процесс
```

Если на целевом сервере используется **PostgreSQL**, нужно восстановить дамп в новую/целевую БД:

```bash
# Восстановление из custom-формата
pg_restore -h 79.174.89.232 -p 15555 -U admin -d db1 --no-owner --no-acl /var/backups/tashi-ani/db1_20250211.dump

# Или из SQL-файла
psql "postgresql://admin:пароль@79.174.89.232:15555/db1?sslmode=require" -f /var/backups/tashi-ani/db1_20250211.sql
```

После этого приложение должно видеть пользователей, объекты и связи. Фото и документы — по путям из БД (см. ниже).

### 4.3. Восстановить папку uploads (фото, документы)

Если скачали архив `uploads-*.tar.gz` из S3 или с заражённого диска:

```bash
cd /var/www/tashi-ani

# Бэкап текущей папки (если есть)
mv public/uploads public/uploads.bak-$(date +%Y%m%d) 2>/dev/null || true

# Распаковка (подставьте имя файла)
tar -xzf /var/backups/tashi-ani/uploads-20250211.tar.gz -C public/
```

Если архив лежит в `public/` после распаковки (например, получилось `public/uploads/...`), проверьте:

```bash
ls -la public/uploads
```

### 4.4. Проверить связи и целостность

- Зайти в админку, проверить список пользователей и объектов.
- Открыть несколько объектов и проверить, что отображаются фото и документы (пути в БД должны совпадать с файлами в `public/uploads`).

Если часть файлов отсутствует (вирус удалил или бэкап неполный), записи в БД останутся, но превью/скачивание не будут работать до повторной загрузки файлов или обновления путей.

---

## Краткий чек-лист

| Шаг | Действие |
|-----|----------|
| 1 | Подключиться к серверу (SSH или SystemRescueCD + arch-chroot). |
| 2 | Сделать копию БД: PostgreSQL → `pg_dump`; SQLite → `sqlite3 .backup` или `cp *.db`. |
| 3 | При возможности — архив `public/uploads` в tar.gz. |
| 4 | Скачать файлы на свой ПК (scp) или сразу загрузить в S3 с сервера. |
| 5 | Загрузить копию БД (и uploads) в s3://tashi-ani-base/tashi-ani/ или tashi-ani/backups/. |
| 6 | На целевом сервере: скачать из S3 → восстановить БД → распаковать uploads → prisma generate → перезапуск приложения. |
| 7 | Проверить пользователей, объекты, фото в интерфейсе. |

---

## Полезные скрипты в репозитории

- **Просмотр бэкапов в S3** (на сервере): `./scripts/list-backups.sh`
- **Восстановление из S3** (SQLite + uploads): `./scripts/restore-from-s3.sh`
- **Ручной бэкап в S3** (SQLite): `./scripts/backup-to-s3-tashi-ani.sh`
- **Полный бэкап (SQLite + uploads) в S3**: `./scripts/backup-full-to-s3.sh`

Для **PostgreSQL** на сервере можно использовать скрипт:

```bash
chmod +x /var/www/tashi-ani/scripts/backup-postgres-to-s3.sh
/var/www/tashi-ani/scripts/backup-postgres-to-s3.sh
```

Он читает `DATABASE_URL` и ключи S3 из `/var/www/tashi-ani/.env.local`, создаёт дамп в `/var/backups/tashi-ani/db-YYYYMMDD_HHMMSS.sql` и загружает его в `s3://tashi-ani-base/tashi-ani/backups/`. Восстановление такого бэкапа — через `psql ... -f файл.sql` (см. раздел 4.2 выше).
