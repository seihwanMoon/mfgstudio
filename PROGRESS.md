# PROGRESS

> Rule: check this file before starting work, mark completed items with `[x]`, and record blockers under `Error Log`.
> Current status reflects the codebase as of 2026-03-13.

---

## Overall Progress

```text
SETUP      [ 5 / 5  ]
BACKEND    [ 28 / 28 ]
FRONTEND   [ 33 / 33 ]
MLOPS      [ 10 / 10 ]
TOTAL      [ 76 / 76 ]
```

All planned tasks are currently complete.

## Recent Updates

- 2026-03-13: expanded Korean UI cleanup across Tune, Finalize, MLflow, dashboard detail cards, and remaining shared navigation/layout surfaces.
- 2026-03-13: added native-first `interpret_model()` attempts for XAI `summary`, `dependence`, and `pfi`, while preserving explicit custom fallback responses when PyCaret native output is unavailable.
- 2026-03-13: rebuilt and revalidated Docker frontend/backend after localization and XAI changes; `/api/analyze/plot` now returns `200` again for repaired XAI requests.
- 2026-03-13: fixed automatic report generation failure by pinning `pydyf<0.11` for the `weasyprint==61.2` backend image.
- 2026-03-13: completed a real-model report smoke test (`model_id=665`) covering `meta -> generate -> download(PDF)` and localized the report template plus remaining compare/MLflow panels.
- 2026-03-13: enriched the PDF report from a flat text/table layout into an operations-style report with overview KPI cards, workflow steps, dataset profile, compare/tune summary, artifact inventory, and Korean narrative sections.
- 2026-03-13: re-normalized Finalize page strings and pipeline summary labels after discovering residual mojibake in the finalize flow.
- 2026-03-13: added `MLflow > 운영 관리` for experiment housekeeping and report management, including experiment archive, safe-delete gating, report list, report reopen, report regenerate, and report PDF deletion.
- 2026-03-13: localized MLflow tabs, experiment log view, experiment compare view, and run-status labels while wiring the new operations APIs.
- 2026-03-13: added a model retirement workflow that archives stage first and, when no prediction history exists, also removes the MLflow version link and finalized model artifact.
- 2026-03-13: added search and filter controls to `MLflow > 운영 관리` so large experiment/report lists can be narrowed by keyword and lifecycle state.
- 2026-03-13: added a retirement dry-run preview so operators can inspect cleanup actions and remaining experiment-delete blockers before running destructive model cleanup.
- 2026-03-13: added bulk operations for `MLflow > 운영 관리`, including filtered experiment archive and bulk PDF regeneration for missing reports.
- 2026-03-13: fixed XAI `summary`, `dependence`, and individual SHAP failures caused by SHAP/raw-pipeline schema mismatches.
- 2026-03-13: split the old Analyze flow into dedicated `Plots` and `XAI` workspaces.
- 2026-03-13: cleaned several mojibake-heavy navigation and XAI panel labels.
- 2026-03-13: reapplied Korean UI labels to the app shell, sidebar, header, and plots/XAI screens after an English regression and encoding corruption in the frontend layout files.

---

## Phase 0 - Environment Setup (SETUP)

### S-01: Project bootstrap
- [x] Create root workspace structure
- [x] Create `backend/`, `frontend/`, `data/`, `mlruns/`
- [x] Create `.gitignore`
- [x] Create `.env.example`

### S-02: Docker setup
- [x] Create `docker-compose.yml`
- [x] Create `backend/Dockerfile`
- [x] Create `frontend/Dockerfile`
- [x] Verify `docker compose up --build`

### S-03: Backend bootstrap
- [x] Create `backend/requirements.txt`
- [x] Create `backend/main.py`
- [x] Create `backend/database.py`
- [x] Create `backend/config.py`
- [x] Verify `GET /health`

### S-04: Frontend bootstrap
- [x] Create React + Vite frontend
- [x] Install Tailwind and base dependencies
- [x] Create Zustand store
- [x] Create Axios client
- [x] Verify Vite dev server

