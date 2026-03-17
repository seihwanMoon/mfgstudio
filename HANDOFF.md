# HANDOFF

Last updated: 2026-03-17

## Summary

Latest session additions:

- XAI plot/list responses now expose `effective_support_level` and `effective_policy_note`
- added `GET /api/analyze/xai/matrix`
- externalized cache retention into `backend/config.py`
- added `GET /api/ops/cache-status`
- added `POST /api/ops/cache-cleanup`
- surfaced cache policy and artifact counts in the MLflow operations page
- rewrote the MLflow operations page copy in clean Korean

현재 프로젝트는 `PyCaret native-first 정리 + 자동 보고서 고도화 + 운영 관리 정리` 단계에 있습니다.

최근 기준 커밋:

- `8b5fd2f` `feat: enrich reports and harden mlflow fallbacks`
- `3b145bc` `feat: surface mlflow fallback status in finalize`
- `3ebe920` `feat: expand report-safe charts and ops visibility`

이번 세션 추가 반영:

- 보고서 서비스와 PDF 템플릿을 깨끗한 한국어 기준으로 재정리
- MLflow 조회 경로에 read-path fail-fast 적용
- `MLflow` 상위 페이지 문구 정리 및 상태 메시지 보강
- clustering / anomaly 보고서용 대표 차트 확대 (`엘보 차트`, `이상치 점수 분포`)
- 선택 모델 기준 XAI native-first 정책 메타데이터 추가 (`preferred`, `conditional`, `fallback_only`)
- 모델별 report-safe chart cache 추가 (`reports/chart_cache/model_{id}`)
- XAI snapshot cache 추가 (`reports/xai_cache/experiment_{id}/{algorithm}/...`)
- shared artifact cache signature helper 추가로 cache invalidation 기준 공통화
- artifact cache cleanup 규칙 추가로 obsolete report cache / stale XAI cache 자동 정리

## Current working tree

현재 추적 파일 기준 워크트리는 작업 중 변경이 있습니다.

- 수정 파일:
  - `backend/services/report_service.py`
  - `backend/services/mlflow_service.py`
  - `backend/services/pycaret_service.py`
  - `backend/routers/analyze.py`
  - `backend/templates/report.html`
  - `frontend/src/api/index.js`
  - `frontend/src/pages/XAIPage.jsx`
  - `frontend/src/components/analyze/PlotSelector.jsx`
  - `frontend/src/components/analyze/PlotRenderArea.jsx`
  - `frontend/src/pages/MLflowPage.jsx`
  - `PROGRESS.md`
  - `HANDOFF.md`
  - `NEXT_DEVELOPMENT_PLAN.md`
- 미추적 파일:
  - `logs.log`

## Main files

