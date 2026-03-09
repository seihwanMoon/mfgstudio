# PROGRESS

> Rule: check this file before starting work, mark completed items with `[x]`, and record blockers under `Error Log`.
> Current status reflects the codebase as of 2026-03-10.

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

---

## Error Log

### [2026-03-09] S-02 Docker runtime verification
Symptom: `docker compose up --build` is still not fully verified.
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
