# Memorise UI

The frontend of the Memorise data curation tool. It is a single-page React + TypeScript app built with Vite and MUI, and can be used either standalone (everything in localStorage, no login) or together with the backend in `server/` (login, persistent workspaces, server-side NLP proxying).

## What it does

* Lets the user create workspaces with a source text and edit it segment by segment.
* Runs NER, sentence segmentation, semantic classification and machine translation against the configured services and renders the results as span decorations and tabs.
* Resolves conflicts between user edits and re-running NER on the same text.
* Lets the user split, join and reorder segments, with translations kept in sync.
* Maintains a hierarchical thesaurus for semantic tags, searched in a Web Worker so the main thread stays responsive.
* Has an admin-only Services page where the configured NLP endpoints can be edited at runtime (when running in server mode).

## How to run it

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173/DataCurationTool/`. The base path `/DataCurationTool/` is the default because the GitHub Pages deploy is served from that subpath. To run from the root path, set `VITE_BASE_PATH=/`.

To connect to the local backend, also set `VITE_BACKEND_URL=http://localhost:3001` in `.env`.

For a production build:

```bash
npm run build
npm run preview
```

## Environment variables

All configuration is baked in at build time through `VITE_*` env vars. Copy `.env.example` to `.env` and override what you need:

* `VITE_BASE_PATH` — URL base path (default `/DataCurationTool/`, set to `/` for Docker/standalone).
* `VITE_BACKEND_URL` — URL of the backend in server mode. Leaving it unset selects the standalone (localStorage) mode.
* `VITE_NER_API_URL`, `VITE_SEGMENT_API_URL`, `VITE_CLASSIFY_API_URL`, `VITE_TRANSLATION_API_URL` — direct URLs of the four NLP services. Only used in standalone mode, in server mode the backend resolves them.

## Docker

```bash
docker compose up -d --build
```

The image is a static SPA served by nginx on host port `3000`. Because it is static and the config is baked in, any change to a `VITE_*` variable needs `--build`, otherwise the cached image keeps serving the old bundle.

## Scripts

* `npm run dev` — Vite dev server with hot reload.
* `npm run build` — type-check then production build.
* `npm run preview` — serve the production build locally.
* `npm test` — run unit tests with Vitest.
* `npm run test:ui` — Vitest browser UI.
* `npm run lint` — ESLint check.
* `npm run build:docs` — generate API docs via TypeDoc into `docs/api/`.
* `npm run build:thesaurus` — rebuild the thesaurus search index from the full JSON.

## Project layout

```
src/
  core/           Domain types, interfaces and pure logic (entities, use cases)
  application/    Workflow services that orchestrate use cases for each feature
  infrastructure/ Concrete adapters for storage, the API and config
  presentation/   React components, hooks and Zustand stores
  shared/         Cross-cutting helpers (errors, theme, constants, utilities)
  types/          Shared TypeScript DTOs
```

The general flow is: the user does something in a component, a hook calls a workflow service, the workflow service goes through the use case and the repository, results land in a Zustand store, and the components re-render from the store.

A few decisions worth knowing about:

* The `Workspace` entity is immutable, mutations return a new instance via `with*()` builder methods.
* Tags and translations are kept as plain DTOs, not entity wrappers.
* Storage goes through a `WorkspaceRepository` interface, so the same code works against localStorage in standalone mode and against the backend in server mode.
* NER spans are split into user-created and API-generated lists so re-running NER does not silently overwrite the user's edits.
* Errors are normalised into an `AppError` in `shared/errors`, then turned into a user-facing `Notice` in the application layer, so all UX messages live in one place.

## Tests

Unit tests live in `src/__tests__/`. They cover one representative per layer (a domain entity, a use case validator, the error pipeline, the application facade, an infrastructure adapter), so the architectural seams are guarded. UI components are not covered here, that would be E2E.

```bash
npm test
```

## Tech stack

React 19, TypeScript 5.8, Vite 6, MUI 7, Zustand 5, CodeMirror 6, Fuse.js for the thesaurus search, Vitest for tests, TypeDoc for API docs, nginx-alpine for the production image.

## Thesaurus

The semantic tagging feature uses a hierarchical thesaurus index, loaded by a Web Worker at runtime. To rebuild it from the full JSON:

1. Place `thesaurus-full.json` in `public/`.
2. Run `npm run build:thesaurus`.
3. The output is `public/thesaurus-index.json`.