- [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
- [backend/services/report_service.py](D:/GITHUB/mfgstudio/backend/services/report_service.py)
- [backend/services/mlflow_service.py](D:/GITHUB/mfgstudio/backend/services/mlflow_service.py)
- [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py)
- [backend/routers/registry.py](D:/GITHUB/mfgstudio/backend/routers/registry.py)
- [backend/templates/report.html](D:/GITHUB/mfgstudio/backend/templates/report.html)
- [frontend/src/pages/FinalizePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/FinalizePage.jsx)
- [frontend/src/pages/MLflowPage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/MLflowPage.jsx)
- [frontend/src/components/mlflow/OperationsPanel.jsx](D:/GITHUB/mfgstudio/frontend/src/components/mlflow/OperationsPanel.jsx)
- [PROGRESS.md](D:/GITHUB/mfgstudio/PROGRESS.md)
- [NEXT_DEVELOPMENT_PLAN.md](D:/GITHUB/mfgstudio/NEXT_DEVELOPMENT_PLAN.md)
- [FOLLOWUP_DEVELOPMENT_ANALYSIS.md](D:/GITHUB/mfgstudio/FOLLOWUP_DEVELOPMENT_ANALYSIS.md)

## Completed

- `Analyze`를 `Plots` / `XAI`로 분리
- XAI `summary` / `dependence` / `pfi`에 `interpret_model()` 우선 시도 + fallback 이유 노출
- `finalize` 직후 PDF 자동 생성
- Production stage 변경 / rollback 이후 보고서 재생성
- `MLflow > 운영 관리`에서 실험 보관, 안전 삭제 판정, 보고서 재생성/삭제, 은퇴 preview/workflow 지원
- PDF 보고서에 KPI, workflow, dataset profile, compare/tune summary, artifact inventory 포함
- PDF 보고서에 대표 분석 산출물 포함 시작
- MLflow 서버 장애 시 `finalize -> register -> Production` 흐름을 앱 fallback 메타데이터로 지속
- Finalize 화면에서 `mlflow_synced` fallback 상태 노출
- time-series 보고서에 `예측 추세`와 `잔차 플롯` 포함
- 운영 관리 보고서 목록에서 `mlflow_synced` 기반 fallback 상태 확인/필터 지원
- 이번 세션에 보고서 템플릿/서비스 문자열 재정리 및 MLflow read-path fail-fast 적용

## Verified

- `python -m py_compile backend/config.py backend/services/artifact_cache.py backend/services/report_service.py backend/services/pycaret_service.py backend/routers/ops.py`
- `python -m py_compile backend/routers/analyze.py backend/services/pycaret_service.py`
- `npm run build`
- project `.venv` TestClient: `GET /api/analyze/xai/matrix?experiment_id=67` returned `200`
- `experiment_id=67` matrix response showed observed fallback history for `Linear Regression` summary
- project `.venv` TestClient: `POST /api/analyze/plot` for `model_id=665`, `summary`, `xai` returned `effective_support_level=fallback_only`
- project `.venv` TestClient: `GET /api/ops/cache-status` returned `200`
- project `.venv` TestClient: `POST /api/ops/cache-cleanup` returned `200`
- cache-status payload exposes retention settings and report/XAI cache stats

- `python -m py_compile backend/services/report_service.py backend/services/mlflow_service.py backend/routers/mlflow.py`
- `python -m py_compile backend/services/pycaret_service.py backend/routers/analyze.py`
- `npm run build`
- `build_report_context(model_id=544, experiment, dataset)` 기준 time-series report charts 2개 확인
- `build_report_context(model_id=379, experiment, dataset)` 기준 clustering report charts 2개 확인
- `build_report_context(model_id=319, experiment, dataset)` 기준 anomaly report charts 2개 확인
- `generate_model_report(model_id=544, force=True)` 성공
- `generate_model_report(model_id=379, force=True)` 성공
- `generate_model_report(model_id=319, force=True)` 성공
- `get_all_registered_models()` / `list_experiments()` 조회 경로가 장애 시 빈 목록으로 빠르게 복귀하도록 보강
- `GET /api/analyze/plots/list?module_type=regression&algorithm=Linear Regression` 기준 XAI 정책 메타데이터 확인
- `GET /api/analyze/plots/list?module_type=regression&algorithm=K Neighbors Regressor` 기준 XAI 정책 메타데이터 확인
- `POST /api/analyze/plot` (`model_id=665`, `summary`, `xai`) 기준 `estimator_family_label`, `support_level`, `policy_note` 응답 확인
- `model_id=544`, `379`, `319` 기준 chart cache 파일 생성 및 재사용 확인
- `model_id=665`, `summary`, `xai` 동일 요청 2회 기준 `cache_hit=false -> true` 및 snapshot cache 파일 생성 확인
- XAI snapshot metadata signature를 깨뜨렸을 때 다음 요청이 `cache_hit=false`로 재생성되는 것 확인
- report chart metadata signature를 깨뜨렸을 때 해당 차트만 재생성되고 다른 차트는 cache 유지되는 것 확인
- report chart cache 디렉터리에 불필요한 파일을 넣었을 때 자동 삭제되는 것 확인
- 14일 이상 지난 XAI snapshot cache 파일이 다음 요청 시 자동 삭제되는 것 확인

주의:

- Windows 환경에서 WeasyPrint 실행 시 `Fontconfig error` / `GLib-GIO-WARNING`이 출력될 수 있으나 현재 보고서 생성은 성공함

## Current focus

1. XAI custom 경로를 더 줄이고 `interpret_model()` 안정 범위를 실제 estimator 기준으로 더 세분화하기
2. artifact cache 정리(cleanup) 정책을 운영 화면에 어디까지 노출할지 검토
3. `mlflow_synced`를 추론이 아니라 영속 메타데이터로 저장할지 결정
4. 남은 mixed-language / mojibake UI 문구 정리
5. 보고서 생성 latency와 artifact cache 전략 검토

## Recommended next steps

1. [NEXT_DEVELOPMENT_PLAN.md](D:/GITHUB/mfgstudio/NEXT_DEVELOPMENT_PLAN.md)의 `P1`, `P3` 순서로 진행
2. [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)에서 estimator/module별 native XAI 정책을 실제 성공/실패 통계 기반으로 더 세분화
3. [backend/services/artifact_cache.py](D:/GITHUB/mfgstudio/backend/services/artifact_cache.py) 기준으로 retention 설정값을 외부화할지 검토
4. [frontend/src/components/mlflow/OperationsPanel.jsx](D:/GITHUB/mfgstudio/frontend/src/components/mlflow/OperationsPanel.jsx) 이후 다른 운영 화면에도 fallback 상태를 어디까지 노출할지 결정
5. 브라우저에서 `/finalize`, `/plots`, `/xai`, `/mlflow` 재확인

## Resume checklist

1. PyCaret native 결과가 불안정하면 억지로 막지 말고 fallback 이유를 유지할 것
2. 보고서 차트는 `image payload`가 안전할 때만 포함할 것
3. MLflow 서버가 불안정해도 사용자 흐름이 끊기지 않도록 fail-fast를 유지할 것
4. destructive 작업은 운영 자산 영향 여부를 먼저 확인할 것
5. `logs.log`는 별도 요청이 없으면 무시할 것

## Useful commands

```powershell
cd D:\GITHUB\mfgstudio
git status --short
npm run build --prefix frontend
python -m py_compile backend/services/report_service.py backend/services/mlflow_service.py backend/services/pycaret_service.py backend/routers/train.py backend/routers/registry.py backend/routers/mlflow.py
docker compose up --build -d backend frontend
```
