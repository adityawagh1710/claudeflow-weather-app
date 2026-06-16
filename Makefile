# Weather App — developer task runner
# Web app lives in apps/web (Next.js). Tauri shell + Supabase are planned (see doc/specs).

WEB_DIR    := apps/web
IMAGE      := weather-web
TAG        ?= latest
PORT       ?= 3000
ENV_FILE   ?= $(WEB_DIR)/.env

.DEFAULT_GOAL := help

.PHONY: help install dev build start test coverage e2e typecheck check clean \
        docker-build docker-run docker-stop up down migrate

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

## ----- Local (Node) -----

install: ## Install web dependencies (npm ci)
	cd $(WEB_DIR) && npm ci

dev: ## Run the web app in dev mode
	cd $(WEB_DIR) && npm run dev

build: ## Production build of the web app
	cd $(WEB_DIR) && npm run build

start: ## Start the production server (after build)
	cd $(WEB_DIR) && npm run start

test: ## Run unit tests (vitest)
	cd $(WEB_DIR) && npm run test

coverage: ## Run unit tests with coverage (enforces lib >=80%)
	cd $(WEB_DIR) && npm run test:coverage

e2e: ## Run Playwright E2E (builds + serves, then runs Chromium)
	cd $(WEB_DIR) && npm run test:e2e

typecheck: ## Type-check (tsc --noEmit)
	cd $(WEB_DIR) && npm run typecheck

check: typecheck coverage build ## Full verification: typecheck + coverage + build

clean: ## Remove build/install artifacts
	rm -rf $(WEB_DIR)/.next $(WEB_DIR)/out $(WEB_DIR)/node_modules $(WEB_DIR)/coverage

## ----- Docker -----

docker-build: ## Build the production Docker image
	docker build -t $(IMAGE):$(TAG) $(WEB_DIR)

docker-run: ## Run the image on $(PORT); passes $(ENV_FILE) if present
	docker run --rm -p $(PORT):3000 --name $(IMAGE) \
		$(if $(wildcard $(ENV_FILE)),--env-file $(ENV_FILE),) \
		$(IMAGE):$(TAG)

docker-stop: ## Stop the running container
	-docker stop $(IMAGE)

up: ## Start the whole app via docker compose (build + run, http://localhost:$(PORT))
	docker compose up --build -d

down: ## Stop and remove the docker compose stack
	docker compose down

## ----- Supabase -----

migrate: ## Apply DB migrations (requires Supabase CLI + linked project)
	@command -v supabase >/dev/null 2>&1 || { echo "supabase CLI not found; install it and 'supabase link' first"; exit 1; }
	supabase db push
