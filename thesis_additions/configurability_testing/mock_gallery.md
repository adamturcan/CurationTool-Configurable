---
title: "Configurability Validation Gallery"
geometry: margin=1in
fontsize: 11pt
documentclass: article
colorlinks: true
header-includes:
 - \usepackage{float}
 - \let\origfigure\figure
 - \let\endorigfigure\endfigure
 - \renewenvironment{figure}[1][2]{\expandafter\origfigure\expandafter[H]}{\endorigfigure}
---

# Configurability Validation Gallery

This gallery documents the live reproduction of the three configurability dimensions reported in Section~5.4 of the thesis. Each screenshot was captured against a clean checkout of the source repository, brought up through the `docker-compose.postgres.yml` Compose file, with no application source code modified between dimensions. Screenshots are grouped by dimension.

UI evidence (editor and admin views) is paired with infrastructure evidence (terminal output from the running containers and the PostgreSQL database), so each claim can be verified at both layers.

## A. Setup

![`docker compose -f docker-compose.postgres.yml ps` after starting the reproduction stack: all five services (postgres, memorise-api, memorise-ui, legal-mock, medical-mock) come up under a single Compose file, with Postgres reporting `(healthy)`. The entire configurability validation runs from this one declarative artefact.](images/01-postgres-compose-ps.png){ width=100% }

## B. Dimension 1. Drop-In URL Replacement

![Admin Services panel before any reconfiguration. The four NLP endpoints (NER, Segmentation, Classification, Translation) point at the SDU upstream services (`*.dev.memorise.sdu.dk/...`) with the home adapters (`sdu-ner`, `sdu-segment`, `sdu-classify`, `sdu-translate`). All endpoints report `Up`. This is the Holocaust-testimony deployment baseline.](images/02-admin-panel-baseline-sdu.png){ width=100% }

![Same panel after a `PUT /api/config` issued from the admin UI. All four endpoints now point at `http://legal-mock:5001/...`; the adapter selection is *unchanged* (`sdu-ner` etc.). The mock mirrors the SDU upstream contract on a per-path and per-payload basis, so the home adapters consume its responses verbatim. A URL flip alone is therefore sufficient to retarget the platform onto a same-shape upstream.](images/03-admin-panel-legal-mock.png){ width=100% }

![Editor displaying the *Brown v. Board* excerpt with the six entities returned by the legal mock highlighted: `Brown v. Board` (ORG), `Justice Warren` (PERSON), `Equal Protection Clause` (LAW), `The Court` (ORG), `May 17, 1954` (DATE), `Plessy v. Ferguson` (LAW). The `LAW` tooltip is visible above `Equal Protection Clause`. The unmodified UI renders legal-domain NER results end-to-end after the URL flip.](images/04-editor-brown-v-board-ner.png){ width=100% }

![`docker compose ... logs legal-mock | tail -20` showing the inbound `POST /recognize` requests issued by `memorise-api` when the editor triggered NER, alongside the `HEAD` health probes from the admin panel and the `GET /supported_languages` request from the translation tab. The requests reached the SDU-shape mock at the SDU endpoint paths exactly as expected.](images/05-legal-mock-logs.png){ width=100% }

![Document Tags panel listing the three legal classification labels returned by `legal-mock /classify` for the same workspace: `constitutional law`, `civil rights`, `supreme court precedent`. The UI groups them under its existing thesaurus hierarchy (`beliefs > philosophical ideologies`); platform-side post-processing behaves identically regardless of the upstream service. Same demonstration as the NER captures above, applied to the classify endpoint.](images/05b-legal-tag-panel.png){ width=70% }

## C. Dimension 2. Shape-Translating Adapter

![Admin Services panel after a second `PUT /api/config`. The four NLP endpoints now target `http://medical-mock:5002/v2/...` paths (`clinical-entities`, `sectionize`, `categorise`, `translate-en-medical`) with adapter selection switched to `mock-medical`. All `Up` at sub-10 ms latency. The AdapterRegistry advertises both home and medical adapters; the swap is purely configuration, no rebuild.](images/06-admin-panel-medical-mock.png){ width=100% }

