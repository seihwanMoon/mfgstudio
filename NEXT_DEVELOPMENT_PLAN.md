# Next Development Plan

Last updated: 2026-03-10

## Goal

현재 MVP는 동작하지만, 다음 개선은 `PyCaret의 원래 실험 수명주기`와 최대한 정합되도록 진행한다.

기준 흐름:

1. `setup()`
2. `compare_models()`
3. `tune_model()`
4. `blend_models()` / `stack_models()` / `automl()`
5. `plot_model()` / `interpret_model()` / `dashboard()`
6. `finalize_model()`
7. `save_model()` / registry / predict / monitoring

## Priority Roadmap

### P1. Compare / Tune MLflow 정합성

Status: Completed on 2026-03-10

목표:

- compare 단계의 가짜 run id 제거
- 선택된 상위 모델에 대해 실제 MLflow run 생성
- tune 단계 결과도 실제 MLflow run으로 남기기
- 앱 MLflow 화면, 실제 MLflow UI, DB `mlflow_run_id`가 같은 run을 가리키게 만들기

완료 기준:

- compare 결과 상위 선택 모델에 실제 `mlflow_run_id` 존재
- tune 완료 후 해당 모델 row의 `mlflow_run_id`가 실제 MLflow run id로 갱신
- MLflow UI에서 compare/tune run 확인 가능

현재 결과:

- compare 상위 `n_select` 모델은 실제 MLflow run으로 기록됨
- tune 결과는 실제 MLflow run id로 DB row가 갱신됨
- 앱 MLflow 화면과 실제 MLflow UI에서 run 이름 `compare::...`, `tune::...` 확인 가능

### P2. PyCaret Experiment Persistence

목표:

- 서버 메모리의 `EXPERIMENT_CONTEXTS` 의존도를 줄이기
- `save_experiment()` / `load_experiment()` 기반으로 실험 재개 가능하게 만들기

완료 기준:

- 서버 재시작 후에도 tune/analyze/finalize 재개 가능
- experiment별 PyCaret context를 파일 기반으로 로드 가능

### P3. 동적 모델 카탈로그

목표:

- 하드코딩된 `MODULE_LIBRARY` 축소 또는 제거
- `pycaret.models()` 기반으로 사용 가능한 estimator를 동적으로 제공

완료 기준:

- compare 모델 목록이 PyCaret 설치 상태와 자동 동기화
- classification/regression별 실제 estimator id/name 메타데이터 노출

### P4. PyCaret 후반부 워크플로우 확장

목표:

- `blend_models()`
- `stack_models()`
- `automl()`

완료 기준:

- compare 상위 모델을 기반으로 앙상블 / 자동 최종 추천 단계 제공

### P5. Analyze / XAI 고도화

목표:

- `interpret_model()` 확장
- `dashboard()` / `check_drift()` / `check_fairness()` 가능 범위 검토
- SHAP 외에 PyCaret native explainability 반영

완료 기준:

- 현재 plot 중심 화면을 PyCaret native 분석 흐름과 더 가깝게 맞춤

### P6. 분류 전용 최적화

목표:

- `calibrate_model()`
- `optimize_threshold()`

완료 기준:

- classification workflow에서 threshold / calibration 단계를 분리 제공

## Current Execution Order

이번 세션에서는 아래 순서로 진행한다.

1. 개발 계획 문서화
2. compare 실제 MLflow run 연동
3. tune 실제 MLflow run 연동
4. Docker 검증
5. `PROGRESS.md` 업데이트

## Notes

- 사용자 화면 기준 catalog는 계속 `manufacturing_model` 중심으로 유지한다.
- 테스트/샘플 모델은 계속 사용자 화면에서 숨긴다.
- 브라우저 콘솔의 `chrome-extension://... postMessage` 오류는 앱 이슈로 취급하지 않는다.
