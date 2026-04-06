# Запуск из chat-back: compose и пути ./chat-back заданы в родительском каталоге chat/
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/..)

.PHONY: start stop logs restart-backend rebuild-backend

start:
	cd $(ROOT) && docker compose up --build

stop:
	cd $(ROOT) && docker compose down

logs:
	cd $(ROOT) && docker compose logs -f backend

restart-backend:
	cd $(ROOT) && docker compose restart backend

rebuild-backend:
	cd $(ROOT) && docker compose build --no-cache backend && docker compose up -d backend
