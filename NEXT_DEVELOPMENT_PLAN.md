# Next Development Plan

Last updated: 2026-03-10

## Goal

현재 MVP는 동작하지만, 다음 개선은 "PyCaret의 원래 실험 흐름을 제품 화면에서 더 직접적으로 드러내기"에 초점을 둔다.

기준 흐름:

1. `setup()`
2. `compare_models()`
3. `tune_model()`
4. `blend_models()` / `stack_models()` / `automl()`
5. `plot_model()` / `interpret_model()` / `dashboard()`
6. `finalize_model()`
7. `save_model()` / registry / predict / monitoring

## Priority Roadmap

### P1. Compare / Tune MLflow Alignment

Status: Completed on 2026-03-10

Objective:

- compare 단계의 가시 run id 확보
- 선택된 상위 모델들에 대해 실제 MLflow run 생성
- tune 결과를 실제 MLflow run으로 연결
- 앱 화면, 실제 MLflow UI, DB `mlflow_run_id`가 같은 run을 가리키도록 정렬

Done criteria:

- compare 결과 상위 선택 모델들에 실제 `mlflow_run_id` 존재
- tune 완료 후 해당 후보 row의 `mlflow_run_id`가 실제 MLflow run id로 갱신
- MLflow UI에서 compare / tune run 확인 가능

Current result:

- compare 상위 `n_select` 모델이 실제 MLflow run으로 기록됨
- tune 결과가 실제 MLflow run id로 DB에 반영됨
- 앱 MLflow 화면과 실제 MLflow UI에서 `compare::...`, `tune::...` run 확인 가능
- compare 재실행 시 finalized / registered version row가 삭제되지 않도록 수정 완료

### P2. PyCaret Experiment Persistence

Status: Completed on 2026-03-10

Objective:

- 메모리 기반 `EXPERIMENT_CONTEXTS` 의존도 축소
- `save_experiment()` / `load_experiment()` 기반 실험 재개 지원

Done criteria:

- 서버 재시작 후에도 tune / analyze / finalize 재개 가능
- experiment별 PyCaret context를 파일 기반으로 로드 가능

Current result:

- `setup()` 시점에 PyCaret experiment snapshot이 `data/experiments/experiment_<id>/pycaret_experiment.pkl`로 저장됨
- compare 상위 후보 모델과 tuned 모델이 같은 실험 디렉터리에 캐시됨
- `context.json`에 persisted model path와 run id가 기록됨
- 메모리 컨텍스트를 비운 뒤에도 `get_plot()` / `get_shap()` 재호출이 정상 동작함

### P3. Dynamic Model Catalog

Status: In Progress

Objective:

- 하드코딩된 `MODULE_LIBRARY` 축소 또는 제거
- `pycaret.models()` 기반 동적 estimator 목록 제공

Done criteria:

- compare 모델 목록이 PyCaret 설치 상태와 자동 동기화
- classification / regression별 실제 estimator id / name 메타데이터 노출

Current result:

- `GET /api/train/models`가 classification / regression / clustering / anomaly / timeseries에 대해 PyCaret bootstrap experiment 기반 동적 목록을 반환
- 더 이상 주요 모듈 목록이 정적 하드코딩 6개 수준에 고정되지 않음
- 다음 남은 범위는 estimator id / type 메타데이터를 프론트까지 노출하는 작업

### P4. PyCaret Late-Stage Workflow Expansion

Status: Planned

Objective:

- `blend_models()`
- `stack_models()`
- `automl()`

Done criteria:

- compare 상위 모델을 기반으로 앙상블 / 자동 최종 추천 단계 제공

### P5. Analyze / XAI Enhancement

Status: Planned

Objective:

- `interpret_model()` 확장
- `dashboard()` / `check_fairness()` 검토
- SHAP 외에도 PyCaret native explainability 연결

Done criteria:

- 현재 plot 중심 분석 화면이 PyCaret native 분석 흐름과 더 가까워짐

### P6. Classification-Specific Optimization

Status: Planned

Objective:

- `calibrate_model()`
- `optimize_threshold()`

Done criteria:

- classification workflow에 calibration / threshold 단계를 분리 제공

### P7. MLflow Ops View Refinement

Status: Completed on 2026-03-10

Objective:

- 사용자 화면에서 PyCaret 내부 run 노이즈 제거
- `Experiment Logs` 시간 표시를 KST 기준으로 변환
- `Experiment Compare`에 최신 metric 비교 표 추가
- `Schedule` 문구를 한국어 중심으로 정리

Done criteria:

- `Session Initialized` 같은 내부 run이 앱 MLflow 화면에서 사라짐
- 실험 목록의 run 수가 사용자 가시 run 기준으로 계산됨
- 비교 탭에서 최신 metric 비교가 가능
- 스케줄 탭에서 KST 시간과 한국어 문구가 표시됨

## Current Execution Order

이번 세션 이후 우선 순위:

1. P3 `Dynamic Model Catalog` metadata expansion
2. P4 `PyCaret Late-Stage Workflow Expansion`
3. P5 `Analyze / XAI Enhancement`
4. P6 `Classification-Specific Optimization`

## Notes

- 사용자 화면의 운영 catalog는 계속 `manufacturing_model` 중심으로 유지한다.
- 테스트 / 샘플 모델은 사용자 화면에서 숨기고, 필요 시 운영자 전용 정리 도구로 관리한다.
- 브라우저 콘솔의 `chrome-extension://... postMessage` 오류는 앱 장애가 아닌 확장 프로그램 노이즈로 본다.
