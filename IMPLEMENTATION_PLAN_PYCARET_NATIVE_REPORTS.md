# Implementation Plan: PyCaret Native First + Automatic Reports

Last updated: 2026-03-13

## Goal

이번 작업의 목적은 두 가지다.

1. Analyze / XAI 계층을 `PyCaret native 우선 + 앱 전용 fallback 최소화` 원칙으로 재정렬한다.
2. 모델 생성 이후 자동 보고서가 실제 운영 흐름에 연결되도록 구현한다.

이 문서는 구현 중 의사결정 기준과 작업 순서를 고정하기 위한 상세 계획서다.

---

## Core Principles

### P1. PyCaret Native First

- PyCaret가 공식 API로 제공하는 기능은 가능한 한 그대로 사용한다.
- 우선 대상 함수:
  - `plot_model()`
  - `interpret_model()`
  - `dashboard()`
  - `save_experiment()` / `load_experiment()`

### P2. Thin App Adapter

- 앱은 PyCaret 출력을 직접 대체하지 않고, 웹 렌더링에 필요한 얇은 변환만 수행한다.
- 허용되는 변환:
  - 파일/HTML/figure를 API 응답 구조로 래핑
  - PNG/Plotly/JSON 간 포맷 정리
  - UI용 label / helper text 변환

### P3. Fallback Is Explicit

- fallback은 PyCaret native가 실패하거나 공식 지원 범위 밖일 때만 사용한다.
- fallback 경로는 코드와 응답 payload 모두에서 명시한다.
- fallback이 들어간 기능은 추후 PyCaret native 대체 가능성을 추적할 수 있어야 한다.

### P4. Reports Are Artifacts, Not Just Downloads

- 보고서는 요청 시 즉석 렌더링만 하는 부가 기능이 아니라, 모델 생성 과정의 산출물로 취급한다.
- 최소 1개의 최신 보고서 파일을 모델 단위로 보존한다.
- finalize 또는 registry 승격 이후 재생성 기준을 명확히 둔다.

---

## Current State Summary

### Analyze / XAI

- tabular 일반 플롯은 일부 `plot_model()` 기반이다.
- time-series는 일부 native figure를 사용하지만, 잔차와 일부 시각화는 앱 커스텀 경로가 섞여 있다.
- XAI는 현재 `interpret_model()`보다 앱 내부 SHAP / permutation logic 비중이 높다.
- analyze 결과는 일회성 응답 중심이며, 이후 보고서 재사용을 위한 artifact 저장 구조는 없다.

### Reports

- PDF 템플릿과 렌더링 서비스는 이미 존재한다.
- 현재는 `GET /api/report/{model_id}` 호출 시 즉석 생성 후 파일 반환한다.
- finalize / register / stage 변경 시 자동 생성 훅은 없다.
- 보고서 내용은 metrics / hyperparams / drift / prediction count 수준으로 제한적이다.

---

## Target Architecture

## A. Analyze Execution Layers

Analyze 계층은 아래 3층으로 재편한다.

### Layer 1. Native

- PyCaret가 공식 지원하는 analyze 기능
- 예:
  - classification/regression `plot_model()`
  - time-series `plot_model(return_fig=True)`
  - classification/regression `interpret_model()`

### Layer 2. Adapter

- native 출력을 앱이 사용할 수 있도록 정규화
- 공통 응답 예시:
  - `render_mode`
  - `plotly_figure_json`
  - `base64_image`
  - `native_source`
  - `fallback_used`
  - `artifact_path`

### Layer 3. Fallback

- native 실패 또는 unsupported일 때만 사용
- 예:
  - clustering / anomaly의 제한된 custom plot
  - time-series residual-only 보정 차트
  - `interpret_model()`로 직접 얻기 어려운 제한적 XAI 보완

---

## B. Report Lifecycle

보고서는 아래 시점에 생성 가능해야 한다.

### Trigger 1. Finalize Success

- 모델 파일 저장과 MLflow run 기록이 완료되면 기본 리포트를 자동 생성한다.
- 목적:
  - 모델 생성 시점 기준의 고정 스냅샷 보존

### Trigger 2. Stage Promotion to Production

