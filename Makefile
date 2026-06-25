.PHONY: help init build up down restart logs status seed-admin clean

help:
	@echo "Strategor MERN + Python Docker Management"
	@echo "========================================="
	@echo "Available commands:"
	@echo "  make init                 - Initialize the .env file with generated secrets"
	@echo "  make build                - Build all Docker images"
	@echo "  make up                   - Start all services in the background"
	@echo "  make down                 - Stop and remove all containers"
	@echo "  make restart              - Restart all services"
	@echo "  make logs                 - View combined logs for all services"
	@echo "  make status               - Check status of all services"
	@echo "  make seed-admin           - Promote or create an admin user (requires EMAIL and PASSWORD)"
	@echo "  make clean                - Clean up all containers, volumes, and images"

init:
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		JWT_SECRET=$$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "fallback-jwt-secret-please-replace-manually-32-chars"); \
		INTERNAL_TOKEN=$$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "fallback-internal-token-please-replace-manually-32-chars"); \
		python3 -c " \
import sys \
with open('.env', 'r') as f: text = f.read() \
text = text.replace('JWT_SECRET=', 'JWT_SECRET=' + sys.argv[1]) \
text = text.replace('INTERNAL_TOKEN=', 'INTERNAL_TOKEN=' + sys.argv[2]) \
with open('.env', 'w') as f: f.write(text) \
" "$$JWT_SECRET" "$$INTERNAL_TOKEN" 2>/dev/null || echo "Please edit .env manually to fill secrets."; \
		echo ".env file initialized successfully. Please open it and add your ANTHROPIC_API_KEY."; \
	else \
		echo ".env already exists."; \
	fi

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

status:
	docker compose ps

seed-admin:
	@EMAIL="$(EMAIL)"; \
	PASSWORD="$(PASSWORD)"; \
	if [ -z "$$EMAIL" ] || [ -z "$$PASSWORD" ]; then \
		EMAIL="$(word 2,$(MAKECMDGOALS))"; \
		PASSWORD="$(word 3,$(MAKECMDGOALS))"; \
	fi; \
	if [ -z "$$EMAIL" ] || [ -z "$$PASSWORD" ]; then \
		echo "Error: EMAIL and PASSWORD are required."; \
		echo "Usage: make seed-admin EMAIL=admin@example.com PASSWORD=StrongPassword123"; \
		echo "   or: make seed-admin admin@example.com StrongPassword123"; \
		exit 1; \
	fi; \
	docker compose exec backend-node npm run seed:admin "$$EMAIL" "$$PASSWORD"

clean:
	docker compose down -v --rmi all --remove-orphans

fclean: 
	@docker compose down --rmi all --volumes
	@docker system prune -a
	@docker builder prune -a
	@echo "Cleaned"

# Wildcard rule to allow passing positional arguments to targets
%:
	@:
