# CuriousPMO — project Makefile
# Requires: GNU Make, Git Bash (Windows) or any POSIX shell (Linux/macOS)
#
# Usage examples:
#   make setup                          first-time setup (local, no Docker)
#   make dev                            start backend + frontend dev servers locally
#   make test                           run all backend tests
#   make test TEST=pm.tests.test_task_views   run one test module
#   make migrations APP=pm NAME=add_tags      generate named migration
#   make branch NAME=C1-subtasks        create feature/C1-subtasks from dev
#   make merge                          merge current feature branch into dev
#
# Docker — development:
#   make docker-full                    start ALL containers: backend (dev) + frontend + PostgreSQL
#   make docker-up                      start backend containers only (PostgreSQL + Django dev server)
#   make docker-up-fe                   build + start frontend container  →  http://localhost:5173
#   make docker-logs                    follow backend container logs
#   make docker-logs-fe                 follow frontend container logs
#   make docker-shell                   open a shell inside the running backend container
#   make docker-down                    stop and remove backend containers
#   make docker-down-fe                 stop frontend container
#
# Docker — production:
#   make prod-up                        start production containers (gunicorn + PostgreSQL)
#   make prod-logs                      follow production container logs
#   make prod-shell                     open a shell inside the production backend container
#   make prod-down                      stop production containers

SHELL  := /bin/bash
BE     := clickpm
FE     := frontend
PY     := python

.DEFAULT_GOAL := help

