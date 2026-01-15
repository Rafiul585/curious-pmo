# CuriousPMO Frontend (React + Vite + TypeScript)

This SPA consumes the existing Django API (`/api`) and ships with light/dark theme, JWT auth, and ready-made project/task views.

## Quick start
```bash
cd frontend
cp .env.example .env             # set VITE_API_BASE_URL to your Django host (default: http://localhost:8000/api)
npm install
npm run dev                      # http://localhost:5173
```

## Build & preview
```bash
npm run build
npm run preview                  # serves the built app
```

## Docker
```bash
docker build -t curiouspmo-frontend ./frontend
docker run -p 5173:5173 --env-file ./frontend/.env curiouspmo-frontend
# or
docker-compose -f docker-compose.frontend.yml up --build
```

## Project layout
- `src/api` — RTK Query slices for auth, projects, tasks.
- `src/store` — Redux Toolkit store (auth tokens/user, UI theme).
- `src/pages` — Dashboard, Projects, Tasks, Auth pages.
- `src/components/layout` — Main and auth layouts, navigation, guards.
- `src/theme` — MUI theme hook with light/dark palette.

## Notes
- Auth endpoints expect DRF URLs: `/auth/login/`, `/auth/register/`, `/users/me/`.
- Tailwind is available for utility styling; MUI provides the base component system.
- Socket endpoint is configured via `VITE_SOCKET_URL` (defaults to `http://localhost:8000`).
