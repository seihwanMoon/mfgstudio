# Next Development Plan

Last updated: 2026-03-13

## Goal

다음 단계의 목표는 기능 추가보다 “PyCaret 원형과의 정합성”과 “운영 제품성”을 높이는 것입니다.

기준 흐름:

1. `setup()`
2. `compare_models()`
3. `tune_model()`
4. `blend_models()` / `stack_models()` / `automl()`
5. `plot_model()` / `interpret_model()` / `dashboard()`
6. `finalize_model()`
7. registry / predict / monitoring

## Priority roadmap

### P1. Time-Series Visualization Polish

Status: In Progress

현재 상태:

- 시계열 `forecast / residuals / acf / pacf`는 동작
- `forecast`는 PyCaret native plotly figure로 전환
- `residuals`는 residual-only chart로 보정

남은 작업:

- forecast horizon 선택 UI 제공 여부 결정
- 시계열 `Train/Test` 토글을 forecasting 의미에 맞게 더 명확히 표현
- PyCaret 튜토리얼 예시와 비교해 정보 밀도와 설명 문구 추가

### P2. Analyze / XAI Enhancement

Status: In Progress

현재 상태:

- 진단 플롯과 XAI 플롯이 분리됨
- XAI는 `summary`, `dependence`, `pfi` 지원

남은 작업:

- richer XAI variants 추가 검토
- PyCaret native explainability 범위와 현재 구현 차이 문서화
- 회귀/분류 화면의 XAI 결과 해석 문구 보강

### P3. Advanced Candidate UX

Status: In Progress

현재 상태:

- `blend_models()`, `stack_models()`, `automl()`
- `calibrate_model()`, `optimize_threshold()`
- 후보 메타데이터 일부 노출

남은 작업:

- Compare / Tune / Finalize 화면에서 advanced candidate 구분 강화
- `operation`, `members`, `resolved_model_name`, threshold/candidate 특성을 더 명확히 표시
- 최종 추천 로직과 후보 표시 기준 정리

### P4. MLflow Ops View Refinement

Status: In Progress

현재 상태:

- 실제 MLflow experiment / run / registry 연동
- app-side MLflow 화면 정리 완료

남은 작업:

- 실험 로그 필터링 고도화
- 최종 모델과 후보 모델의 MLflow run 관계 더 명확히 노출
- 앱 내부 비교 화면과 MLflow 비교 화면 간 연결 강화

### P5. Copy / Localization Cleanup

Status: In Progress

현재 상태:

- 다수 mojibake는 정리됨
- 일부 화면은 generic tabular 용어가 남아 있음

남은 작업:

- 시계열 전용 문구 정리
- Tune / Analyze / Finalize 설명 문구 재점검
- 사용자 안내 문구를 PyCaret 개념과 일치시키기

## Execution order for the next session

1. 시계열 Analyze 화면 UX 정리
2. XAI 확장 또는 해석 문구 보강
3. advanced candidate UX 정리
4. MLflow ops view 추가 정제
5. 남은 mixed-language / generic wording cleanup

## Notes

- 현재 샘플 기준 blocker는 없음
- 시계열은 이제 기능적으로 동작하므로 다음 단계는 안정화보다 해석성과 UX 개선
- 브라우저의 `chrome-extension://... postMessage` 오류는 계속 확장 프로그램 노이즈로 간주
