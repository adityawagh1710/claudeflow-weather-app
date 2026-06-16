# Weather App — developer task runner
# Web app lives in apps/web (Next.js). Tauri shell + Supabase are planned (see doc/specs).

WEB_DIR    := apps/web
IMAGE      := weather-web
TAG        ?= latest
PORT       ?= 3000

.DEFAULT_GOAL := help

.PHONY: help install dev build start test typecheck check clean \
        docker-build docker-run docker-stop

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
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

typecheck: ## Type-check (tsc --noEmit)
	cd $(WEB_DIR) && npm run typecheck

check: typecheck test build ## Full verification: typecheck + test + build

clean: ## Remove build/install artifacts
	rm -rf $(WEB_DIR)/.next $(WEB_DIR)/out $(WEB_DIR)/node_modules $(WEB_DIR)/coverage

## ----- Docker -----

docker-build: ## Build the production Docker image
	docker build -t $(IMAGE):$(TAG) $(WEB_DIR)

docker-run: ## Run the image, exposing $(PORT)
	docker run --rm -p $(PORT):3000 --name $(IMAGE) $(IMAGE):$(TAG)

docker-stop: ## Stop the running container
	-docker stop $(IMAGE)
