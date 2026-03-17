# Next Development Plan

Last updated: 2026-03-17

## Goal

다음 구현 사이클의 목표는 `PyCaret native-first 정렬도`를 더 높이고, `보고서/운영 관리`를 실제 운영 관점에서 더 안정적으로 만드는 것입니다.

핵심 플로우 목표:

1. `setup()`
2. `compare_models()`
3. `tune_model()`
4. `blend_models()` / `stack_models()` / `automl()`
5. `plot_model()` / `interpret_model()` / `dashboard()`
6. `finalize_model()`
7. registry / predict / monitoring / reports

## Priority roadmap

### P1. Analyze / XAI Native-First Cleanup

Implementation note:

- `GET /api/analyze/xai/matrix` now exposes model-level policy rows plus observed cache outcomes
- XAI list/plot responses now expose effective support labels derived from observed outcomes

Status: In Progress

Current state:

- analyze payload에 `native_source`, `fallback_used`, `native_reason`, `fallback_reason`를 포함
- time-series forecast / acf / pacf는 native 우선 구조가 이미 있음
- XAI `summary`, `dependence`, `pfi`는 `interpret_model()`을 먼저 시도하고 실패 시 custom fallback으로 내림
- experiment pickle restore 실패 시 setup rebuild로 복구
- 선택 모델 알고리즘 기준으로 XAI 정책 메타데이터(`preferred`, `conditional`, `fallback_only`)를 계산해 UI에 전달
- 반복 XAI 요청은 `reports/xai_cache/...` 경로의 snapshot cache를 재사용 가능
- report chart cache와 XAI snapshot cache는 공통 signature schema를 사용해 개별 artifact 단위로 무효화 가능
- report chart cache는 obsolete stem 정리, XAI snapshot cache는 14일 경과 파일 정리 규칙을 가짐

Next work:

- estimator / module별 `interpret_model()` 실제 성공 조합 표 정리
- native 사용 가능 조합은 native-only 또는 stronger preference로 재정렬
- custom 경로를 더 줄이고 fallback 이유를 계속 응답에 포함

### P2. Automatic Report Lifecycle

Status: In Progress

Current state:

- finalize 후 PDF 자동 생성
- report API는 `meta`, `generate`, `download` 지원
- Production stage 변경과 rollback 후 보고서 재생성
- MLflow 서버가 불안정해도 `finalize -> register -> Production` 흐름을 fallback으로 유지

Next work:

- report history를 별도 메타데이터로 관리할지 결정
- 필요하면 scheduled Production report refresh 추가

### P3. Report Content Enrichment

Implementation note:

- cache retention is now configurable in `backend/config.py`
- cache policy and cache size stats are now visible in the MLflow operations page

Status: In Progress

Current state:

- 보고서는 KPI, workflow, dataset profile, compare/tune summary, artifact inventory 포함
- 회귀 보고서는 `잔차 플롯`, `SHAP 요약` 포함
- 시계열 보고서는 `예측 추세`, `잔차 플롯` 포함
- clustering / anomaly는 현재 대표 차트 2종까지 확장됨
- 대표 차트는 `reports/chart_cache/model_{id}` 경로에 저장해 재생성 시 재사용 가능

Next work:

- artifact cache retention 설정값 외부화와 운영 화면 노출 여부 검토
- compare/tune summary 가독성 보강
- 표가 길어질 때 레이아웃 보정

### P4. UI Copy / Localization Cleanup

Status: In Progress

Current state:

- 주요 고빈도 화면은 대부분 한국어로 정리
- Finalize는 `mlflow_synced` fallback 상태까지 표시
- Operations panel은 한국어 기준으로 정리되고 `MLflow fallback` 필터 포함
- 이번 세션에 report template, report service, MLflow page 상위 문구를 재정리

Next work:

- 저빈도 화면 영어 / mojibake 문구 최종 정리
- 필요 시 PDF 템플릿 세부 문구 재조정

### P5. Production Ops Refinement

Implementation note:

- `GET /api/ops/cache-status` is now available for operations visibility
- `POST /api/ops/cache-cleanup` is now available for manual retention-based pruning

Status: In Progress

Current state:

- `MLflow > 운영 관리`에서 실험 보관, 삭제 판정, 보고서 재생성/삭제, 은퇴 preview/workflow 지원
- operations payload에 `mlflow_synced` 상태 포함
- Production report refresh 결과는 Finalize에서 즉시 확인 가능
- 이번 세션에 MLflow 조회 경로 fail-fast 적용

Next work:

- `mlflow_synced` 상태를 registry / MLflow 다른 화면까지 확장할지 결정
- 운영 데이터 증가 시 server-side pagination 검토
- 필요하면 bulk retirement queue 형태 검토

## Recommended execution order

1. XAI path review against `interpret_model()` by estimator/module with real success matrix
2. Extend artifact cache from report-safe charts to XAI snapshots
3. Decide how far `mlflow_synced` fallback state should surface in UI and docs
4. Continue copy cleanup and UX polish
5. Add more module-specific runtime validation

## Immediate next implementation

- refine the matrix from cache-history only into a broader per-estimator success log if needed
- tighten support labels using the observed matrix data, not only family heuristics
- collect a real estimator-by-estimator XAI native success matrix and tighten policy notes
- decide whether artifact-cache cleanup should also have a manual ops action
- decide whether `mlflow_synced` should be persisted as first-class model metadata

1. estimator별 XAI native success matrix를 실제 모델 기준으로 수집하고 정책 메모를 세분화
2. artifact cache retention 설정 외부화와 운영 화면 노출 범위 검토
3. `mlflow_synced`를 registry / MLflow 다른 화면에서도 보여줄지 결정
4. 남은 mixed-language / mojibake 화면 정리

## Notes

- detailed follow-up analysis: [FOLLOWUP_DEVELOPMENT_ANALYSIS.md](D:/GITHUB/mfgstudio/FOLLOWUP_DEVELOPMENT_ANALYSIS.md)

- 현재 큰 기능 블로커는 없음
- 가장 중요한 구조 개선은 XAI custom 경로 축소
- 보고서 생성은 회귀, 시계열, clustering, anomaly-safe 경로까지 검증됨
