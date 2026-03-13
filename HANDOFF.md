# HANDOFF

Last updated: 2026-03-13

## Summary

The project is currently in a `PyCaret-native-first cleanup + automatic reporting + plots/XAI split` phase.

Latest completed work:

- automatic PDF report generation after `finalize`
- report API expansion with `meta` and `generate`
- Finalize UI report link exposure
- analyze payload metadata with `native_source` and `fallback_used`
- plot catalog metadata describing native-first vs fallback intent
- Production stage / rollback report refresh
- XAI `summary`, `dependence`, and individual SHAP repaired for PyCaret pipeline models
- native-first `interpret_model()` attempts added for `summary`, `dependence`, and `pfi`, with graceful fallback when PyCaret native output is unavailable
- the old Analyze screen split into separate `Plots` and `XAI` routes
- app shell, sidebar, header, plots/XAI, Tune, Finalize, MLflow, and remaining high-traffic panels re-localized to Korean after the route split
- automatic report generation repaired by pinning `pydyf<0.11` alongside `weasyprint==61.2`
- real-model report smoke test completed for `model_id=665` with successful `meta`, `generate`, and PDF download responses
- PDF report content expanded with KPI overview cards, workflow chips, dataset column profile, compare/tune summary, and artifact inventory
- Finalize page and pipeline summary copy re-normalized to Korean
- `MLflow` page now includes an `운영 관리` tab for experiment archive/delete safety checks and report management
- report files can now be reopened, regenerated, and deleted from the management UI; experiments can be archived and only non-operational experiments are hard-deletable
- `은퇴 정리` now exists for registered/finalized models; it archives the stage first and conditionally cleans MLflow version + model artifact when prediction history is absent

## Current working tree

Main files touched in the latest cycle:

