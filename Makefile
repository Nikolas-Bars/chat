COMPOSE ?= docker compose

.PHONY: start stop logs restart-backend rebuild-backend

## Поднять MariaDB и бэкенд в dev-режиме (миграции, сид, nest --watch)
start:
	$(COMPOSE) up --build

## Остановить контейнеры
stop:
	$(COMPOSE) down

## Логи только бэкенда (если подняли в фоне: docker compose up -d)
logs:
	$(COMPOSE) logs -f backend

## Перезапуск бэка (если после правок в src роут 404 — часто помогает)
restart-backend:
	$(COMPOSE) restart backend

## Пересборка образа бэка + up (если restart не помог)
rebuild-backend:
	$(COMPOSE) build --no-cache backend && $(COMPOSE) up -d backend