### S-05: MLflow connectivity
- [x] Verify MLflow server connectivity
- [x] Implement `backend/services/mlflow_service.py`
- [x] Implement and test `GET /api/mlflow/status`

---

## Phase 1 - Backend (BACKEND)

### B-01: Database models
- [x] Dataset model
- [x] Experiment model
- [x] TrainedModel model
- [x] Prediction model
- [x] Verify table creation

### B-02: Data API (`routers/data.py`)
- [x] `POST /api/data/upload`
- [x] `GET /api/data/{dataset_id}/preview`
- [x] `GET /api/data/{dataset_id}/quality`
- [x] `PATCH /api/data/{dataset_id}/columns`

### B-03: Real PyCaret service (`services/pycaret_service.py`)
- [x] Replace setup helper with real `setup()` integration
- [x] Replace compare helper with real `compare_models()` streaming integration
- [x] Replace tune helper with real `create_model()` + `tune_model()` flow
- [x] Replace plot helper with real `plot_model()` image generation
- [x] Replace SHAP helper with real model-based explanation output
- [x] Replace finalize helper with real `finalize_model()` + save flow
- [x] Replace single predict helper with real `predict_model()` flow
- [x] Replace batch predict helper with real `predict_model()` batch flow

### B-04: Training API (`routers/train.py`)
- [x] `POST /api/train/setup`
- [x] `GET /api/train/setup/{experiment_id}/code`
- [x] `POST /api/train/compare`
- [x] `GET /api/train/compare/{experiment_id}/stream`
- [x] `GET /api/train/models`
- [x] `POST /api/train/tune`
- [x] `GET /api/train/tune/{job_id}/stream`
- [x] `POST /api/train/finalize/{model_id}`

### B-05: Analyze API (`routers/analyze.py`)
- [x] `POST /api/analyze/plot`
- [x] `POST /api/analyze/interpret`
- [x] `GET /api/analyze/plots/list`

### B-06: Predict API (`routers/predict.py`)
- [x] `POST /api/predict/{model_name}`
- [x] `POST /api/predict/{model_name}/batch`
- [x] `GET /api/predict/history`
- [x] `GET /api/predict/history/{model_name}`

### B-07: MLflow registry API (`routers/registry.py`)
- [x] `POST /api/registry/register`
- [x] `GET /api/registry/models`
- [x] `GET /api/registry/{model_name}/versions`
- [x] `PUT /api/registry/{model_name}/stage`
- [x] `POST /api/registry/{model_name}/rollback`

### B-08: Dashboard API (`routers/dashboard.py`)
- [x] `GET /api/dashboard/models`
- [x] `GET /api/dashboard/stats`

---

## Phase 2 - Frontend (FRONTEND)

### F-01: Shared layout
- [x] Sidebar navigation
- [x] Header
- [x] App shell
- [x] Router setup

### F-02: Shared UI components
- [x] `Button.jsx`
- [x] `Badge.jsx`
- [x] `Field.jsx`
- [x] `Slider.jsx`
- [x] `ApiTag.jsx`
- [x] `CodeBlock.jsx`
- [x] `ProgressBar.jsx`
- [x] `Spinner.jsx`

### F-03: Charts
- [x] `RadarCompare.jsx`
- [x] `Sparkline.jsx`
- [x] `DriftGauge.jsx`
- [x] `OptunaScatter.jsx`
- [x] `ConfusionMatrix.jsx`

### F-04: Screen 1 - Home dashboard
- [x] `ModelCardGrid.jsx`
- [x] `ModelCard.jsx`
- [x] `ModelDetailPanel.jsx`
- [x] `StagingAlertBar.jsx`
- [x] `GET /api/dashboard/models` integration

### F-05: Screen 2 - Upload
- [x] `FileDropzone.jsx`
- [x] `DataQualitySummary.jsx`
- [x] `ColumnTypeTable.jsx`
- [x] `DataPreviewTable.jsx`
- [x] Upload + preview API integration