- 선택 구현 또는 2차 단계
- Production 승격 시 운영 버전 기준 리포트를 재생성한다.
- 목적:
  - 현재 운영 상태와 맞는 최신 문서 유지

### Trigger 3. Scheduled Refresh

- 선택 구현 또는 2차 단계
- drift / prediction count / recent usage를 반영해 Production 모델 리포트를 주기 갱신한다.

---

## Detailed Workstreams

## W1. Analyze Catalog Normalization

목표:
- 모듈별 플롯과 XAI 옵션을 `native_supported`, `fallback_supported`, `unsupported` 관점으로 재정리

작업:
- `list_plot_options()` 응답에 지원 메타데이터 추가
- 각 옵션에 다음 속성 부여
  - `source_preference`: `native` | `fallback`
  - `native_supported`
  - `fallback_supported`
  - `notes`

기대효과:
- 프론트가 “왜 이 플롯이 이렇게 렌더링되는지” 알 수 있다.
- 보고서 생성 시 포함 가능한 플롯 목록도 같은 메타데이터를 재사용할 수 있다.

## W2. Native-First Analyze Router

목표:
- analyze 응답이 “그림 데이터”뿐 아니라 “어떤 경로로 생성됐는지”도 반환

작업:
- `get_plot()` / `get_interpret_plot()` 반환 payload 표준화
- 응답 필드 추가
  - `native_source`
  - `fallback_used`
  - `plot_key`
  - `artifact_path` 또는 `artifact_name`
- native 우선 시도 후 fallback으로 내려가는 흐름을 함수 단위로 분리

기대효과:
- 유지보수 시 native/fallback 분리가 쉬워진다.
- 프론트/리포트에서 동일 payload를 재사용할 수 있다.

## W3. XAI Rationalization

목표:
- XAI를 가능한 범위에서 PyCaret 기반으로 재정렬

원칙:
- `interpret_model()`로 대체 가능한 항목은 native 우선
- 직접 계산이 필요한 항목만 fallback 유지

단계:
- 1차:
  - 기존 custom SHAP / PFI를 즉시 제거하지 않고 source metadata를 추가
  - native `interpret_model()` 적용이 가능한 plot type부터 병행 지원
- 2차:
  - 앱 커스텀 XAI 중 native와 중복되는 항목 축소

## W4. Report Domain Model

목표:
- 보고서를 파일 수준 artifact로 관리

권장 필드:
- `TrainedModel.report_path`
- `TrainedModel.report_generated_at`
- `TrainedModel.report_status`

선택 필드:
- `TrainedModel.report_summary_json`

주의:
- 현재 SQLite + `create_all()` 구조라서 단순 모델 수정만으로는 기존 DB에 컬럼이 자동 추가되지 않는다.
- 따라서 1차 구현에서는 아래 중 하나를 택한다.
  - A안: DB 변경 없이 파일 규칙 기반으로 운영
  - B안: SQLite `ALTER TABLE` 기반 lightweight migration 추가

이번 구현의 기본안:
- A안으로 먼저 연결
- 필요 시 후속 작업에서 migration 추가

## W5. Report Generation Service

목표:
- “download endpoint”가 아니라 “generate + fetch” 구조로 재구성

추가할 서비스 함수:
- `build_report_context(model, experiment, dataset, extra_artifacts=None)`
- `render_report_pdf(context)`
- `generate_model_report(model_id, db, force=False)`
- `resolve_report_path(model)`

report context 확장 항목:
- experiment name
- module type
- target column
- setup params summary
- model metrics
- changed hyperparameters
- stage / version / run id
- drift / prediction volume
- optional analysis artifact list

## W6. Automatic Report Triggering

목표:
- finalize 이후 자동 생성

작업:
- `POST /api/train/finalize/{model_id}` 성공 직후 report generation 호출
- API 응답에 아래 필드 추가
  - `report_generated`
  - `report_path`
  - `report_download_url`

확장 포인트:
- registry stage 변경 시 Production 리포트 갱신
- scheduler에서 주기 갱신

## W7. Report API Expansion

목표:
- 수동 다운로드 API를 더 명확한 lifecycle API로 확장

권장 엔드포인트:
- `POST /api/report/{model_id}/generate`
- `GET /api/report/{model_id}`
- `GET /api/report/{model_id}/meta`

