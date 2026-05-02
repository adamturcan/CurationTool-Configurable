# NPRG045 — Data Curation Tool

Bachelor's thesis project (NPRG045 Software Project) at Charles University, Faculty of Mathematics and Physics.

A text curation tool for NLP-assisted annotation of Holocaust testimonies, built as part of the [Memorise](https://memorise.sdu.dk/about-memorise/) digital humanities initiative. The tool comes with a frontend editor and a server that handles authentication, persistent workspaces and configurable NLP services.

## What is in this repository

* `memorise-ui/` — the React + TypeScript frontend (Vite). See `memorise-ui/README.md` for the architecture notes.
* `server/` — the Express + TypeScript backend. Handles login, workspace storage, and proxies requests to the configured NLP services through pluggable adapters (SDU + medical mock).
* `mocks/` — two small mock NLP services used to demo configurability:
  * `legal-mock-sdu/` reuses the SDU adapters by exposing the same shapes with legal content.
  * `medical-mock-clinical/` uses an intentionally different shape, paired with the `MockMedical*` adapters in the server.
* `docker-compose.yml` — client + server (JSON storage).
* `docker-compose.postgres.yml` — same but with a Postgres database for the server.
* `docker-compose.standalone.yml` — client only, no backend, everything stored in localStorage.
* `.github/workflows/` — CI pipeline (type-check, lint, test, build, deploy to GitHub Pages).

## Getting started

### Standalone, no backend

The simplest way to run the tool. Workspaces live in localStorage and there is no login.

```bash
cd memorise-ui
npm install
npm run dev
```

The dev server opens at `http://localhost:5173/DataCurationTool/`. The `/DataCurationTool/` subpath is the default because the GitHub Pages deploy is hosted there, set `VITE_BASE_PATH=/` in `.env` if you want it on the root path.

### With the backend

In one terminal:

```bash
cd server
npm install
npm run dev
```

In another terminal:

```bash
cd memorise-ui
npm install
npm run dev
```

Add `VITE_BACKEND_URL=http://localhost:3001` to `memorise-ui/.env` so the frontend points at the local server. On the first run the server seeds an admin user, log in with username `admin` and password `admin` (override the password with `ADMIN_PASSWORD`).

### With the mock NLP services

To demo swapping the upstream NLP provider, also start one of the mocks:

```bash
cd mocks/legal-mock-sdu
npm install
npm start
# or: cd mocks/medical-mock-clinical && npm install && npm start
```

Then log in as admin, open the Services page, and point the four service rows at the mock URLs. Each mock has its own README with the exact steps.

### Docker

```bash
docker compose up                                  # client + server, JSON storage
docker compose -f docker-compose.postgres.yml up   # client + server + Postgres
docker compose -f docker-compose.standalone.yml up # client only
```

The app is then available at `http://localhost:3000`.

## CI

GitHub Actions runs on every push and PR to `main`:

1. Type-check (`tsc --noEmit`)
2. Lint (`eslint`)
3. Test (`vitest`)
4. Build (Vite production build + Docker image)
5. Deploy the standalone build to GitHub Pages on `main`
