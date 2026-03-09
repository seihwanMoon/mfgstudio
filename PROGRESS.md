# PROGRESS — 태스크 진척 트래커

> **에이전트 필독**: 작업 시작 시 이 파일을 열어 현재 위치 확인 → 완료 시 `[ ]`를 `[x]`로 변경
> 에러 발생 시 해당 항목 아래에 `> ⚠ ERROR: 에러 내용` 형식으로 기록

---

## 전체 진행률

```
SETUP      [ 4 / 5  ] ▓▓▓▓▓▓▓▓░░
BACKEND    [ 13 / 28 ] ▓▓▓▓░░░░░░
FRONTEND   [ 22 / 33 ] ▓▓▓▓▓▓░░░░
MLOPS      [ 0 / 10 ] ░░░░░░░░░░
TOTAL      [ 39 / 76 ] ▓▓▓▓▓░░░░░
```

---

## Phase 0 — 환경 셋업 (SETUP)

### S-01: 프로젝트 뼈대 생성
- [x] `mfg-ai-studio/` 루트 폴더 생성
- [x] `backend/`, `frontend/`, `data/`, `mlruns/` 폴더 생성
- [x] `.gitignore` 생성 (`.env`, `data/`, `mlruns/`, `__pycache__/`, `node_modules/`)
- [x] `.env.example` 생성

### S-02: Docker 설정
- [x] `docker-compose.yml` 생성 (backend, frontend, mlflow 3개 서비스)
- [x] `backend/Dockerfile` 생성
- [x] `frontend/Dockerfile` 생성
- [ ] `docker-compose up --build` 정상 실행 확인
> ⚠ ERROR: Docker Desktop Linux 엔진 파이프(`//./pipe/dockerDesktopLinuxEngine`)에 연결되지 않아 컨테이너 기동 검증은 아직 못함. `docker compose config` 검증만 완료.

### S-03: Backend 초기화
- [x] `backend/requirements.txt` 생성
- [x] `backend/main.py` FastAPI 앱 기본 구조 생성
- [x] `backend/database.py` SQLAlchemy 설정
- [x] `backend/config.py` 환경변수 로드 (pydantic-settings)
- [x] `GET /health` 엔드포인트 확인

### S-04: Frontend 초기화
- [x] `npm create vite@latest frontend -- --template react` 실행
- [x] TailwindCSS 설치 및 설정
- [x] `npm install zustand axios recharts lucide-react` 실행
- [x] `src/store/useStore.js` Zustand 초기 스토어 생성
- [x] `src/api/client.js` Axios 인스턴스 생성
- [x] Vite dev server 정상 실행 확인

### S-05: MLflow 연동 확인
- [x] MLflow 서버 `http://localhost:5000` 정상 접속 확인
- [x] `backend/services/mlflow_service.py` MLflow 연결 테스트 함수 작성
- [x] `GET /api/mlflow/status` 엔드포인트 작성 및 테스트

---

## Phase 1 — Backend 개발 (BACKEND)

### B-01: DB 모델 생성
- [x] `models/dataset.py` — Dataset 테이블 (id, filename, path, row_count, col_count, encoding, created_at)
- [x] `models/experiment.py` — Experiment 테이블 (id, name, module_type, target_col, setup_params_json, mlflow_exp_id, created_at)
- [x] `models/trained_model.py` — TrainedModel 테이블 (id, experiment_id, algorithm, metrics_json, model_path, mlflow_run_id, stage, is_production, created_at)
- [x] `models/prediction.py` — Prediction 테이블 (id, model_id, source, input_json, result_json, created_at)
- [x] `Alembic` 또는 `Base.metadata.create_all()` 로 테이블 생성 확인

### B-02: 데이터 API (`routers/data.py`)
- [x] `POST /api/data/upload` — 파일 업로드, chardet 인코딩 감지, parquet 변환 저장
- [x] `GET /api/data/{dataset_id}/preview` — 상위 50행 + 컬럼 타입 반환
- [x] `GET /api/data/{dataset_id}/quality` — 결측값, 중복행, 수치/범주/날짜 컬럼 수 반환
- [x] `PATCH /api/data/{dataset_id}/columns` — 컬럼 타입 강제 변경 (numeric_features / categorical_features)

