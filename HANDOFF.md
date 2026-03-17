# HANDOFF

Last updated: 2026-03-17

## Summary

현재 프로젝트는 `PyCaret native-first 정리 + 자동 보고서 고도화 + 운영 관리 정리` 단계에 있습니다.

최근 기준 커밋:

- `8b5fd2f` `feat: enrich reports and harden mlflow fallbacks`
- `3b145bc` `feat: surface mlflow fallback status in finalize`
- current working tree adds report-safe time-series charts and MLflow fallback visibility in operations

핵심 완료 항목:

- `Analyze`를 `Plots` / `XAI`로 분리
- XAI `summary` / `dependence` / `pfi`에 `interpret_model()` 우선 시도 + fallback 이유 노출
- `finalize` 직후 PDF 자동 생성
- Production stage 변경 / rollback 시 보고서 재생성
- `MLflow > 운영 관리`에서 실험 보관, 안전 삭제 판정, 보고서 재생성/삭제, 은퇴 preview/workflow 지원
- PDF 보고서에 KPI, workflow, dataset profile, compare/tune summary, artifact inventory 추가
- PDF 보고서에 대표 분석 산출물 삽입 시작
- MLflow 서버가 닿지 않아도 `finalize -> register -> Production` 흐름이 앱 기준 fallback으로 계속 진행되도록 보강
- Finalize 화면에서 `mlflow_synced` fallback 상태와 보고서 링크를 명시적으로 노출
- time-series 보고서에 `예측 추세`와 `잔차 플롯`이 대표 차트로 포함되도록 확장
- 운영 관리 보고서 목록에서 `mlflow_synced` 기반 fallback 상태를 확인하고 필터링할 수 있도록 보강

## Current working tree

현재 추적 파일 기준 워크트리는 깨끗합니다.

- 미추적 파일: `logs.log`

## Main files

최근 사이클 핵심 파일:

- [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
- [backend/services/report_service.py](D:/GITHUB/mfgstudio/backend/services/report_service.py)
- [backend/services/mlflow_service.py](D:/GITHUB/mfgstudio/backend/services/mlflow_service.py)
- [backend/routers/train.py](D:/GITHUB/mfgstudio/backend/routers/train.py)
- [backend/routers/registry.py](D:/GITHUB/mfgstudio/backend/routers/registry.py)
- [backend/templates/report.html](D:/GITHUB/mfgstudio/backend/templates/report.html)
- [frontend/src/pages/FinalizePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/FinalizePage.jsx)
- [frontend/src/components/finalize/SaveModelForm.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/SaveModelForm.jsx)
- [frontend/src/components/finalize/MLflowRegisterForm.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/MLflowRegisterForm.jsx)
- [frontend/src/components/finalize/StageManager.jsx](D:/GITHUB/mfgstudio/frontend/src/components/finalize/StageManager.jsx)
- [PROGRESS.md](D:/GITHUB/mfgstudio/PROGRESS.md)
- [NEXT_DEVELOPMENT_PLAN.md](D:/GITHUB/mfgstudio/NEXT_DEVELOPMENT_PLAN.md)

## Verified

검증 완료 항목:

- `python -m py_compile backend/services/report_service.py backend/routers/report.py backend/routers/train.py backend/services/pycaret_service.py`
- `python -m py_compile backend/services/mlflow_service.py backend/routers/registry.py`
- `npm run build`
- `GET /api/report/665/meta` -> `200`
- `POST /api/report/665/generate` -> `200`
- `GET /api/report/665` -> `200`
- `build_report_context(model_id=665)` 에서 대표 차트 2개 확인
- `POST /api/train/finalize/679` -> `200`
- `POST /api/registry/register` -> `200`
- `PUT /api/registry/{model_name}/stage` -> `200`
- `build_report_context(model_id=544)` 에서 time-series report charts 2개 확인
- `build_report_context(model_id=379)` / `build_report_context(model_id=319)` 에서 clustering/anomaly report chart 유지 확인
- `GET /api/ops/reports` -> `200` and `mlflow_synced` field present

실검증 결과:

- 저장된 회귀 모델 `665` 기준으로 enriched PDF 재생성 확인
- 신규 finalize 모델 `679` 기준으로 `finalize -> register -> Production` 흐름 확인
- MLflow 미연결 상태에서는 `mlflow_synced=false`로 fallback 처리됨

## Runtime caveats

- `interpret_model()`은 estimator / 환경에 따라 계속 fallback 될 수 있음
- `pfi` native 경로는 `interpret_community` 의존성이 있음
- 대표 차트는 현재 회귀 흐름 검증이 가장 탄탄하고, time-series / clustering은 추가 검증 필요
- 보고서 차트 생성은 실패해도 PDF 전체가 실패하지 않도록 유지해야 함

## Current focus

1. XAI custom 경로를 더 줄이고 `interpret_model()` 가능 범위를 넓히기
2. 보고서용 안전 차트를 clustering/anomaly에서 더 확장할지 검토하기
3. `mlflow_synced` / fallback 상태를 운영 화면까지 노출할지 결정하기
4. 남은 혼합 언어 / mojibake UI 문구를 정리하기
5. 필요하면 보고서 히스토리 메타데이터를 별도 관리할지 결정하기

## Recommended next steps

1. [NEXT_DEVELOPMENT_PLAN.md](D:/GITHUB/mfgstudio/NEXT_DEVELOPMENT_PLAN.md)의 `P1`과 `P3`부터 이어서 진행
2. [backend/services/pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)에서 module/estimator별 native XAI 가능 범위 정리
3. [backend/services/report_service.py](D:/GITHUB/mfgstudio/backend/services/report_service.py)에서 clustering/anomaly 대표 차트 추가 여지를 검토
4. [frontend/src/components/mlflow/OperationsPanel.jsx](D:/GITHUB/mfgstudio/frontend/src/components/mlflow/OperationsPanel.jsx) 기준으로 fallback 상태 표현을 더 다듬을지 검토
5. 브라우저에서 `/finalize`, `/plots`, `/xai`, `/mlflow` 재확인

## Resume checklist

1. PyCaret native 결과가 불안정하면 숨기지 말고 fallback 이유를 남길 것
2. 보고서 차트는 `image payload`가 안전하게 확보되는 경우만 포함할 것
3. MLflow가 닿지 않아도 사용자 흐름이 끊기지 않게 유지할 것
4. destructive 동작은 운영 자산에 영향이 없는지 먼저 확인할 것
5. `logs.log`는 별도 요청이 없으면 무시할 것

## Useful commands

```powershell
cd D:\GITHUB\mfgstudio
git status --short
npm run build --prefix frontend
python -m py_compile backend/services/report_service.py backend/services/mlflow_service.py backend/services/pycaret_service.py backend/routers/train.py backend/routers/registry.py
docker compose up --build -d backend frontend
```