### F-06: Screen 3 - Setup
- [x] `ModuleSelector.jsx`
- [x] `BasicSettingsForm.jsx`
- [x] `PreprocessingForm.jsx`
- [x] `CodePreviewPanel.jsx`
- [x] `SetupResultToast.jsx`
- [x] Setup + generated code API integration

### F-07: Screen 4 - Compare
- [x] `CompareOptionsPanel.jsx`
- [x] `LeaderboardTable.jsx`
- [x] `useSSECompare.js`
- [x] `RadarCompare.jsx` integration
- [x] `MLflowRunLinks.jsx`
- [x] Compare API + SSE integration

### F-08: Screen 5 - Tune
- [x] `TuneOptionsPanel.jsx`
- [x] `ModelSelectFromCompare.jsx`
- [x] `OptunaScatterChart.jsx`
- [x] `useSSETune.js`
- [x] `TuneBeforeAfter.jsx`
- [x] `HyperparamsDiff.jsx`
- [x] Tune API + SSE integration

### F-09: Screen 6 - Analyze
- [x] `PlotSelector.jsx`
- [x] `PlotRenderArea.jsx`
- [x] `ShapWaterfall.jsx`
- [x] `ShapIndexSelector.jsx`
- [x] `TrainTestToggle.jsx`
- [x] Analyze API integration

### F-10: Screen 7 - Finalize
- [x] `SelectedModelCard.jsx`
- [x] Finalize action
- [x] `SaveModelForm.jsx`
- [x] `MLflowRegisterForm.jsx`
- [x] `StageManager.jsx`
- [x] `VersionTimeline.jsx`
- [x] `PipelineSummary.jsx`
- [x] Finalize + registry API integration

### F-11: Screen 8 - Predict
- [x] `ModelSelector.jsx`
- [x] `ThresholdSlider.jsx`
- [x] `SinglePredictForm.jsx`
- [x] `PredictResultCard.jsx`
- [x] `BatchUploadDropzone.jsx`
- [x] `BatchResultTable.jsx`
- [x] `PredictionHistory.jsx`
- [x] Single + batch predict API integration

### F-12: Screen 9 - MLflow management
- [x] `ExperimentLogTable.jsx`
- [x] `ExperimentCompareView.jsx`
- [x] `ModelRegistryList.jsx`
- [x] `ScheduleManager.jsx`
- [x] Registry + schedule API integration

---

## Phase 3 - MLOps (MLOPS)

### M-01: Drift monitoring
- [x] `services/drift_service.py`
- [x] `POST /api/drift/check/{model_name}`
- [x] Persist/update `TrainedModel.drift_score`
- [x] Connect drift score to dashboard model payload

### M-02: Automation scheduler
- [x] `services/scheduler.py`
- [x] Register weekly drift check job
- [x] Register retrain candidate scan job for high-drift models
- [x] `GET /api/schedule/jobs`

### M-03: PDF report
- [x] `services/report_service.py`
- [x] `backend/templates/report.html`
- [x] `GET /api/report/{model_id}`

---

## Completed Work Log

