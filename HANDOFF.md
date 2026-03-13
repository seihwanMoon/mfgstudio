# HANDOFF

Last updated: 2026-03-13

## Summary

최근 작업은 시계열 흐름 안정화와 PyCaret 원형에 더 가깝게 맞추는 데 집중했습니다.

오늘까지 반영된 핵심:

- 시계열 `setup / compare / tune / analyze / finalize` 전 경로 재검증
- persisted experiment state를 요청마다 다시 로드하도록 수정
- 시계열 `forecast / residuals / acf / pacf`를 PyCaret native plotly figure 기반으로 전환
- 시계열 `residuals`는 residual-only 그래프로 재구성
- `README.md`를 현재 상태 기준으로 전면 정리

## 현재 로컬 상태

최신 로컬 커밋:

- `91d47e6 fix: clean up timeseries residual plots`
- `d3d4857 feat: align timeseries plots with pycaret visuals`
- `90dea3b fix: reload persisted timeseries experiment state`

핵심 파일:

- [D:\GITHUB\mfgstudio\backend\services\pycaret_service.py](D:/GITHUB/mfgstudio/backend/services/pycaret_service.py)
- [D:\GITHUB\mfgstudio\backend\routers\analyze.py](D:/GITHUB/mfgstudio/backend/routers/analyze.py)
- [D:\GITHUB\mfgstudio\frontend\src\pages\AnalyzePage.jsx](D:/GITHUB/mfgstudio/frontend/src/pages/AnalyzePage.jsx)
- [D:\GITHUB\mfgstudio\frontend\src\components\analyze\PlotRenderArea.jsx](D:/GITHUB/mfgstudio/frontend/src/components/analyze/PlotRenderArea.jsx)
- [D:\GITHUB\mfgstudio\frontend\src\components\analyze\TrainTestToggle.jsx](D:/GITHUB/mfgstudio/frontend/src/components/analyze/TrainTestToggle.jsx)
- [D:\GITHUB\mfgstudio\README.md](D:/GITHUB/mfgstudio/README.md)

## Verified today

- `npm run build`
- `python -m py_compile backend/services/pycaret_service.py backend/routers/analyze.py`
- `docker compose up --build -d backend frontend`
- 시계열 fresh experiment 재검증
  - `setup` 성공
  - `compare` 성공
  - `tune` 성공
  - `finalize` 성공
- 시계열 analyze API
  - `forecast` -> `200`, `render_mode=plotly`
  - `residuals` -> `200`, residual-only plotly figure
  - `acf` -> `200`
  - `pacf` -> `200`

## Current focus

샘플 기준 blocker는 현재 없습니다. 다음 세션부터는 다시 “품질/제품성” 개선으로 돌아가면 됩니다.

권장 우선순위:

1. 시계열 화면 UX 다듬기
   - `미래 예측 강조` 토글 명확화
   - forecast horizon 선택 UI 추가 여부 결정
   - 시계열 전용 설명 문구 정리

2. XAI 확장
   - 현재 `summary / dependence / pfi` 이후 추가 XAI 검토
   - PyCaret native explainability 범위와의 차이 재정리

3. 고급 후보 UX 정리
   - `blend / stack / automl / calibrate / threshold` 후보 메타데이터를 Tune/Finalize에서 더 명확히 노출

4. MLflow 운영 화면 정제
   - 실험 로그 필터링 고도화
   - 후보/최종 모델 흐름과 MLflow run 관계를 더 명확히 연결

## Recommended first steps tomorrow

1. `git status --short`
2. `docker compose up --build -d backend frontend`
3. 시계열 분석 화면 실제 브라우저 확인
   - `forecast`
   - `residuals`
   - `acf`
   - `pacf`
4. 시계열 UI 문구/토글 UX 정리
5. 그다음 XAI 확장 또는 고급 후보 UX 정리 진입

## Useful commands

```powershell
cd D:\GITHUB\mfgstudio
git status --short
docker compose up --build -d backend frontend
@'
import requests
for payload in [
    {'model_id':490,'plot_type':'forecast','plot_family':'plot','use_train_data':False},
    {'model_id':490,'plot_type':'residuals','plot_family':'plot','use_train_data':False},
    {'model_id':490,'plot_type':'acf','plot_family':'plot','use_train_data':False},
    {'model_id':490,'plot_type':'pacf','plot_family':'plot','use_train_data':False},
]:
    r = requests.post('http://localhost:8000/api/analyze/plot', json=payload, timeout=30)
    print(payload['plot_type'], r.status_code, r.json().get('render_mode'))
'@ | python -
```
