# Next Development Plan

Last updated: 2026-03-10

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

Status: In Progress

Current result:

- `GET /api/train/models` now uses PyCaret bootstrap experiments
- estimator lists are no longer tied to a tiny fixed hardcoded catalog

Remaining:

- expose richer estimator metadata
- connect metadata to compare-screen filters

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

Current blocker:

- `blend::Blend Ensemble (2)` may remain `RUNNING` in MLflow
- an internal `Voting Regressor` MLflow run may also remain `RUNNING`
- build, compile, and Docker rebuild all pass, but this MLflow lifecycle issue is still open

### P5. Analyze / XAI Enhancement

Status: Planned

Scope:

- expand `interpret_model()`
- review `dashboard()` / `check_fairness()`
- extend beyond SHAP into more native PyCaret explainability

### P6. Classification-Specific Optimization

Status: Planned

Scope:

- `calibrate_model()`
- `optimize_threshold()`

### P7. MLflow Ops View Refinement

Status: Completed on 2026-03-10

Current result:

- app-side MLflow screen filters PyCaret internal noise runs
- KST formatting applied in the frontend
- experiment compare summary cards and metric table added
- schedule and registry wording cleaned up

## Execution order for the next session

1. Fix blend-path MLflow run termination
2. Re-verify `blend / stack / automl`
3. Expand dynamic model-catalog metadata
4. Move to Analyze / XAI enhancement

## Notes

- user-facing app catalog should continue to center on `manufacturing_model`
- browser `chrome-extension://... postMessage` errors are still treated as extension noise, not app errors
- before starting new work, re-check:
  - `git status --short`
  - `npm run build`
  - Python compile checks
  - `docker compose up --build -d`