# ── colour helpers ────────────────────────────────────────────────────────────
CYAN  := \033[36m
RESET := \033[0m

# ── help ──────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'


# ── first-time setup ──────────────────────────────────────────────────────────

.PHONY: setup
setup: ## Copy .env files, install deps, run migrations
	@[ -f $(BE)/.env ] || (cp $(BE)/.env.example $(BE)/.env && echo "Created $(BE)/.env — edit it before continuing.")
	@[ -f $(FE)/.env ] || (cp $(FE)/.env.example $(FE)/.env && echo "Created $(FE)/.env")
	$(MAKE) install
	$(MAKE) migrate
	@echo ""
	@echo "Setup complete. Run 'make dev' to start the development servers."

.PHONY: install
install: install-be install-fe ## Install all dependencies (backend + frontend)

.PHONY: install-be
install-be: ## Install Python dependencies
	cd $(BE) && pip install -r requirements.txt

.PHONY: install-fe
install-fe: ## Install Node dependencies
	cd $(FE) && npm install


# ── development servers ───────────────────────────────────────────────────────

.PHONY: dev
dev: ## Start backend + frontend dev servers concurrently (Ctrl-C stops both)
	$(MAKE) -j2 run-be run-fe

.PHONY: run-be
run-be: ## Start Django dev server  →  http://localhost:8000
	cd $(BE) && $(PY) manage.py runserver

.PHONY: run-fe
run-fe: ## Start Vite dev server    →  http://localhost:5173
	cd $(FE) && npm run dev


# ── database ──────────────────────────────────────────────────────────────────

.PHONY: migrate
migrate: ## Apply all pending migrations
	cd $(BE) && $(PY) manage.py migrate

.PHONY: migrations
migrations: ## Generate migrations  (optional: APP=pm  NAME=description)
	cd $(BE) && $(PY) manage.py makemigrations $(APP) $(if $(NAME),--name $(NAME),)

.PHONY: showmigrations
showmigrations: ## List migration status for all apps
	cd $(BE) && $(PY) manage.py showmigrations

.PHONY: superuser
superuser: ## Create a Django superuser interactively
	cd $(BE) && $(PY) manage.py createsuperuser

.PHONY: shell
shell: ## Open the Django shell
	cd $(BE) && $(PY) manage.py shell

.PHONY: dbshell
dbshell: ## Open the database shell
	cd $(BE) && $(PY) manage.py dbshell


# ── quality ───────────────────────────────────────────────────────────────────

.PHONY: test
test: ## Run backend tests  (optional: TEST=pm.tests.test_task_views)
	cd $(BE) && $(PY) manage.py test $(TEST)

.PHONY: check
check: ## Run Django system checks
	cd $(BE) && $(PY) manage.py check

.PHONY: lint
lint: ## Run ESLint on frontend source
	cd $(FE) && npm run lint

.PHONY: typecheck
typecheck: ## TypeScript type-check (no emit)
	cd $(FE) && node_modules/.bin/tsc --noEmit

.PHONY: build
build: ## Production build of the frontend
	cd $(FE) && npm run build

.PHONY: preview
preview: ## Serve the production frontend build locally
	cd $(FE) && npm run preview


# ── docker — development ──────────────────────────────────────────────────────

.PHONY: docker-up
docker-up: ## Start dev containers (PostgreSQL + Django dev server)
	cd $(BE) && docker compose up -d

.PHONY: docker-down
docker-down: ## Stop and remove dev containers
	cd $(BE) && docker compose down

.PHONY: docker-build
docker-build: ## Rebuild dev container images
	cd $(BE) && docker compose build

.PHONY: docker-logs
docker-logs: ## Follow dev container logs (Ctrl-C to exit)
	cd $(BE) && docker compose logs -f

.PHONY: docker-shell
docker-shell: ## Open a shell inside the running web container
	cd $(BE) && docker compose exec web bash


# ── docker — production ───────────────────────────────────────────────────────

.PHONY: prod-up
prod-up: ## Start production containers (gunicorn + PostgreSQL)
	cd $(BE) && docker compose -f docker-compose.prod.yml up -d

.PHONY: prod-down
prod-down: ## Stop production containers
	cd $(BE) && docker compose -f docker-compose.prod.yml down

.PHONY: prod-build
prod-build: ## Rebuild production container images
	cd $(BE) && docker compose -f docker-compose.prod.yml build

.PHONY: prod-logs
prod-logs: ## Follow production container logs
	cd $(BE) && docker compose -f docker-compose.prod.yml logs -f

.PHONY: prod-shell
prod-shell: ## Open a shell inside the running production web container
	cd $(BE) && docker compose -f docker-compose.prod.yml exec web bash


# ── docker — frontend (production preview build) ──────────────────────────────

.PHONY: docker-up-fe
docker-up-fe: ## Build + start the frontend container  →  http://localhost:5173
	cd $(FE) && docker compose up -d --build

.PHONY: docker-down-fe
docker-down-fe: ## Stop the frontend container
	cd $(FE) && docker compose down

.PHONY: docker-build-fe
docker-build-fe: ## Rebuild the frontend container image
	cd $(FE) && docker compose build

.PHONY: docker-logs-fe
docker-logs-fe: ## Follow frontend container logs
	cd $(FE) && docker compose logs -f

.PHONY: docker-full
docker-full: ## Start all containers: backend (dev) + frontend (preview)
	$(MAKE) docker-up
	$(MAKE) docker-up-fe


# ── git workflow ──────────────────────────────────────────────────────────────
# Mirrors the branch strategy in CLAUDE.md:
#   main  ←  dev  ←  feature/<NAME>

.PHONY: branch
branch: ## Create a feature branch from dev  (required: NAME=C1-subtasks)
	@[ -n "$(NAME)" ] || \
		(echo "ERROR: NAME is required — e.g.  make branch NAME=C1-subtasks" && exit 1)
	git checkout dev
	git checkout -b feature/$(NAME)

.PHONY: merge
merge: ## Merge current feature branch into dev and delete the branch
	@BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$BRANCH" = "dev" ] || [ "$$BRANCH" = "main" ]; then \
		echo "ERROR: currently on '$$BRANCH' — checkout your feature branch first"; \
		exit 1; \
	fi; \
	git checkout dev && git merge $$BRANCH && git branch -d $$BRANCH


# ── clean ─────────────────────────────────────────────────────────────────────

.PHONY: clean
clean: ## Remove build artefacts and Python caches
	rm -rf $(FE)/dist
	find $(BE) -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find $(BE) -name "*.pyc" -delete 2>/dev/null || true
	find $(BE) -name "*.pyo" -delete 2>/dev/null || true
