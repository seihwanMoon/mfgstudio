# HANDOFF

Last updated: 2026-03-12

## Summary

Recent work focused on broadening module coverage so the app works beyond basic classification/regression flows.

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
- sample CSV datasets for classification / regression / clustering / anomaly / time series were added under `data/samples/`
- anomaly compare/finalize now use module-compatible fallbacks instead of unsupported PyCaret calls
- anomaly/clustering tune is now blocked cleanly because PyCaret does not support `tune_model()` there
- clustering compare now uses sequential `create_model()` evaluation instead of unsupported `compare_models()`
- clustering analysis `cluster`, `t-SNE`, and `elbow` plots now all return PNG images
- time-series setup now strips unsupported tabular `setup()` parameters and auto-detects a datetime index column

## Current local state

This handoff assumes the latest local fixes are committed through:

- `07fa19a fix: stabilize clustering analysis plots`
- `89d6a84 fix: support timeseries setup flow`

Key files touched in this phase:

- [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
- [backend/services/mlflow_service.py](D:/GITHUB/mfgstudio/backend/services/mlflow_service.py)
- [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py)
- [frontend/src/pages/TunePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/TunePage.jsx)
- [frontend/src/pages/FinalizePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/FinalizePage.jsx)
- [frontend/src/pages/MLflowPage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/MLflowPage.jsx)
- [frontend/src/pages/AnalyzePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/AnalyzePage.jsx)
- [frontend/src/pages/SetupPage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/SetupPage.jsx)

## Verified today

- `npm run build`
- Python compile checks:
  - [backend/services/mlflow_service.py](D:/GITHUB/mfgstudio/backend/services/mlflow_service.py)
  - [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
  - [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py)
- `docker compose up --build -d backend frontend`
- anomaly compare / analyze / finalize smoke checks
- clustering compare / analyze smoke checks
- time-series sample dataset `setup()` smoke check:
  - result: `{"pipeline_steps":["TransformedTargetForecaster"],"transformed_shape":[29,1]}`

## Current blocker

Time-series compare is not finished.

Observed state:

- browser reports `GET /api/train/compare/53/stream 500`
- experiment `53` (`시계열1`) is stored as `compare_error`
- `GET /api/train/compare/53/result` returns `[]`
- backend logs confirm the `500`, but the exact exception still needs to be isolated cleanly from the streaming path

Context:

- time-series `setup()` is now fixed
- failure begins only after moving into compare
- current compare options on experiment `53` are still tabular-like:
  - `sort=MAE`
  - `n_select=3`
  - `log_experiment=true`
  - `log_plots=true`
- likely next fix is a time-series-specific compare path or a guarded restriction on unsupported compare options

## Recommended first steps tomorrow

1. `git status --short`
2. `docker compose up --build -d backend frontend`
3. reproduce the exact exception behind `GET /api/train/compare/53/stream`
4. fix time-series compare:
   - either implement a proper `pycaret.time_series.compare_models()` path
   - or return a clear `400` when the current UI requests an unsupported combination
5. re-test the full time-series path:
   - `setup`
   - `compare`
   - `analyze`
   - `finalize`
6. after the blocker is cleared, return to richer XAI variants and advanced candidate UX polish

## Useful commands

```powershell
cd D:\GITHUB\mfgstudio
git status --short
docker compose up --build -d backend frontend
@'
import requests
r = requests.get("http://localhost:8000/api/train/compare/53/result", timeout=10)
print(r.status_code, r.text)
'@ | python -
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
