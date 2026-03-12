# HANDOFF

Last updated: 2026-03-12

## Summary

Recent work focused on the next PyCaret-aligned stage after `compare_models()` and `tune_model()`.

Implemented locally:

- backend support for `blend_models()`
- backend support for `stack_models()`
- backend support for `automl()`
- backend support for `calibrate_model()`
- backend support for binary-only `optimize_threshold()`
- candidate insertion back into compare-result rows
- Tune page controls for advanced PyCaret actions
- Finalize page selection support for generated candidates
- MLflow ops screen text cleanup and loading-state cleanup
- dynamic PyCaret model-catalog metadata and compare-screen family/scope filters
- analyze-screen cleanup with separate diagnostic and XAI plot groups
- backend XAI plot rendering for `summary` and `pfi`
- backend XAI plot rendering for `dependence`
- analyze `feature` plot fallback to `Permutation importance` for models without native importance attributes
- backend Docker runtime changed from `--reload` to stable non-reload mode
- compare/finalize cards now surface generated candidate metadata (`operation`, `members`, `resolved_model_name`)
- remaining mojibake strings cleaned up in compare/finalize/analyze support components

## Current local state

This handoff assumes the current blend-lifecycle fix and related documentation updates are committed locally.

Key files touched in this phase:

- [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
- [backend/services/mlflow_service.py](D:/GITHUB/mfgstudio/backend/services/mlflow_service.py)
- [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py)
- [frontend/src/pages/TunePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/TunePage.jsx)
- [frontend/src/pages/FinalizePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/FinalizePage.jsx)
- [frontend/src/pages/MLflowPage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/MLflowPage.jsx)

## Verified today

- `npm run build`
- Python compile checks:
  - [backend/services/mlflow_service.py](D:/GITHUB/mfgstudio/backend/services/mlflow_service.py)
  - [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
  - [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py)
- `docker compose up --build -d backend frontend`

## Recently resolved issue

The MLflow lifecycle issue on the blend path has been addressed.

Resolved state:

- new `blend::Blend Ensemble (2)` runs now finish as `FINISHED`
- internal `Voting Regressor` runs generated during blend are also terminated correctly
- old stale running blend-related runs were manually cleaned up in MLflow

What changed:

- backend now closes active local MLflow runs before logging its own run
- backend terminates recent RUNNING runs created during advanced PyCaret operations
- backend also terminates same-name stale RUNNING runs for blend/stack internal ensemble artifacts

## Recommended first steps tomorrow

1. `git status --short`
2. `docker compose up --build -d backend frontend`
3. continue with richer XAI variants beyond `summary` / `pfi`
4. polish advanced candidate UX in Tune / Finalize for calibration / threshold candidates
5. decide whether threshold values and calibration metadata should be surfaced in the UI
6. after implementation, run normal verification and commit

## Useful commands

```powershell
cd D:\GITHUB\mfgstudio
git status --short
docker compose up --build -d backend frontend
cd frontend
npm run build
cd ..
@'
import py_compile
py_compile.compile("backend/services/mlflow_service.py", doraise=True)
py_compile.compile("backend/services/pycaret_service.py", doraise=True)
py_compile.compile("backend/routers/train.py", doraise=True)
'@ | .\.venv\Scripts\python.exe -
```
