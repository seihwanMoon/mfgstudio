# Next Development Plan

Last updated: 2026-03-17

## Goal

다음 구현 사이클의 목표는 `PyCaret native-first 정렬도`를 더 높이고, `보고서와 운영 화면을 실제 운영 산출물` 수준으로 다듬는 것입니다.

핵심 워크플로우 목표:

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

- analyze payload는 `native_source`, `fallback_used`, `native_reason`, `fallback_reason`를 반환함
- time-series forecast / acf / pacf는 native 우선 구조가 이미 있음
- XAI `summary`, `dependence`, `pfi`는 `interpret_model()`을 먼저 시도하고 실패 시 custom fallback으로 내려감
- experiment pickle restore가 깨질 경우 setup rebuild로 복구함

Next work:

- estimator / module별로 `interpret_model()` 유지 가능 조합 표를 정리
- native 유지 가치가 낮은 조합은 명시적으로 fallback 유지
- custom 경로를 더 줄이되, fallback 이유는 계속 응답에 남김

### P2. Automatic Report Lifecycle

Status: In Progress

Current state:

- finalize 시 PDF 자동 생성
- report API는 `meta`, `generate`, `download` 지원
- Production stage 변경과 rollback 시 보고서 재생성
- MLflow 서버가 닿지 않아도 `finalize -> register -> Production` 흐름이 앱 fallback으로 계속 진행됨

Next work:

- report history를 별도 메타데이터로 관리할지 결정
- 필요하면 scheduled Production report refresh 추가

### P3. Report Content Enrichment

Status: In Progress

Current state:

- 보고서는 KPI, workflow, dataset profile, compare/tune summary, artifact inventory를 포함
- 회귀 보고서는 대표 차트로 `잔차 플롯`, `SHAP 요약`을 포함
- 시계열 보고서는 대표 차트로 `예측 추세`, `잔차 플롯`을 포함
- clustering / anomaly는 현재 안정적인 fallback 차트 1종씩 포함

Next work:

- clustering / anomaly에서 추가로 넣을 수 있는 image-safe 차트 검토
- compare/tune summary의 가독성 보강
- 하이퍼파라미터 테이블이 긴 경우 레이아웃 보정

### P4. UI Copy / Localization Cleanup

Status: In Progress

Current state:

- 주요 고빈도 화면은 대부분 한국어로 정리됨
- Finalize는 `mlflow_synced` fallback 상태까지 표시
- operations panel도 한국어 기준으로 정리되고 `MLflow fallback` 필터가 추가됨

Next work:

- 저빈도 화면의 영어 / mojibake 문구 최종 스캔
- 필요 시 PDF 템플릿의 남은 문구도 다시 정리

### P5. Production Ops Refinement

Status: In Progress

Current state:

- `MLflow > 운영 관리`에서 실험 보관, 삭제 판정, 보고서 재생성/삭제, 은퇴 preview/workflow 지원
- operations payload에 `mlflow_synced` 상태가 포함됨
- Production report refresh 결과는 Finalize에서 바로 확인 가능

Next work:

- `mlflow_synced` 상태를 registry / MLflow 다른 탭까지 확장할지 결정
- 운영 데이터가 많아질 경우 server-side pagination 검토
- 필요하면 bulk retirement queue 형태 검토

## Recommended execution order

1. XAI path review against `interpret_model()` by estimator/module
2. Expand report-safe chart coverage for clustering/anomaly
3. Decide how far `mlflow_synced` fallback state should surface in UI and docs
4. Continue copy cleanup and UX polish
5. Add more module-specific runtime validation

## Immediate next implementation

1. clustering / anomaly에서 image-safe 대표 차트를 더 넣을 수 있는지 검토
2. estimator별 XAI native-first 유지표를 만들고 fallback 유지 대상을 명확히 정리
3. `mlflow_synced`를 registry / MLflow 다른 화면에도 보여줄지 결정
4. 남은 mixed-language / mojibake 화면 정리

## Notes

- 현재 큰 기능 블로커는 없음
- 가장 큰 구조적 숙제는 여전히 XAI custom 계층 축소
- 보고서 생성은 회귀, 시계열, clustering, anomaly-safe 경로까지 검증됨
