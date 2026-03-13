# Next Development Plan

Last updated: 2026-03-13

## Goal

The next implementation cycle is focused on tightening alignment with PyCaret-native workflows while turning reports into durable operating artifacts.

Core workflow target:

1. `setup()`
2. `compare_models()`
3. `tune_model()`
4. `blend_models()` / `stack_models()` / `automl()`
5. `plot_model()` / `interpret_model()` / `dashboard()`
6. `finalize_model()`
7. registry / predict / monitoring / reports

## Priority roadmap

### P1. Analyze / XAI Native-First Cleanup

Status: In Progress

Current state:

- analyze payloads now return `native_source` and `fallback_used`
- plot catalog entries now label native-first vs fallback intent
- time-series forecast / acf / pacf already prefer native plotly output
- residuals still uses an explicit fallback path for clarity
- diagnostic plots now live under a dedicated `Plots` route
- explanation work now lives under a dedicated `XAI` route
- custom SHAP paths were repaired for PyCaret pipeline models by using transformed numeric frames with the final estimator
- `summary`, `dependence`, and `pfi` now attempt `interpret_model()` first and return custom fallback output only when PyCaret native output is not available

Next work:

- measure which estimator/module combinations can reliably stay on native `interpret_model()` output
- reduce custom-only logic where PyCaret native output is acceptable
- keep misleading native plots overridden only when there is a clear UX reason

### P2. Automatic Report Lifecycle

Status: In Progress

Current state:

- finalize now generates a PDF automatically
- report service now resolves reusable report artifact paths
- report API now supports metadata lookup and explicit regeneration
- Production stage changes now refresh the report
- a real saved model (`model_id=665`) successfully passed `meta -> generate -> download(PDF)` after pinning a compatible `pydyf` version for the backend image

Next work:

- validate the report flow immediately after a new `finalize` action in-session
- decide whether report history needs DB-backed metadata
- optionally add scheduled Production report refresh

### P3. Report Content Enrichment

Status: In Progress

Current state:

- reports now include experiment, module, dataset, target, run id, metrics, hyperparameters, and setup summary
- reports now also include KPI overview cards, workflow steps, dataset profile, compare/tune summary, and artifact inventory

Next work:

- include persisted analyze artifacts or plot snapshots when stable storage exists
- add compare/tune summary blocks if they are worth preserving in the final report
- improve styling and readability for longer hyperparameter tables

### P4. UI Copy / Localization Cleanup

Status: In Progress

Current state:

- the app shell, sidebar, header, and the new `Plots` / `XAI` screens are now back in Korean
- Tune, Finalize, MLflow, and several dashboard/detail panels were also re-localized to Korean
- compare leaderboard, MLflow registry/schedule panels, and the PDF report template were also normalized to Korean
- mixed-language and mojibake strings may still exist in lower-traffic or not-yet-revisited components

Next work:

- scan remaining pages/components for leftover English labels or mojibake
- keep Korean as the default product UI language unless there is an explicit requirement to support dual-language UI
- remove mojibake before deeper UX polish

### P5. Production Ops Refinement

Status: In Progress

Current state:

- MLflow registry flows and report refresh hooks are now connected
- `MLflow > 운영 관리` now exposes experiment archive/delete safety checks and report lifecycle controls
- registered/finalized models can now enter a retirement workflow before an experiment becomes deletable
- operations lists now support client-side search and lifecycle filtering for large histories
- retirement now includes a dry-run preview that shows planned cleanup actions and whether the linked experiment could become deletable afterward
- bulk archive and missing-report bulk generation are now available from the filtered operations lists

Next work:

- surface report refresh results in Production management UI if needed
- tighten the link between Production version, MLflow version, and generated report
- consider server-side pagination if experiment and report lists grow significantly
- consider bulk retirement or staged cleanup queues once operator confidence is high enough

## Recommended execution order

1. Real-model smoke test for finalize -> report generation -> report download
2. Production promotion smoke test for report refresh
3. XAI path review against `interpret_model()` by estimator/module
4. Persist analyze artifacts for report reuse
5. Continue copy cleanup and UX polish

## Notes

- No hard blocker is currently identified in code.
- The largest remaining architectural gap is still the custom XAI layer for cases where PyCaret native interpretability is unavailable.
- Report generation is connected, but it still needs full real-model runtime validation in this environment.