### B-03: PyCaret Service (`services/pycaret_service.py`)
- [ ] `setup_experiment(dataset_id, params)` — PyCaret setup() 호출, 결과 반환
- [ ] `compare_models_stream(experiment_id, options)` — compare_models() SSE 스트리밍
- [ ] `create_and_tune(experiment_id, model_ids, tune_options)` — create_model() + tune_model()
- [ ] `get_plot(model_id, plot_type, use_train_data)` — plot_model() → base64 이미지 반환
- [ ] `get_shap(model_id, row_index)` — interpret_model() SHAP Waterfall 데이터 반환
- [ ] `finalize(model_id)` — finalize_model() + save_model()
- [ ] `predict_single(model_name, input_data, threshold)` — predict_model() 단건
- [ ] `predict_batch(model_name, file_path, threshold)` — predict_model() 배치

### B-04: 학습 API (`routers/train.py`)
- [x] `POST /api/train/setup` — setup() 실행, Experiment DB 저장
- [x] `GET /api/train/setup/{experiment_id}/code` — 현재 설정을 Python 코드 문자열로 반환
- [ ] `POST /api/train/compare` — compare_models() 시작
- [ ] `GET /api/train/compare/{experiment_id}/stream` — SSE 스트림 (EventSourceResponse)
- [ ] `GET /api/train/models` — PyCaret 사용 가능 알고리즘 목록 반환
- [ ] `POST /api/train/tune` — tune_model() 실행
- [ ] `GET /api/train/tune/{job_id}/stream` — Optuna trial SSE 스트림
- [ ] `POST /api/train/finalize/{model_id}` — finalize_model() + save_model()

### B-05: 분석 API (`routers/analyze.py`)
- [ ] `POST /api/analyze/plot` — plot_model() 실행, base64 PNG 반환
- [ ] `POST /api/analyze/interpret` — interpret_model() SHAP 데이터 반환
- [ ] `GET /api/analyze/plots/list` — 모듈 타입별 사용 가능 플롯 목록

### B-06: 예측 API (`routers/predict.py`)
- [ ] `POST /api/predict/{model_name}` — 단건 예측 (predict_model)
- [ ] `POST /api/predict/{model_name}/batch` — 배치 예측 (CSV 업로드)
- [ ] `GET /api/predict/history` — 예측 이력 조회 (최근 100건)
- [ ] `GET /api/predict/history/{model_name}` — 모델별 예측 이력

### B-07: MLflow Registry API (`routers/registry.py`)
- [ ] `POST /api/registry/register` — mlflow.register_model()
- [ ] `GET /api/registry/models` — 등록된 모델 전체 목록
- [ ] `GET /api/registry/{model_name}/versions` — 버전 히스토리
- [ ] `PUT /api/registry/{model_name}/stage` — 스테이지 변경 (Staging/Production/Archived)
- [ ] `POST /api/registry/{model_name}/rollback` — 이전 버전으로 롤백

### B-08: 홈 대시보드 API
- [x] `GET /api/dashboard/models` — Production 모델 전체 + 드리프트 점수 반환
- [x] `GET /api/dashboard/stats` — 오늘 총 예측 건수, 운영 모델 수 등 통계

---

## Phase 2 — Frontend 개발 (FRONTEND)

### F-01: 공통 레이아웃
- [x] `components/layout/Sidebar.jsx` — 사이드바 네비게이션 (9개 화면 링크)
- [x] `components/layout/Header.jsx` — 화면 제목, 스텝 점 내비, 이전/다음 버튼
- [x] `components/layout/AppShell.jsx` — Sidebar + Header + 콘텐츠 영역 조합
- [x] `App.jsx` — React Router 설정 (9개 라우트)

### F-02: 공통 UI 컴포넌트
- [x] `components/ui/Button.jsx` — Primary / Outline / Ghost 변형
- [x] `components/ui/Badge.jsx` — 모듈 타입, 스테이지 배지
- [x] `components/ui/Field.jsx` — 라벨 + 인풋/셀렉트/토글 통합
- [x] `components/ui/Slider.jsx` — 범위 슬라이더 + 현재값 표시
- [x] `components/ui/ApiTag.jsx` — GET/POST/WS 메서드 + 경로 표시 칩
- [x] `components/ui/CodeBlock.jsx` — 모노스페이스 코드 미리보기 박스
- [x] `components/ui/ProgressBar.jsx` — 레이블 + 비율 막대
- [x] `components/ui/Spinner.jsx` — 로딩 스피너