| Date | Work | Owner |
|------|------|-------|
| 2026-03-09 | Setup bootstrap, FastAPI/React foundations, dashboard/upload/setup/compare/tune flows, analyze/finalize/predict/registry/MLflow screens, drift/schedule/report backend, real PyCaret classification flow, and `PROGRESS.md` normalization | Codex |
| 2026-03-10 | Docker runtime verification completed, backend dependency alignment applied for PyCaret image builds, and Docker frontend host port shifted to `5173` to avoid Windows reserved port range conflicts | Codex |
| 2026-03-10 | Light/dark blue theme applied, CORS upload issue fixed, regression compare/tune flow corrected, compare recommendation and radar chart improved, and tune fallback changed to `scikit-learn` when Optuna is unavailable | Codex |
| 2026-03-10 | Analyze/XAI flow refined with module-aware plot lists, SHAP target leakage fixed, Korean matplotlib font handling added, and normalized feature labels introduced for plots and explanations | Codex |
| 2026-03-10 | Prediction flow changed to finalized-model-only selection, dynamic schema-based single prediction forms, registry/predict/home catalog filtering, and user-facing demo/test models hidden from dashboard, predict, and app MLflow pages | Codex |
| 2026-03-10 | App-side MLflow registry list filtered to versioned models only; actual MLflow server integration identified as the next architectural gap because the app UI and real MLflow UI are still only partially synchronized | Codex |
| 2026-03-10 | Real MLflow synchronization added for finalize/register/stage flows, `manufacturing_model` versions 1-3 were backfilled into the actual MLflow Registry, and `manufacturing_model v3` was promoted to `Production` in both app state and MLflow | Codex |
| 2026-03-10 | Added `NEXT_DEVELOPMENT_PLAN.md`, connected compare top-N selections and tune results to real MLflow runs, and confirmed `compare::...` / `tune::...` runs appear in the actual MLflow experiment history | Codex |
| 2026-03-10 | Fixed compare rerun so candidate rows no longer delete finalized/registered versions, restored `manufacturing_model v3`, and verified candidate rows and production registry rows can coexist for the same experiment | Codex |
| 2026-03-10 | Refined the in-app MLflow ops view by filtering PyCaret internal runs from experiment logs, converting visible timestamps to KST in the frontend, enriching experiment compare with latest metric tables, and localizing the schedule/registry panels | Codex |
| 2026-03-10 | Implemented PyCaret experiment persistence with `save_experiment()` / `load_experiment()`, cached compare/tuned model artifacts under `data/experiments/`, persisted context metadata to disk, and verified analyze/XAI still works after clearing in-memory contexts | Codex |
| 2026-03-10 | Replaced the fixed model list API with PyCaret bootstrap experiments so `GET /api/train/models` now reflects the actual installed estimator catalog for classification, regression, clustering, anomaly, and time series modules | Codex |
| 2026-03-13 | Split Analyze into `Plots` and `XAI`, added automatic report generation and Production-stage report refresh, repaired XAI for PyCaret pipelines, reintroduced Korean UI across updated flows, started native-first `interpret_model()` attempts with explicit fallback metadata, fixed the WeasyPrint/PyDyf PDF dependency break, and validated report generation against a real saved model | Codex |
| 2026-03-10 | Began PyCaret late-stage workflow expansion with `blend_models()`, `stack_models()`, and `automl()` candidate APIs, updated Tune/Finalize screens to surface generated candidates, rebuilt backend/frontend containers, and prepared handoff notes for the remaining MLflow blend-run termination issue | Codex |
| 2026-03-12 | Fixed blend-path MLflow lifecycle handling so new `blend::Blend Ensemble (2)` runs and internal `Voting Regressor` runs terminate cleanly, re-verified advanced candidate generation through the live API, and cleaned stale RUNNING blend-related runs from MLflow history | Codex |
| 2026-03-12 | Expanded the PyCaret model catalog API with estimator metadata (`id`, `reference`, `turbo`, `family`, `tags`), connected compare-screen family/scope filters to real `include` lists, rebuilt backend/frontend containers, and re-verified filtered compare execution with linear-regression-only runs | Codex |
| 2026-03-12 | Extended Analyze/XAI with separate diagnostic and XAI plot catalogs, cleaned analyze-screen copy/components, added backend-generated `summary` and `pfi` XAI images without new runtime dependency conflicts, and re-verified both XAI plot types through the live API | Codex |
| 2026-03-12 | Fixed analyze plot fallback for estimators without native feature importance, stabilized backend runtime by removing dev auto-reload in Docker, repaired multiple mojibake frontend screens, and stopped registry version lookups from firing on partial input values | Codex |
| 2026-03-12 | Added classification-specific PyCaret optimizations with `calibrate_model()` and binary-only `optimize_threshold()`, exposed them in the Tune screen, and verified both the multiclass guard (`400`) and binary threshold optimization success through live API smoke tests | Codex |
| 2026-03-12 | Added backend-generated `SHAP dependence` XAI plots, localized remaining Compare/Finalize/Analyze strings, surfaced candidate metadata (`operation`, `members`, `resolved_model_name`) in compare/finalize cards, and re-verified `POST /api/analyze/plot` for `plot_family=xai`, `plot_type=dependence` with a live `200` image response | Codex |
| 2026-03-12 | Added sample CSV datasets for classification, regression, clustering, anomaly, and time series testing under `data/samples/`, then validated module-specific setup flows against those files | Codex |
| 2026-03-12 | Fixed anomaly-module gaps by replacing unsupported `compare_models()` and `finalize_model()` calls with anomaly-compatible flows, disabled unsupported anomaly/clustering `tune_model()` in the UI, and stabilized anomaly analysis so `t-SNE` works while SHAP stays explicitly unavailable | Codex |
| 2026-03-12 | Fixed clustering compare by replacing unsupported `compare_models()` with sequential `create_model()` evaluation, repaired clustering analysis plots so `cluster`, `t-SNE`, and `elbow` all return PNG images, and cleared stale compare selections that blocked row selection in the UI | Codex |
| 2026-03-12 | Repaired prediction path recovery for finalized models, stabilized classification permutation importance, and restored several mojibake Analyze/Setup strings while keeping browser-extension `postMessage` errors documented as non-app noise | Codex |
| 2026-03-12 | Added time-series-specific setup handling by stripping unsupported tabular `setup()` parameters, auto-detecting datetime index columns, and returning `y_train`-based setup shape so the sample time-series setup path now succeeds with `TransformedTargetForecaster` | Codex |
| 2026-03-12 | Restored time-series compare by fixing estimator slug/file persistence for names with special characters, then verified `compare_models()` results for `STLF`, `Huber w/ Cond. Deseasonalize & Detrending`, `TBATS`, `ARIMA`, and `BATS` through the live SSE endpoint | Codex |
| 2026-03-12 | Added time-series-specific tuning by generating safe default `custom_grid` values for forecasting estimators, removed unsupported generic tune options from the PyCaret time-series path, and verified `/api/train/tune/55__STLF/stream` returns `200` with trial and done events | Codex |
| 2026-03-12 | Replaced time-series HTML-only analysis output with backend-generated PNG plots for `forecast`, `residuals`, `acf`, and `pacf`, normalized `PeriodIndex` handling for matplotlib, and verified all four plot endpoints return live `200` image responses | Codex |
| 2026-03-13 | Revalidated the full time-series path on a fresh experiment, fixed persisted-context reload issues so compare/tune/analyze/finalize all use the latest disk snapshot, and restored `forecast` / `residuals` API stability across repeated requests | Codex |
| 2026-03-13 | Switched time-series `forecast / residuals / acf / pacf` analysis views to PyCaret native plotly figures, added future-horizon expansion for forecast plots, and preserved PNG fallback for unsupported native cases | Codex |
| 2026-03-13 | Replaced the time-series residual view with a residual-only plotly chart because PyCaret's raw residual figure mixed actual values and residuals on the same axis, which was misleading in the app UI | Codex |
| 2026-03-13 | Rewrote `README.md` to reflect the real current state of the product, including module-by-module support, live MLflow integration, sample datasets, and the current next-step documentation set | Codex |
| 2026-03-13 | Added `IMPLEMENTATION_PLAN_PYCARET_NATIVE_REPORTS.md`, implemented automatic PDF generation on finalize, expanded report APIs with `meta` and `generate`, enriched report content with experiment/dataset/setup summary fields, and surfaced report access in the Finalize screen | Codex |
| 2026-03-13 | Added analyze response source metadata (`native_source`, `fallback_used`), enriched plot catalogs with native/fallback support metadata, refreshed the Analyze UI to show preferred vs actual rendering paths, and regenerated Production reports on stage changes / rollback | Codex |
| 2026-03-13 | Fixed tune SSE payload serialization so `NaN` / non-finite values are normalized before JSON emission, added frontend parse guards in `useSSETune.js`, and documented `/finalize` as the deploy-step route in the app shell | Codex |
| 2026-03-13 | Split Analyze into separate `Plots` and `XAI` screens, repaired XAI `summary` / `dependence` / individual SHAP for PyCaret pipeline models, then re-localized the app shell and analysis screens to Korean after the first refactor left menu labels in English and some files in mojibake | Codex |

