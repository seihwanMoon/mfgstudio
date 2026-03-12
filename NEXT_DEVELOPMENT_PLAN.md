# Next Development Plan

Last updated: 2026-03-12

## Goal

The next phase is to align the product more closely with the native PyCaret workflow and make the app-side operations view match real MLflow behavior more directly.

Reference workflow:

1. `setup()`
2. `compare_models()`
3. `tune_model()`
4. `blend_models()` / `stack_models()` / `automl()`
5. `plot_model()` / `interpret_model()` / `dashboard()`
6. `finalize_model()`
7. `save_model()` / registry / predict / monitoring

## Priority roadmap

### P1. Compare / Tune MLflow Alignment

Status: Completed on 2026-03-10

Current result:

- compare top-N candidates are logged to real MLflow runs
- tune results are linked to real MLflow run ids
- app-side MLflow view and real MLflow UI both show `compare::...` and `tune::...` runs

### P2. PyCaret Experiment Persistence

Status: Completed on 2026-03-10

Current result:

- experiment snapshots saved through `save_experiment()`
- experiment restore through `load_experiment()`
- cached model artifacts stored under `data/experiments/experiment_<id>/`
- analyze / XAI / finalize can recover after clearing in-memory context

### P3. Dynamic Model Catalog

Status: Completed on 2026-03-12

Current result:

- `GET /api/train/models` now uses PyCaret bootstrap experiments
- estimator lists are no longer tied to a tiny fixed hardcoded catalog
- richer estimator metadata is exposed:
  - `id`
  - `name`
  - `reference`
  - `turbo`
  - `family`
  - `tags`
- compare-screen filters now use catalog metadata for:
  - model scope (`all` / `turbo` / `full`)
  - model family (`linear`, `tree`, `boosting`, `ensemble`, etc.)

### P4. PyCaret Late-Stage Workflow Expansion

Status: In Progress

Current result:

- backend functions added for `blend_models()`, `stack_models()`, and `automl()`
- new APIs added:
  - `POST /api/train/ensemble`
  - `POST /api/train/automl`
- generated advanced candidates are inserted back into compare-result rows
- Tune page includes advanced PyCaret controls
- Finalize page can target generated candidate rows directly
- blend-path MLflow lifecycle was fixed on 2026-03-12 so new `blend::...` and internal `Voting Regressor` runs finish correctly

Remaining:

- validate stack/blend/automl UX polish in the Tune and Finalize screens
- decide whether advanced candidate rows need richer metadata in compare/finalize views

### P5. Analyze / XAI Enhancement

Status: In Progress

Scope:

- expand `interpret_model()`
- review `dashboard()` / `check_fairness()`
- extend beyond SHAP into more native PyCaret explainability

Current result:

- analyze plot catalog now separates:
  - diagnostic `plot_model()` options
  - XAI options
- analyze screen now supports XAI plot rendering for:
  - `summary`
  - `dependence`
  - `pfi`
- analyze page copy and selectors were cleaned up during the same pass
- compare/finalize views now surface richer candidate metadata:
  - `operation`
  - `members`
  - `resolved_model_name`

Remaining:

- add richer XAI variants beyond `summary` / `dependence` / `pfi`
- review whether `pdp` or fairness-related views should be added without destabilizing runtime dependencies

### P6. Classification-Specific Optimization

Status: In Progress

Scope:

- `calibrate_model()`
- `optimize_threshold()`

Current result:

- backend functions added for:
  - `calibrate_model()`
  - `optimize_threshold()`
- new API added:
  - `POST /api/train/classification-optimize`
- Tune screen now exposes classification-only advanced actions for:
  - `Calibrate Model`
  - `Optimize Threshold`
- threshold optimization is now guarded so it only runs for binary classification datasets
- multiclass requests return a clear `400` message instead of a generic `500`

Remaining:

- decide whether optimized threshold values themselves should be surfaced in the UI
- consider surfacing calibration / threshold method details more explicitly in the UI

### P7. MLflow Ops View Refinement

Status: Completed on 2026-03-10

Current result:

- app-side MLflow screen filters PyCaret internal noise runs
- KST formatting applied in the frontend
- experiment compare summary cards and metric table added
- schedule and registry wording cleaned up

## Execution order for the next session

1. Re-verify the full time-series workflow end-to-end after today's compare/tune/plot fixes
2. Continue Analyze / XAI enhancement
3. Polish advanced PyCaret candidate UX in Tune / Finalize
4. Surface classification optimization metadata more clearly
5. Decide whether time-series Tune / Analyze screens need forecasting-specific labels and controls

## Notes

- user-facing app catalog should continue to center on `manufacturing_model`
- browser `chrome-extension://... postMessage` errors are still treated as extension noise, not app errors
- time-series support now covers:
  - `setup()` with automatic datetime-index detection
  - `compare`
  - `tune` with forecasting-specific `custom_grid`
  - `forecast` / `residuals` / `acf` / `pacf` plot rendering
- before starting new work, re-check:
  - `git status --short`
  - `npm run build`
  - Python compile checks
  - `docker compose up --build -d`
