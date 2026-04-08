# VPS backend deploy

Этот каталог нужен для production-развертывания `chat-back` на VPS с внешней MariaDB.

## Что выбрать

- backend домен: `api.chat-q.ru`
- frontend домен: `https://app.chat-q.ru`
- база данных: внешняя MariaDB/MySQL
- способ запуска: `Docker Compose`
- SSL: `Nginx + Let's Encrypt`
- автодеплой: `GitHub Actions -> SSH -> VPS`

## Что лежит в каталоге

- `docker-compose.prod.yml` — production compose
- `.env.prod.example` — пример серверного env-файла
- `bootstrap-vps.sh` — первичная настройка Ubuntu VPS
- `update-and-run.sh` — server-side deploy/update script
- `nginx/api.chat-q.ru.conf.example` — шаблон nginx-конфига

## 1. Подготовь VPS

Закажи Ubuntu 22.04/24.04 и зайди по SSH под `root`.

Установи `git` и клонируй репозиторий:

```bash
apt-get update
apt-get install -y git
git clone https://github.com/<owner>/<repo>.git /opt/chat-backend
cd /opt/chat-backend
```

Потом запусти bootstrap:

```bash
export DEPLOY_USER=deploy
export DEPLOY_PUBLIC_KEY="ssh-ed25519 AAAA...your-public-key..."
bash /opt/chat-backend/deploy/bootstrap-vps.sh
```

После этого перелогинься уже под `deploy`.

## 2. Настрой DNS

В DNS-панели домена создай запись:

- `A api.chat-q.ru -> <IPv4 VPS>`

Если хочешь IPv6:

- `AAAA api.chat-q.ru -> <IPv6 VPS>`

Проверь:

```bash
nslookup api.chat-q.ru 1.1.1.1
```

## 3. Настрой env на сервере

На сервере:

```bash
mkdir -p /opt/chat-backend/deploy
cp /opt/chat-backend/deploy/.env.prod.example /opt/chat-backend/deploy/.env.prod
```

Если репо еще не клонировалось, сначала:

```bash
git clone https://github.com/<owner>/<repo>.git /opt/chat-backend
cp /opt/chat-backend/deploy/.env.prod.example /opt/chat-backend/deploy/.env.prod
```

Заполни `deploy/.env.prod`:

```env
NODE_ENV=production
PORT=3000
BACKEND_PORT=3000

PUBLIC_APP_URL=https://app.chat-q.ru
CORS_ORIGINS=https://app.chat-q.ru
COOKIE_SAME_SITE=none

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
DB_SSL=false
```

## 4. Первый ручной запуск

```bash
cd /opt/chat-backend
bash deploy/update-and-run.sh
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs -f backend
```

Проверь локально на сервере:

```bash
curl http://127.0.0.1:3000/
```

## 5. Настрой Nginx

Скопируй шаблон:

```bash
sudo cp /opt/chat-backend/deploy/nginx/api.chat-q.ru.conf.example /etc/nginx/sites-available/api.chat-q.ru.conf
sudo ln -s /etc/nginx/sites-available/api.chat-q.ru.conf /etc/nginx/sites-enabled/api.chat-q.ru.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Выпусти SSL

```bash
sudo certbot --nginx -d api.chat-q.ru
```

После этого backend будет доступен по `https://api.chat-q.ru`.

## 7. Подключи автодеплой

В GitHub -> `Settings -> Secrets and variables -> Actions` добавь:

- `VPS_HOST`
- `VPS_PORT` (обычно `22`)
- `VPS_USER` (например `deploy`)
- `VPS_APP_DIR` (например `/opt/chat-backend`)
- `VPS_SSH_PRIVATE_KEY`

После этого workflow `.github/workflows/deploy-backend-vps.yml` будет деплоить backend на push в `main`.

## 8. Что проверить после деплоя

- `https://api.chat-q.ru/` отвечает
- `https://app.chat-q.ru` больше не получает CORS errors
- логин проходит
- сокеты работают
- миграции выполнились

Проверка CORS:

```bash
curl -I https://api.chat-q.ru/
```

Проверка контейнера:

```bash
cd /opt/chat-backend
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs --tail=200 backend
bash deploy/smoke-check.sh
```
