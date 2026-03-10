# HANDOFF

Last updated: 2026-03-10

## Current code state

- User-facing catalog has been normalized to `manufacturing_model` only.
- Home dashboard, predict page, and in-app MLflow page all use the same filtered catalog logic.
- Theme, XAI flow, SHAP, Korean plotting, and prediction schema handling have been updated after the original MVP completion.
- Working tree is being advanced beyond the old Docker-complete milestone; do not rely on older handoff notes or older pushed commits.

## What is verified

- `docker compose up --build -d`
- Frontend: `http://localhost:5273`
- Backend health: `http://localhost:8000/health`
- MLflow UI: `http://localhost:5000`
- `npm run build`
- Python compile checks for updated backend modules
- Real PyCaret flow for upload, setup, compare, tune, analyze, finalize, register, and predict

## Important runtime facts

- Browser console `chrome-extension://... postMessage` errors reported by the user were traced to a browser extension, not this app.
- Current visible production-style catalog was intentionally reduced so demo/sample models no longer appear in:
  - home dashboard
  - predict model dropdown
  - app-side MLflow management page

## Recent major fixes

### UX and flow

- Blue light/dark theme added
- Upload CORS issue fixed
- Regression compare/tune flow corrected
- Compare recommendation badge and radar chart improved
- Predict form changed from static sample fields to real model-schema-driven inputs

### Analyze / XAI

- Plot options now depend on module type
- SHAP target leakage bug fixed
- Korean column names normalized
- matplotlib Korean font fallback configured

### Catalog / operations

- Finalized-model-only prediction selection
- User-facing demo/test models hidden
- Home/dashboard numbers aligned to active catalog entries
- App-side MLflow registry view filtered to versioned models only

## Current architectural state

The major MLflow gap has been closed.

Current reality:

- `finalize_model()` writes a real MLflow run
- `register` creates a real MLflow registered model version
- `stage/rollback` sync to real MLflow Registry
- Existing `manufacturing_model` versions were backfilled into MLflow
- `manufacturing_model v3` is now `Production`

Remaining next target:

1. Compare / tune 단계의 run ID를 실제 MLflow run과 더 정밀하게 연결
2. 앱 내부 MLflow 비교 화면을 실제 experiment/run 기준으로 확장
3. 운영 리포트와 drift 결과를 실제 MLflow artifact/tag와 더 강하게 연결

## Files most relevant for the next step

- [backend/services/mlflow_service.py](D:/GITHUB/mfgstudio/backend/services/mlflow_service.py)
- [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
- [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py)
- [backend/routers/registry.py](D:/GITHUB/mfgstudio/backend/routers/registry.py)
- [backend/services/model_catalog_service.py](D:/GITHUB/mfgstudio/backend/services/model_catalog_service.py)
- [PROGRESS.md](D:/GITHUB/mfgstudio/PROGRESS.md)

## Recommended immediate action

Continue with MLflow observability refinement and then verify:

```powershell
cd D:\GITHUB\mfgstudio
docker compose up --build -d
```

After implementation, verify both:

- app-side MLflow page
- real MLflow UI at `http://localhost:5000`