- [IMPLEMENTATION_PLAN_PYCARET_NATIVE_REPORTS.md](D:/GITHUB/mfgstudio/IMPLEMENTATION_PLAN_PYCARET_NATIVE_REPORTS.md)
- [backend/services/report_service.py](D:/GITHUB/mfgstudio/backend/services/report_service.py)
- [backend/routers/report.py](D:/GITHUB/mfgstudio/backend/routers/report.py)
- [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py)
- [backend/routers/registry.py](D:/GITHUB/mfgstudio/backend/routers/registry.py)
- [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
- [backend/templates/report.html](D:/GITHUB/mfgstudio/backend/templates/report.html)
- [frontend/src/App.jsx](D:/GITHUB/mfgstudio/frontend/src/App.jsx)
- [frontend/src/pages/AnalyzePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/AnalyzePage.jsx)
- [frontend/src/pages/PlotsPage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/PlotsPage.jsx)
- [frontend/src/pages/XAIPage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/XAIPage.jsx)
- [frontend/src/components/analyze/PlotSelector.jsx](D:/GITHUB/mfgstudio/frontend/src/components/analyze/PlotSelector.jsx)
- [frontend/src/components/analyze/PlotRenderArea.jsx](D:/GITHUB/mfgstudio/frontend/src/components/analyze/PlotRenderArea.jsx)
- [frontend/src/components/analyze/ShapIndexSelector.jsx](D:/GITHUB/mfgstudio/frontend/src/components/analyze/ShapIndexSelector.jsx)
- [frontend/src/components/analyze/ShapWaterfall.jsx](D:/GITHUB/mfgstudio/frontend/src/components/analyze/ShapWaterfall.jsx)
- [frontend/src/components/layout/AppShell.jsx](D:/GITHUB/mfgstudio/frontend/src/components/layout/AppShell.jsx)
- [frontend/src/components/layout/Sidebar.jsx](D:/GITHUB/mfgstudio/frontend/src/components/layout/Sidebar.jsx)
- [frontend/src/components/layout/Header.jsx](D:/GITHUB/mfgstudio/frontend/src/components/layout/Header.jsx)
- [frontend/src/pages/TunePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/TunePage.jsx)
- [frontend/src/components/tune/TuneOptionsPanel.jsx](D:/GITHUB/mfgstudio/frontend/src/components/tune/TuneOptionsPanel.jsx)
- [frontend/src/components/tune/ModelSelectFromCompare.jsx](D:/GITHUB/mfgstudio/frontend/src/components/tune/ModelSelectFromCompare.jsx)
- [frontend/src/components/tune/TuneBeforeAfter.jsx](D:/GITHUB/mfgstudio/frontend/src/components/tune/TuneBeforeAfter.jsx)
- [frontend/src/components/tune/HyperparamsDiff.jsx](D:/GITHUB/mfgstudio/frontend/src/components/tune/HyperparamsDiff.jsx)
- [frontend/src/pages/FinalizePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/FinalizePage.jsx)
- [frontend/src/components/finalize/SaveModelForm.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/SaveModelForm.jsx)
- [frontend/src/components/finalize/MLflowRegisterForm.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/MLflowRegisterForm.jsx)
- [frontend/src/components/finalize/PipelineSummary.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/PipelineSummary.jsx)
- [frontend/src/components/finalize/SelectedModelCard.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/SelectedModelCard.jsx)
- [frontend/src/components/finalize/StageManager.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/StageManager.jsx)
- [frontend/src/components/finalize/VersionTimeline.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/VersionTimeline.jsx)
- [frontend/src/pages/MLflowPage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/MLflowPage.jsx)
- [frontend/src/components/mlflow/ExperimentCompareView.jsx](D:/GITHUB/mfgstudio/frontend/src/components/mlflow/ExperimentCompareView.jsx)
- [frontend/src/components/mlflow/ExperimentLogTable.jsx](D:/GITHUB/mfgstudio/frontend/src/components/mlflow/ExperimentLogTable.jsx)
- [frontend/src/components/mlflow/ModelRegistryList.jsx](D:/GITHUB/mfgstudio/frontend/src/components/mlflow/ModelRegistryList.jsx)
- [frontend/src/components/mlflow/ScheduleManager.jsx](D:/GITHUB/mfgstudio/frontend/src/components/mlflow/ScheduleManager.jsx)

## Verified

- `python -m py_compile backend/services/report_service.py backend/routers/report.py backend/routers/train.py backend/services/pycaret_service.py`
- `python -m py_compile backend/routers/ops.py backend/main.py`
- `npm run build`
- `docker compose up --build -d backend frontend`
- direct API validation:
  - `POST /api/analyze/plot` returns `200` for `summary`, `dependence`, and `pfi`
  - `POST /api/analyze/interpret` returns `200` for individual SHAP
  - `GET /api/report/665/meta` returns `200`
  - `POST /api/report/665/generate` returns `200`
  - `GET /api/report/665` returns `200` with `application/pdf`
  - regenerated enriched PDF for `model_id=665`; response size increased to roughly `100 KB`, confirming the richer template is being used
  - `GET /api/ops/experiments` returns `200`
  - `GET /api/ops/reports` returns `200`
  - local/runtime checks confirmed `MlflowClient` exposes `delete_model_version` and `delete_registered_model` for the retirement workflow
- frontend container content validation:
  - `frontend/src/components/layout/AppShell.jsx`
  - `frontend/src/components/layout/Sidebar.jsx`
  - `frontend/src/components/layout/Header.jsx`
  now contain Korean labels inside the running container

Runtime caveat:

- native `interpret_model()` still falls back for some estimators or environments because PyCaret restricts certain plots and `pfi` depends on `interpret_community`
- the report flow was validated against an existing saved model, but `finalize -> auto-generate` still should be rechecked once a newly finalized model is created in this session
- retirement endpoints were validated non-destructively; no real registered version or finalized artifact was retired during verification in this session

## Current focus

1. Continue reducing custom XAI behavior where `interpret_model()` is viable.
2. Smoke-test `finalize -> report generate -> report download -> Production refresh` with a newly finalized model in-session.
3. Keep fallback paths explicit and visible in API responses and UI.
4. Enrich reports with persisted analyze artifacts or static plot snapshots after artifact storage is stabilized.
5. Clean up the last mixed-language and mojibake UI copy outside the refreshed high-traffic flows.

## Recommended next steps

1. Verify `/plots`, `/xai`, `/tune`, `/finalize`, and the left navigation in the browser after a hard refresh.
2. Run a fresh classification or regression experiment through `finalize`.
3. Confirm the generated PDF opens from both the Finalize screen and `MLflow > 운영 관리`.
4. Promote the model to `Production` and verify report refresh on stage change.
5. Decide which XAI options can realistically move to `interpret_model()` next.

## Useful commands

```powershell
cd D:\GITHUB\mfgstudio
git status --short
npm run build --prefix frontend
@'
import py_compile
for path in [
    r"backend/services/report_service.py",
    r"backend/routers/report.py",
    r"backend/routers/train.py",
    r"backend/services/pycaret_service.py",
]:
    py_compile.compile(path, doraise=True)
    print("OK", path)
'@ | python -

docker compose up --build -d backend frontend
```
