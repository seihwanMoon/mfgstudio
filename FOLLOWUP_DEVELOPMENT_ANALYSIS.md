# Follow-up Development Analysis

Last updated: 2026-03-17

## Baseline

The project now has:

- PyCaret-centered `setup -> compare -> tune -> finalize -> predict`
- split `Plots` and `XAI` workspaces
- native-first XAI policy metadata
- experiment-level XAI observation matrix derived from cached artifacts
- report chart cache and XAI snapshot cache with retention and manual cleanup
- MLflow fail-fast read paths plus local fallback visibility
- automatic and regeneratable PDF reports

This means the next phase should focus less on adding new top-level screens and more on turning current heuristics into durable operational metadata.

## Recommended order

1. Replace cache-derived XAI observations with a broader execution success log
2. Persist MLflow sync state as first-class model metadata
3. Expand artifact/report lifecycle into a consistent artifact registry
4. Finish mixed-language cleanup and source-level mojibake normalization
5. Add repeatable smoke tests for the new ops/report/XAI paths

## P1. XAI Success Log

### Why

Current `effective_support_level` is derived from cached artifacts. That is useful, but it only reflects:

- requests that produced cacheable image outputs
- requests made for specific experiment/model combinations
- paths that reached the caching layer

It does not capture:

- native attempt failures that never produced output
- environment/package failures over time
- per-estimator stability across multiple experiments

### Target

Introduce an execution log that records every XAI request outcome:

- experiment id
- model id
- algorithm
- plot type
- requested mode (`train` / `test`)
- native attempted?
- native succeeded?
- fallback used?
- final render mode
- failure reason if any
- created at

### Suggested implementation

Backend:

- add a DB model such as `XAIExecutionLog`
- write to it inside [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py) from `get_interpret_plot()`
- expose aggregate endpoints from [backend/routers/analyze.py](D:/GITHUB/mfgstudio/backend/routers/analyze.py)

Frontend:

- keep the current cache-based matrix as a fallback only
- switch [frontend/src/components/analyze/XaiPolicyMatrix.jsx](D:/GITHUB/mfgstudio/frontend/src/components/analyze/XaiPolicyMatrix.jsx) to aggregated log data

### Validation

- repeated native failures should still appear in the matrix
- a successful uncached native path should count immediately
- the matrix should survive cache cleanup because it no longer depends on cache files

## P2. Persist MLflow Sync State

### Why

The current UI infers fallback state from `mlflow_run_id.startswith("local-")`. That is operationally useful, but not complete enough for debugging.

### Target

Persist explicit sync metadata on each trained model:

- `mlflow_synced`
- `mlflow_sync_state`
- `mlflow_sync_error`
- `mlflow_last_sync_at`

### Suggested implementation

Backend:

- extend [backend/models/trained_model.py](D:/GITHUB/mfgstudio/backend/models/trained_model.py)
- initialize/update fields from [backend/services/mlflow_service.py](D:/GITHUB/mfgstudio/backend/services/mlflow_service.py), [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py), and [backend/routers/registry.py](D:/GITHUB/mfgstudio/backend/routers/registry.py)
- update [backend/routers/ops.py](D:/GITHUB/mfgstudio/backend/routers/ops.py) to return stored sync metadata instead of inference

Frontend:

- surface state consistently in [frontend/src/pages/FinalizePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/FinalizePage.jsx) and [frontend/src/pages/MLflowPage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/MLflowPage.jsx)

### Validation

- disconnect MLflow and finalize/register a model
- reconnect MLflow and retry
- ensure the sync state and last error are visible and updated

## P3. Artifact Registry Layer

### Why

Artifacts are now stored in several useful places, but discovery is still mostly path-driven:

- report PDFs
- report-safe chart cache
- XAI snapshot cache
- model files

### Target

Add a lightweight artifact index so the app knows what artifacts exist without scanning paths every time.

Suggested fields:

- artifact type
- model id / experiment id
- relative path
- source (`native`, `fallback`, `cache`)
- signature
- created at
- last validated at

### Suggested implementation

- start with report charts and XAI snapshots only
- build on [backend/services/artifact_cache.py](D:/GITHUB/mfgstudio/backend/services/artifact_cache.py)
- expose read-only summaries in [backend/routers/ops.py](D:/GITHUB/mfgstudio/backend/routers/ops.py)

### Validation

- report regeneration should reuse indexed artifacts
- cleanup should remove stale index rows
- operations UI should be able to list artifact counts without expensive scans

## P4. Localization / Source Cleanup

### Why

The app UI is mostly Korean again, but several source files still display mojibake in terminal output. Even if runtime rendering is acceptable, source-level corruption slows maintenance and increases patch risk.

### Target

- normalize remaining layout/MLflow/analyze source files to clean UTF-8 Korean or ASCII-only text where practical
- remove duplicate English/Korean drift in docs

### Likely files

- [frontend/src/components/mlflow/ExperimentLogTable.jsx](D:/GITHUB/mfgstudio/frontend/src/components/mlflow/ExperimentLogTable.jsx)
- [backend/templates/report.html](D:/GITHUB/mfgstudio/backend/templates/report.html)
- [HANDOFF.md](D:/GITHUB/mfgstudio/HANDOFF.md)
- [NEXT_DEVELOPMENT_PLAN.md](D:/GITHUB/mfgstudio/NEXT_DEVELOPMENT_PLAN.md)

### Validation

- browser spot-check: `/plots`, `/xai`, `/finalize`, `/mlflow`
- PDF spot-check after regeneration
- terminal `Get-Content` may still be unreliable on Windows, so verify through runtime outputs and editor file encoding too

## P5. Automated Smoke Tests

### Why

Current verification is strong but manual:

- `py_compile`
- `npm run build`
- ad hoc TestClient calls

That is enough during exploration, but not enough for frequent refactors.

### Target

Create a small smoke suite covering:

- `GET /api/analyze/xai/matrix`
- `GET /api/ops/cache-status`
- `POST /api/ops/cache-cleanup`
- `POST /api/analyze/plot` for one saved model
- report generation for at least one saved model

### Suggested implementation

- a small script or pytest module under `backend/tests/`
- use the project `.venv` and local SQLite DB
- keep assertions structural, not pixel-perfect

### Validation

- tests pass on the current saved-model dataset
- failures clearly point to endpoint/schema regressions

## Practical next session start

If work resumes later, start in this order:

1. inspect [HANDOFF.md](D:/GITHUB/mfgstudio/HANDOFF.md)
2. run `git status --short`
3. run `python -m py_compile backend/services/pycaret_service.py backend/routers/analyze.py backend/routers/ops.py`
4. run `npm run build --prefix frontend`
5. implement `P1 XAIExecutionLog`

## Notes

- do not touch untracked `logs.log` unless explicitly requested
- current worktree before commit includes substantial backend/frontend/doc changes from this session
- the most valuable structural improvement now is replacing cache-derived observations with durable execution history