---

## Error Log

### [2026-03-09] S-02 Docker runtime verification
Symptom: `docker compose up --build` is still not fully verified.

### [2026-03-10] P4 blend run termination
Symptom: `blend::Blend Ensemble (2)` may remain `RUNNING` in MLflow even after the API request returns successfully.
Status: resolved on 2026-03-12.
Cause: The first attempt was blocked by Docker engine unavailability, and the later attempt exposed backend dependency conflicts (`pycaret 3.3.2` with `pandas==2.2.1`, then `shap==0.49.1`).
Resolution: Docker engine is now running, and `backend/requirements.txt` was aligned to `pandas==2.1.4` and `shap==0.44.1`. Full rebuild still needs one uninterrupted retry.

### [2026-03-10] Docker frontend port binding on Windows
Symptom: `docker compose up --build -d` failed while binding frontend host port `3000`, and the same issue occurred on `3001`.
Cause: Windows reserved the `2981-3080` TCP range on this machine, so Docker could not expose the Vite container on those ports.
Resolution: The frontend Docker host port was moved to `5173`, backend CORS was updated to allow `http://localhost:5173`, and the full stack now starts successfully with backend `8000`, MLflow `5000`, and frontend `5173`.

### [2026-03-09] PDF smoke test warnings
Symptom: WeasyPrint emitted Fontconfig warnings during local PDF generation on Windows.
Cause: Local font configuration is incomplete in the current environment.
Resolution: PDF output was still generated successfully. Keep as a non-blocking environment warning unless rendering quality issues appear.