### F-03: 차트 컴포넌트
- [x] `components/charts/RadarCompare.jsx` — recharts RadarChart (모델 비교)
- [x] `components/charts/Sparkline.jsx` — 미니 성능 추세선
- [x] `components/charts/DriftGauge.jsx` — 드리프트 점수 게이지 바
- [x] `components/charts/OptunaScatter.jsx` — recharts ScatterChart (trial 결과)
- [x] `components/charts/ConfusionMatrix.jsx` — 2×2 혼동행렬 시각화

### F-04: 화면 1 — 홈 대시보드 (`pages/HomePage.jsx`)
- [x] `ModelCardGrid.jsx` — 2열 모델 카드 그리드
- [x] `ModelCard.jsx` — 모델 정보 + Sparkline + DriftGauge + 알림 배지
- [x] `ModelDetailPanel.jsx` — 우측 탭 패널 (예측실행/모델정보/드리프트/버전관리)
- [x] `StagingAlertBar.jsx` — Staging 대기 모델 알림 바
- [x] `GET /api/dashboard/models` 연동

### F-05: 화면 2 — 데이터 업로드 (`pages/UploadPage.jsx`)
- [x] `FileDropzone.jsx` — react-dropzone 기반 드래그앤드롭
- [x] `DataQualitySummary.jsx` — 행/열/결측/중복 수 통계 카드
- [x] `ColumnTypeTable.jsx` — 컬럼별 타입 감지 결과 + 강제 변경 드롭다운
- [x] `DataPreviewTable.jsx` — 상위 50행 미리보기 (결측값 하이라이트)
- [x] `POST /api/data/upload` + `GET /api/data/{id}/preview` 연동

### F-06: 화면 3 — 실험 설정 (`pages/SetupPage.jsx`)
- [x] `ModuleSelector.jsx` — 분류/회귀/클러스터링/이상탐지/시계열 탭
- [x] `BasicSettingsForm.jsx` — target, experiment_name, train_size, fold
- [x] `PreprocessingForm.jsx` — normalize, fix_imbalance, remove_outliers 등
- [x] `CodePreviewPanel.jsx` — 실시간 setup() Python 코드 자동 생성 표시
- [x] `SetupResultToast.jsx` — setup() 완료 후 결과 토스트 메시지
- [x] `POST /api/train/setup` + `GET /api/train/setup/{id}/code` 연동

### F-07: 화면 4 — 모델 비교 (`pages/ComparePage.jsx`)
- [ ] `CompareOptionsPanel.jsx` — sort, budget_time, n_select, exclude 설정
- [ ] `LeaderboardTable.jsx` — 알고리즘 × 지표 테이블 (체크박스 선택)
- [ ] `useSSECompare.js` — SSE 훅 (실시간 행 추가)
- [ ] `RadarCompare.jsx` — 선택 모델 레이더 차트
- [ ] `MLflowRunLinks.jsx` — run_id 링크 목록
- [ ] `POST /api/train/compare` + `GET /api/train/compare/{id}/stream` SSE 연동

### F-08: 화면 5 — 학습·튜닝 (`pages/TunePage.jsx`)
- [ ] `TuneOptionsPanel.jsx` — optimize, search_library, n_iter, choose_better
- [ ] `ModelSelectFromCompare.jsx` — compare 결과 모델 체크박스 선택
- [ ] `OptunaScatterChart.jsx` — trial별 점수 실시간 산점도
- [ ] `useSSETune.js` — SSE 훅 (trial 실시간)
- [ ] `TuneBeforeAfter.jsx` — 지표 Before/After 비교 테이블
- [ ] `HyperparamsDiff.jsx` — 변경된 하이퍼파라미터 diff 표시
- [ ] `POST /api/train/tune` + SSE 연동

### F-09: 화면 6 — 모델 분석 (`pages/AnalyzePage.jsx`)
- [ ] `PlotSelector.jsx` — 분류/회귀별 플롯 목록 사이드 탭
- [ ] `PlotRenderArea.jsx` — base64 PNG 이미지 렌더링 영역
- [ ] `ShapWaterfall.jsx` — 단건 SHAP Waterfall 시각화
- [ ] `ShapIndexSelector.jsx` — 분석할 행 번호 선택
- [ ] `TrainTestToggle.jsx` — use_train_data 토글
- [ ] `POST /api/analyze/plot` + `POST /api/analyze/interpret` 연동

