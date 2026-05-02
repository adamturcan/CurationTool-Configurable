# Memorise API

The backend for the Memorise data curation tool. It handles user login, persists workspaces, and proxies the four NLP services (NER, segmentation, classification, translation) to the configured upstream endpoints. The frontend never talks to the NLP services directly, every call goes through this server.

## What it does

* Authenticates users with JWT (access + refresh tokens).
* Stores users, workspaces and the endpoint configuration. You can choose the storage backend, by default it is a JSON file under `./data`, or Postgres if you set `DB_ADAPTER=postgres`.
* Resolves an NLP request to a registered adapter and forwards it to the configured URL. The SDU adapters use the SDU shape directly, the `MockMedical*` adapters convert a different shape into the platform's types.
* Seeds a default endpoint config and an `admin` user on first run, so a fresh checkout is usable without any manual setup.

## How to run it

```bash
npm install
npm run dev
```

The server listens on `http://localhost:3001`. On the first run it prints `Seeded default endpoint config` and `Seeded admin user`. The default admin password is `admin`, override it with the `ADMIN_PASSWORD` env var.

For a production build:

```bash
npm run build
npm start
```

## Environment variables

* `PORT` - port to listen on (default `3001`).
* `JWT_SECRET` - secret used to sign tokens. The server prints a warning and uses a dev default if this is unset.
* `ADMIN_PASSWORD` - password for the seeded admin user (default `admin`).
* `CORS_ORIGIN` - allowed origin for the frontend (default `http://localhost:5173`).
* `DB_ADAPTER` - `json` (default) or `postgres`.
* `DB_CONNECTION` - directory for JSON mode (default `./data`), or a Postgres connection string when `DB_ADAPTER=postgres`.
* `MAX_TEXT_LENGTH` - maximum number of characters accepted by the NLP routes (default `50000`).

## Project layout

* `src/index.ts` - server entry point, wires everything together.
* `src/types.ts` - shared DTOs.
* `src/routes/` - Express routes for auth, config, nlp and workspaces.
* `src/middleware/` - JWT auth and the admin guard.
* `src/db/` - the `DbAdapter` interface and its JSON and Postgres implementations.
* `src/adapters/` - NLP adapters (SDU and the medical mocks) and the registry.
* `src/__tests__/` - Vitest unit tests.

The general flow is: a request arrives at an Express route, the auth middleware verifies the JWT and attaches the user, the route either reads or writes through a `DbAdapter` or asks the adapter registry for an NLP adapter and forwards the call, and the JSON response goes back to the frontend.

A few decisions worth knowing about:

* The `DbAdapter` interface is the seam between the routes and storage, switching from JSON to Postgres only swaps the implementation, the routes do not change.
* NLP adapters are registered in an `AdapterRegistry` at startup. Each request looks up the adapter by service type and key, so adding a new adapter only needs a new file plus a registration line in `index.ts`.
* The endpoint configuration lives in the database, so admins can change URLs and adapters at runtime through the Services page without restarting the server.
* Auth uses two tokens, a short-lived access token and a longer-lived refresh token, so the user does not have to log in often but a leaked access token is not valid for long.
* The first run seeding only runs when the database is empty, so restarting against an existing database is safe.

## Tests

```bash
npm test
```

Runs the Vitest suite. There is one test file for the `AdapterRegistry` with six cases that cover how registration and lookup behave, the rest of the code is covered by using the app from the frontend.

## Notes

* The JSON storage backend is fine for local development and the standalone deployment, but it rewrites the whole file on every change and is not safe if more than one process writes at the same time. Use Postgres for any real deployment.
* The `/api/health` route pings the configured URL with a HEAD request (falling back to POST). This is how the admin Services page checks if a service is reachable.