### [2026-03-10] App UI vs actual MLflow server mismatch
Symptom: The in-app MLflow management screen showed versioned models, but the real MLflow UI at `http://localhost:5000` remained empty.
Cause: The app had local DB-based registry/state handling, while real MLflow run logging and registry registration were not yet wired into the finalize/register flow.
Resolution: Resolved. Finalize now logs real MLflow runs, register/stage flows sync with real MLflow Registry, and a backfill script seeded the visible `manufacturing_model` versions into MLflow.

### [2026-03-12] Time-series compare/tune/analyze instability
Symptom: time-series `compare`, `tune`, and `analyze` flows initially failed across multiple browser runs.
Cause:
- compare failed because model artifact slugs did not safely handle estimator names with punctuation or `/`
- tune failed because `pycaret.time_series.tune_model()` does not accept the generic tabular `search_library` path and requires estimator-specific `custom_grid`
- analyze failed because PyCaret time-series plots were saved as `.html`, while the app expected PNG images, and matplotlib could not render raw `PeriodIndex` values directly
Resolution: resolved on 2026-03-12 by sanitizing time-series artifact slugs, adding a time-series-specific tuning branch with default `custom_grid` generation, and replacing HTML plot consumption with backend-generated PNG plots for `forecast`, `residuals`, `acf`, and `pacf`.

### [2026-03-13] Time-series plot mismatch with PyCaret native visuals
Symptom: time-series forecast and residual charts were technically working but did not match the shape and information density of PyCaret's own forecasting tutorial outputs.
Cause:
- the app was flattening time-series analysis into custom static plots
- PyCaret's native `residuals` plot also mixed actual values and residuals on one chart, which looked incorrect in the app
Resolution: Resolved on 2026-03-13 by switching `forecast / residuals / acf / pacf` to native plotly figures when available, extending forecast horizon for the "future forecast" mode, and replacing the residual screen with a residual-only chart for clearer interpretation.