### F-10: 화면 7 — 모델 확정 (`pages/FinalizePage.jsx`)
- [ ] `SelectedModelCard.jsx` — 확정 대상 모델 요약 카드
- [ ] `FinalizeButton.jsx` — finalize_model() 실행 버튼 + 결과 표시
- [ ] `SaveModelForm.jsx` — 파일명, 저장 경로 입력
- [ ] `MLflowRegisterForm.jsx` — 레지스트리 모델명 입력 + 등록 버튼
- [ ] `StageManager.jsx` — None/Staging/Production/Archived 토글
- [ ] `VersionTimeline.jsx` — 버전 히스토리 + 롤백 버튼
- [ ] `PipelineSummary.jsx` — 저장된 파이프라인 구성 단계 표시
- [ ] `POST /api/train/finalize/{id}` + `POST /api/registry/register` 연동

### F-11: 화면 8 — 예측 실행 (`pages/PredictPage.jsx`)
- [ ] `ModelSelector.jsx` — Production 모델 드롭다운 + 메타 카드
- [ ] `ThresholdSlider.jsx` — probability_threshold 슬라이더 (실시간 재필터)
- [ ] `SinglePredictForm.jsx` — 피처별 동적 입력 폼 (수치/범주 자동 구분)
- [ ] `PredictResultCard.jsx` — 예측 결과 + 확률 게이지
- [ ] `BatchUploadDropzone.jsx` — 배치 CSV 업로드
- [ ] `BatchResultTable.jsx` — Label/Score 컬럼 추가 결과 테이블 + CSV 다운로드
- [ ] `PredictionHistory.jsx` — 최근 100건 예측 이력 테이블
- [ ] `POST /api/predict/{model_name}` + `POST /api/predict/{model_name}/batch` 연동

### F-12: 화면 9 — MLflow 관리 (`pages/MLflowPage.jsx`)
- [ ] `ExperimentLogTable.jsx` — run 목록 + 필터 (날짜/모듈/지표)
- [ ] `ExperimentCompareView.jsx` — 레이더차트 + 파라미터 diff
- [ ] `ModelRegistryList.jsx` — 등록 모델 목록 + 스테이지 변경
- [ ] `ScheduleManager.jsx` — APScheduler 스케줄 목록 + 편집
- [ ] `GET /api/dashboard/models` + Registry API 연동

---

## Phase 3 — MLOps (MLOPS)

### M-01: 드리프트 감지
- [ ] `services/drift_service.py` — Evidently AI DataDriftPreset 래퍼
- [ ] `POST /api/drift/check/{model_name}` — 드리프트 점수 계산 반환
- [ ] 드리프트 점수 DB 저장 (TrainedModel.drift_score 컬럼 추가)
- [ ] 홈 대시보드 DriftGauge 실제 데이터 연동

### M-02: 자동 스케줄
- [ ] `services/scheduler.py` — APScheduler 설정 (FastAPI lifespan)
- [ ] 주간 드리프트 체크 작업 등록 (매주 월 09:00)
- [ ] 드리프트 > 40% 시 자동 재학습 트리거 작업
- [ ] `GET /api/schedule/jobs` — 스케줄 목록 조회

### M-03: PDF 리포트
- [ ] `services/report_service.py` — Jinja2 템플릿 → WeasyPrint PDF
- [ ] `templates/report.html` — 리포트 HTML 템플릿
- [ ] `GET /api/report/{model_id}` — PDF 파일 다운로드

---

## 완료된 작업 로그

| 날짜 | 작업 | 담당 에이전트 |
|------|------|-------------|
| 2026-03-09 | SETUP S-01, S-03, S-04, S-05 완료 / B-01, B-02, B-04 일부, B-08 구현 및 검증 / F-01, F-02, F-03, F-04, F-05, F-06 구현 | Codex |

---

## 에러 로그

에러 발생 시 아래에 기록:

```
# 형식
## [날짜] 태스크 ID
증상: ...
원인: ...
해결: ...
```