![Editor with the synthetic SOAP note rendered after NER and Classify ran against the medical mock. The three medical entities (`type 2 diabetes mellitus` DISEASE, `aspirin` MEDICATION, `metformin` MEDICATION) appear as inline highlights, with the `MEDICATION` tooltip visible. The Document Tags panel on the right shows the ICD-10 chapter `Endocrine, nutritional and metabolic diseases` and the subcategory `Type 2 diabetes mellitus` returned by `medical-mock /v2/categorise`. The medical adapter normalises a divergent upstream shape into the platform's internal value objects, end-to-end, without any UI change.](images/07a-editor-soap-medication-tags.png){ width=100% }

![Same workspace at higher zoom; the `DISEASE` tooltip above `type 2 diabetes mellitus` is fully legible.](images/07b-editor-soap-disease-zoom.png){ width=80% }

![`docker compose ... logs medical-mock | tail -20`. The inbound requests are `POST /v2/clinical-entities` and `POST /v2/categorise` — fundamentally different paths from the legal mock's `POST /recognize` and `/classify`. The platform spoke to the upstream over the new contract; the adapter bridged the gap.](images/08-medical-mock-logs.png){ width=100% }

\begin{figure}[H]
\centering
\begin{minipage}[t]{0.46\textwidth}
\centering
\includegraphics[width=\linewidth]{images/09a-shape-diff-top.png}
\end{minipage}\hfill
\begin{minipage}[t]{0.46\textwidth}
\centering
\includegraphics[width=\linewidth]{images/09b-shape-diff-bottom.png}
\end{minipage}
\caption{Raw response from \texttt{medical-mock /v2/clinical-entities} printed via \texttt{curl ... | jq}, split across two columns for legibility. The payload carries a \texttt{metadata} block, entity buckets keyed by \texttt{DISEASE} and \texttt{MEDICATION}, ICD-10 and RxNorm \texttt{codes}, structured \texttt{attributes} (dose, frequency, route), and per-entity \texttt{confidence}. The \texttt{MockMedicalNerAdapter} collapses this shape into the flat \texttt{\{start, end, entity, score\}} form consumed by the application layer (the upstream \texttt{type} field is renamed to \texttt{entity} during normalization).}
\end{figure}

## D. Dimension 3. Storage Adapter Swap

![`psql -c "SELECT key, url, adapter FROM endpoint_config;"` issued inside the running `postgres` container. Five rows: the four NLP endpoints (with `medical-mock` URLs and adapter `mock-medical`) plus the `translate-languages` helper. The endpoint configuration mutated by Dimensions 1 and 2 was persisted into a relational table by the `PostgresAdapter`, not into a JSON file — queryable through standard SQL tooling, with no application code aware of the swap.](images/10-psql-endpoint-config.png){ width=100% }

![`SELECT id, name, owner_id FROM workspaces;` showing five rows: the three platform-seeded workspaces (`Workspace A`, `Workspace B`, `Workspace C`, created by `WorkspaceApplicationService.seedForOwner` on first admin login) plus the two workspaces created during this reproduction (`Brown`, `medical`). All share the admin's UUID as `owner_id`. Workspace state, not just configuration, is materialised in Postgres.](images/11-psql-workspaces.png){ width=100% }

![Restart survival sequence captured top-to-bottom: (1) `psql` returns the medical-mock endpoint config (5 rows), (2) `docker compose ... down` removes the containers without `-v` so the volume is preserved, (3) `docker volume ls | grep postgres` shows `datacurationtool_postgres-data` still present, (4) `docker compose ... up -d` re-creates the containers, (5) `psql` after the restart returns identical 5 rows. The platform's persistent state is external, multi-process-safe, and survives container teardown without any application-side handling — the property §5.4.4 claims.](images/12-postgres-survival-restart.png){ width=80% }
