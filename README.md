# CurationTool-Configurable

Bachelor's thesis project at Charles University, Faculty of Mathematics and Physics (MFF UK).

A text curation tool for NLP-assisted annotation of Holocaust testimonies, built as part of the [Memorise](https://memorise.sdu.dk/about-memorise/) digital humanities initiative and extended into a configurable platform whose persistence backend, NLP service endpoints, NLP adapters, and entity palette can each be swapped without rebuilding the client. The repository contains the frontend editor, the optional backend, the bundled mock NLP services, the design artefacts, the thesis supporting materials, and the landing-site source for the GitHub Pages deployment.

## What is in this repository

### Application code

* `memorise-ui/`: React + TypeScript frontend (Vite). See `memorise-ui/README.md` for the architecture notes.
* `server/`: Express + TypeScript backend. Handles login, workspace storage (JSON file or Postgres), and proxies requests to the configured NLP services through pluggable adapters.
* `mocks/`: two small mock NLP services used to demonstrate the configurability claim:
  * `legal-mock-sdu/` reuses the SDU adapter shapes with legal-domain content.
  * `medical-mock-clinical/` exposes an intentionally divergent shape, paired with the `MockMedical*` adapters in the server.

### Deployment

* `docker-compose.yml`: client + server with JSON file storage.
* `docker-compose.postgres.yml`: client + server + Postgres + both mock NLP services.
* `docker-compose.standalone.yml`: client only, no backend, everything stored in `localStorage`.
* `.github/workflows/deploy.yml`: CI pipeline (type-check, lint, test, build, render landing site, deploy to GitHub Pages).

### Design artefacts (`architecture/`)

* `architecture/c4/`: C4 model in Structurizr DSL plus rendered PNGs (system landscape, containers, frontend, backend).
* `architecture/domain/`: UML domain model in PlantUML plus rendered PNG.
* `architecture/use-case/`: formal use-case specifications (`use_cases.md` and the rendered `use_cases.pdf`) and the supporting use-case and activity diagrams.
* `architecture/wireframes/`: low-fidelity wireframes used during stakeholder review.

### Thesis supporting materials (`thesis_additions/`)

* `thesis_additions/guide/`: end-user guide for the curation workflow with screenshots (`user_guide.md`, `user_guide.pdf`).
* `thesis_additions/testing/`: stakeholder testing companion: the test guide handed to consortium reviewers, the example transcript, and the aggregate results summary.
* `thesis_additions/configurability_testing/`: mock-adapter gallery documenting the configurability validation with screenshots from the medical and legal mock deployments.

### Landing site (`landing/`)

* `landing/index.html`: the project landing page that aggregates the live application, programmer documentation, stakeholder testing materials, and design artefacts. Hosted at the root of the GitHub Pages deployment.
* `landing/build.sh`: pandoc-driven script that renders the markdown sources from `architecture/` and `thesis_additions/` into the static HTML pages under `landing/`. Re-run after any markdown source change. Requires pandoc (`brew install pandoc`).
* `landing/style.css`: shared stylesheet for the landing site.

## Getting started

### Standalone, no backend

The simplest way to run the tool. Workspaces live in `localStorage` and there is no login.

```bash
cd memorise-ui
npm install
npm run dev
```

The dev server opens at `http://localhost:5173/CurationTool-Configurable/app/`. The subpath matches the GitHub Pages deployment; set `VITE_BASE_PATH=/` in `memorise-ui/.env` if you want it on the root path.

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

Add `VITE_BACKEND_URL=http://localhost:3001` to `memorise-ui/.env` so the frontend points at the local server. On the first run the server seeds an admin user; log in with username `admin` and password `admin` (override the password with `ADMIN_PASSWORD`).

### With the mock NLP services

To demonstrate swapping the upstream NLP provider, also start one of the mocks:

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
docker compose -f docker-compose.postgres.yml up   # client + server + Postgres + mocks
docker compose -f docker-compose.standalone.yml up # client only
```

The app is then available at `http://localhost:3000`.

## Rebuilding the landing site

The landing site is rendered from the markdown sources in `architecture/` and `thesis_additions/` by `landing/build.sh`. Run it whenever those sources change:

```bash
brew install pandoc      # one-time, if not already installed
bash landing/build.sh
```

Output lands under `landing/` (rendered HTML pages, copied images, mirrored PDFs and source artefacts). Preview locally with `python3 -m http.server --directory landing 8080`.

## CI / deployment

`.github/workflows/deploy.yml` runs on every push and PR to `main`:

1. Type-check (`tsc --noEmit`)
2. Lint (`eslint`)
3. Test (`vitest`)
4. Build the SPA (Vite production build with `VITE_BASE_PATH=/CurationTool-Configurable/app/`)
5. Build the TypeDoc API reference
6. Render the landing site through pandoc
7. Assemble the Pages artefact: landing at the root, SPA at `/app/`, TypeDoc at `/docs/`
8. Deploy to GitHub Pages on `main`

The deployed site layout is:

| Path | Content |
|---|---|
| `/` | Landing page (`landing/index.html`) |
| `/app/` | The standalone-mode SPA |
| `/docs/` | TypeDoc API reference |
| `/testing/guide/` | Stakeholder testing companion |
| `/testing/results/` | Aggregate testing results |
| `/user-guide/` | End-user guide |
| `/use-cases/` | Use-case specifications |
| `/architecture/` | Architecture overview (C4, domain, wireframes) |
| `/configurability/` | Mock-adapter gallery |
| `/downloads/` | PDF mirrors and source artefacts (DSL, UML) |

The live deployment is at <https://adamturcan.github.io/CurationTool-Configurable/>.

---

Author: **Adam Turčan** (<adam.turcan@drake.sk>). Bachelor's thesis at Charles University in Prague, Faculty of Mathematics and Physics (MFF UK), developed in collaboration with the [Memorise](https://memorise.sdu.dk/about-memorise/) digital humanities project.
