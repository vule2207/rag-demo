# --- World Class Dev Experience ---

.PHONY: dev build clean logs status help

help:
	@echo "Available commands:"
	@echo "  make dev     - Start all services with logs"
	@echo "  make build   - Build all docker containers"
	@echo "  make clean   - Stop all containers and remove volumes"
	@echo "  make logs    - Stream container logs"
	@echo "  make status  - Show container status"

dev:
	docker compose up --build

build:
	docker compose build

clean:
	docker compose down -v

logs:
	docker compose logs -f

status:
	docker compose ps
