# HANDOFF

Last updated: 2026-03-12

## Summary

Recent work focused on broadening PyCaret module coverage so classification, regression, clustering, anomaly detection, and time-series flows all work with the sample datasets.

Implemented locally:

- backend support for `blend_models()`
- backend support for `stack_models()`
- backend support for `automl()`
- backend support for `calibrate_model()`
- backend support for binary-only `optimize_threshold()`
- dynamic PyCaret model-catalog metadata and compare-screen family/scope filters
- compare/finalize cards now surface generated candidate metadata (`operation`, `members`, `resolved_model_name`)
- analyze-screen cleanup with separate diagnostic and XAI plot groups
- backend XAI plot rendering for `summary`, `dependence`, and `pfi`
- sample CSV datasets for classification / regression / clustering / anomaly / time series under `data/samples/`
- anomaly compare/finalize now use module-compatible fallbacks instead of unsupported PyCaret calls
- anomaly/clustering tune is blocked cleanly because PyCaret does not support `tune_model()` there
- clustering compare now uses sequential `create_model()` evaluation instead of unsupported `compare_models()`
- clustering analysis `cluster`, `t-SNE`, and `elbow` plots now return PNG images
- time-series setup now strips unsupported tabular `setup()` parameters and auto-detects a datetime index column
- time-series compare now works with safe artifact/model slugs for estimator names with punctuation
- time-series tune now uses forecasting-specific default `custom_grid` generation instead of unsupported generic tabular tune options
- time-series analysis `forecast`, `residuals`, `acf`, and `pacf` now render backend-generated PNG images

## Current local state

This handoff assumes the latest local fixes are committed through:

- `1e43082 fix: restore timeseries compare flow`
- `e017e3a fix: support timeseries tuning and plots`

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
- time-series sample dataset `compare()` smoke check:
  - `GET /api/train/compare/53/stream` -> `200`
- time-series sample dataset `tune_model()` smoke check:
  - `GET /api/train/tune/55__STLF/stream` -> `200`
- time-series analyze plot smoke checks:
  - `forecast` -> `200`
  - `residuals` -> `200`
  - `acf` -> `200`
  - `pacf` -> `200`

## Current focus

There is no open sample-flow blocker right now. The next session should move back to polish and PyCaret alignment work.

Recommended focus areas:

- polish time-series UI copy so forecasting-specific behavior is clearer in Tune and Analyze
- continue XAI expansion beyond `summary`, `dependence`, and `pfi`
- improve advanced candidate UX for `blend`, `stack`, `automl`, `calibrate`, and `threshold`
- clean remaining mixed-language or mojibake labels in Tune / Analyze / Finalize

## Recommended first steps tomorrow

1. `git status --short`
2. `docker compose up --build -d backend frontend`
3. re-test the full time-series path once:
   - `setup`
   - `compare`
   - `tune`
   - `analyze`
   - `finalize`
4. continue richer XAI variants and advanced candidate UX polish
5. decide whether time-series screens need forecasting-specific control labels instead of generic tabular tuning labels

## Useful commands

```powershell
cd D:\GITHUB\mfgstudio
git status --short
docker compose up --build -d backend frontend
@'
import requests
for url in [
    "http://localhost:8000/api/train/compare/53/result",
    "http://localhost:8000/api/train/tune/55__STLF/stream",
]:
    r = requests.get(url, timeout=10)
    print(url, r.status_code)
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