1차 구현 최소안:
- 기존 `GET /api/report/{model_id}` 유지
- 내부적으로 최신 리포트가 없으면 생성, 있으면 재사용
- 필요 시 `force=true` 쿼리 지원

## W8. Frontend Integration

목표:
- Finalize 화면에서 자동 생성된 보고서를 바로 확인 가능하게 함

작업:
- report API client 추가
- Finalize 결과 카드에 보고서 상태/다운로드 링크 표시
- 선택 시점:
  - finalize 직후 자동 표시
  - registry stage 변경 후 수동 재생성 버튼 추가 가능

---

## Implementation Order

### Phase 1. Planning Baseline

- 본 문서 작성
- 구현 중 판단 기준 고정

### Phase 2. Automatic Report MVP

- report service 확장
- finalize 후 자동 생성 연결
- report API 재사용 구조 정리
- Finalize 화면 링크 노출

완료 기준:
- 모델 finalize 후 PDF가 자동 저장된다.
- 사용자는 finalize 직후 보고서를 열 수 있다.

### Phase 3. Analyze Metadata Refactor

- analyze payload 표준화
- native/fallback source metadata 추가
- plot catalog 메타데이터 강화

완료 기준:
- 각 analyze 응답이 native/fallback 여부를 명시한다.

### Phase 4. XAI Native Realignment

- `interpret_model()` 적용 가능한 경로 우선 연결
- custom XAI는 fallback으로 재표기

완료 기준:
- XAI 옵션별 source가 문서화되고 응답에도 반영된다.

### Phase 5. Report Content Enrichment

- experiment / dataset / setup summary 추가
- 선택된 분석 artifact 포함 구조 마련

완료 기준:
- 보고서가 모델 운영 문서로서 최소한의 설명력을 가진다.

---

## Validation Plan

### Functional Checks

- classification 모델 finalize 후 report 자동 생성
- regression 모델 finalize 후 report 자동 생성
- time-series 모델 finalize 후 report 자동 생성
- 기존 `GET /api/report/{model_id}` 다운로드 유지

### Analyze Checks

- classification plot 응답에 source metadata 포함
- regression XAI 응답에 source metadata 포함
- time-series plot 응답에 native/fallback 여부 표시

### Regression Checks

- 기존 finalize 응답 소비 프론트가 깨지지 않는지 확인
- manual report download 유지 확인
- report 생성 실패 시 finalize 자체는 성공 처리할지 정책 확인

기본 정책:
- finalize는 모델 저장이 핵심이다.
- report 생성 실패는 finalize 실패로 승격하지 않고 warning payload로 반환한다.

---

## Risks and Mitigations

### Risk 1. PyCaret analyze 결과 형식 변동

대응:
- native 응답을 앱 내부 표준 payload로 감싸고, raw 결과에 직접 의존하지 않는다.

### Risk 2. WeasyPrint 환경 경고

대응:
- PDF 렌더링 실패는 리포트 상태로 분리하고 finalize 자체는 유지

### Risk 3. Existing SQLite schema rigidity

대응:
- 1차는 파일 규칙 기반 저장
- schema 변경은 후속 migration 작업으로 분리

### Risk 4. XAI native path inconsistency

대응:
- native 우선 시도 후 fallback 허용
- 응답 metadata로 source를 노출

---

## Deliverables for This Implementation Cycle

이번 사이클의 목표 산출물:

1. 자동 보고서 생성 MVP
2. finalize 응답에 보고서 정보 포함
3. Finalize 화면에서 보고서 접근 가능
4. analyze 응답 source metadata 기반 정리
5. native/fallback 분리의 코드 기반 마련

---

## Out of Scope for This Cycle

- 완전한 DB migration 체계 도입
- 모든 analyze 결과를 장기 저장 artifact로 영구 보존
- 메일/카카오 알림 발송 자동화
- scheduler 기반 보고서 주기 재생성의 full UX

---

## Immediate Next Step

바로 이어서 다음 순서로 구현한다.

1. report service를 “자동 생성 가능한 artifact 서비스”로 확장
2. finalize 성공 직후 report generation 연결
3. report API / frontend finalize 화면 연결
4. analyze payload에 source metadata 추가
