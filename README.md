# Manufacturing AI Studio — 개발 문서

> **AI 코딩 에이전트를 위한 마스터 가이드**
> 항상 이 파일을 먼저 읽고, PROGRESS.md를 확인한 후 작업을 시작하세요.

---

## 제품 개요

**Manufacturing AI Studio**는 IT 비전공 중소 제조기업 담당자가 엑셀/CSV 데이터만으로 AI 모델을 스스로 만들고 운영할 수 있는 로컬 AutoML + MLOps 플랫폼입니다.

### 핵심 가치
- 코드 없이 PyCaret의 전체 ML 워크플로우를 GUI로 실행
- MLflow로 모든 실험을 자동 추적·비교
- 4개 이상의 모델을 동시에 Production 서비스
- 완전 로컬 실행 (인터넷 연결·유료 서비스 불필요)

### 지원 ML 모듈
| 모듈 | 제조업 활용 사례 |
|------|----------------|
| 분류 (Classification) | 불량/정상 판별, 등급 분류 |
| 회귀 (Regression) | 수율 예측, 품질 수치 예측 |
| 이상탐지 (Anomaly Detection) | 설비 고장 징후 탐지 |
| 클러스터링 (Clustering) | 공정 패턴 그룹화 |
| 시계열 (Time Series) | 수요 예측, 생산량 예측 |

---

## 기술 스택

```
Frontend   React 18 + Vite + TailwindCSS + Zustand + Recharts
Backend    FastAPI (Python 3.11) + Uvicorn
ML Engine  PyCaret 3.0 (pycaret[full])
MLOps      MLflow 2.11 (로컬 서버)
Database   SQLite (SQLAlchemy 2.0)
패키징     Docker Desktop + docker-compose
```

### 포트 배분
| 서비스 | 포트 |
|--------|------|
| Frontend (Vite dev) | 3000 |
| Backend (FastAPI) | 8000 |
| MLflow UI | 5000 |

---

## 전체 화면 구성 (9개 화면)

```
① 홈 대시보드      → 다중 운영 모델 모니터링, 빠른 예측 진입
② 데이터 업로드    → CSV/Excel 업로드, 타입 감지, 품질 분석
③ 실험 설정        → setup() 파라미터 GUI + 코드 미리보기
④ 모델 비교        → compare_models() 리더보드 (SSE 실시간)
⑤ 학습·튜닝        → tune_model() + Optuna 산점도
⑥ 모델 분석        → plot_model() + interpret_model() (SHAP)
⑦ 모델 확정        → finalize_model() + MLflow Registry 등록
⑧ 예측 실행        → predict_model() 단건/배치/이력
⑨ MLflow 관리      → 실험 로그, 비교, 레지스트리, 스케줄
```

화면 상세 레이아웃 → **SCREENS.md** 참조
API 엔드포인트 → **BACKEND.md** 참조
컴포넌트 구조 → **FRONTEND.md** 참조

---

## 폴더 구조 (목표)

```
mfg-ai-studio/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── main.py                  # FastAPI 앱 진입점
│   ├── database.py              # SQLAlchemy 설정
│   ├── models/                  # DB 모델 (SQLAlchemy ORM)
│   │   ├── experiment.py
│   │   ├── dataset.py
│   │   ├── trained_model.py
│   │   └── prediction.py
│   ├── routers/                 # API 라우터
│   │   ├── data.py              # /api/data/*
│   │   ├── train.py             # /api/train/*
│   │   ├── analyze.py           # /api/analyze/*
│   │   ├── predict.py           # /api/predict/*
│   │   └── registry.py          # /api/registry/*
│   ├── services/                # 비즈니스 로직
│   │   ├── pycaret_service.py   # PyCaret 래퍼
│   │   ├── mlflow_service.py    # MLflow 연동
│   │   ├── data_service.py      # 파일 처리
│   │   └── report_service.py    # PDF 생성
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx              # 라우팅
│   │   ├── store/
│   │   │   └── useStore.js      # Zustand 전역 상태
│   │   ├── api/
│   │   │   └── client.js        # Axios 인스턴스 + SSE
│   │   ├── pages/               # 9개 화면 (Page 컴포넌트)
│   │   │   ├── HomePage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── SetupPage.jsx
│   │   │   ├── ComparePage.jsx
│   │   │   ├── TunePage.jsx
│   │   │   ├── AnalyzePage.jsx
│   │   │   ├── FinalizePage.jsx
│   │   │   ├── PredictPage.jsx
│   │   │   └── MLflowPage.jsx
│   │   └── components/          # 공유 컴포넌트
│   │       ├── layout/
│   │       ├── charts/
│   │       ├── forms/
│   │       └── ui/
│
├── data/                        # 런타임 데이터 (Docker volume)
│   ├── uploads/
│   ├── models/
│   └── manufacturing_ai.db
│
└── mlruns/                      # MLflow 로컬 추적 데이터
```

---

## 에이전트 작업 규칙

### 필수 규칙
1. **작업 시작 전** 반드시 `PROGRESS.md`를 열어 현재 상태 확인
2. **작업 완료 후** 해당 체크박스를 `[x]`로 업데이트
3. 한 번에 하나의 태스크만 처리 (의존성 순서 준수)
4. 에러 발생 시 `PROGRESS.md`에 에러 내용을 메모로 기록

### 코드 작성 원칙
- 모든 PyCaret 호출은 `services/pycaret_service.py`에 집중
- 모든 MLflow 연동은 `services/mlflow_service.py`에 집중
- API 라우터는 서비스 함수를 호출만 할 것 (비즈니스 로직 금지)
- 프론트엔드 상태는 Zustand store에서만 관리
- 하드코딩 금지 — 모든 설정값은 `.env` 또는 `config.py`에서 관리

### 파일 수정 금지 목록
- `PROGRESS.md` 체크박스 외 구조 변경 금지
- `ARCHITECTURE.md` — 아키텍처 결정 변경 시 먼저 주석으로 논의
- `.env` 파일 — 실제 키값 절대 커밋 금지

---

## 최소 실행 환경

| 항목 | 최소 사양 |
|------|----------|
| OS | Windows 10 64bit / macOS 12+ / Ubuntu 20.04+ |
| CPU | Intel i5 4코어 이상 |
| RAM | 8GB (16GB 권장) |
| 저장공간 | 10GB 여유 |
| 소프트웨어 | Docker Desktop v4+, Chrome 90+ |

---

## 빠른 시작

```bash
# 1. 저장소 클론
git clone <repo-url> mfg-ai-studio
cd mfg-ai-studio

# 2. 환경 변수 설정
cp .env.example .env

# 3. Docker 실행
docker-compose up --build

# 4. 브라우저 열기
# Frontend: http://localhost:3000
# Backend API Docs: http://localhost:8000/docs
# MLflow UI: http://localhost:5000
```

---

## 문서 목록

| 파일 | 설명 |
|------|------|
| `README.md` | 이 파일 — 전체 개요 및 에이전트 지침 |
| `PROGRESS.md` | 태스크 진척 트래커 (항상 열어두기) |
| `ARCHITECTURE.md` | DB 스키마, API 전체 목록, 데이터 흐름 |
| `SETUP.md` | Docker, 환경 설정, 초기 실행 스크립트 |
| `SCREENS.md` | 9개 화면 컴포넌트 레이아웃 상세 |
| `BACKEND.md` | FastAPI 라우터, PyCaret 서비스 코드 템플릿 |
| `FRONTEND.md` | React 컴포넌트 구조, Zustand 스토어, API 연결 |
