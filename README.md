# Manufacturing AI Studio

제조 공정 데이터를 대상으로 `PyCaret + FastAPI + React + MLflow` 기반의 로컬 AutoML / MLOps 워크벤치를 제공하는 프로젝트입니다.

## 현재 상태

- 기준 문서상 MVP 범위는 [D:\GITHUB\mfgstudio\PROGRESS.md](D:/GITHUB/mfgstudio/PROGRESS.md) 기준 `76 / 76` 완료입니다.
- 그 이후 고도화 작업도 계속 진행 중이며, 현재는 다음이 추가로 구현되어 있습니다.
  - 실제 MLflow run / registry 연동
  - PyCaret experiment persistence
  - 동적 모델 카탈로그
  - `blend / stack / automl`
  - `calibrate_model / optimize_threshold`
  - 모듈별 샘플 데이터 5종
  - 클러스터링 / 이상탐지 / 시계열 전용 compare / analyze / finalize 보강
  - 시계열 plotly 기반 분석 플롯 정비

## 주요 스택

| 영역 | 구성 |
|------|------|
| Frontend | React 18, Vite, Zustand, Recharts |
| Backend | FastAPI, SQLAlchemy, Uvicorn |
| ML | PyCaret 3.3.2, scikit-learn, SHAP |
| MLOps | MLflow 2.11 |
| Storage | SQLite, local artifact files |
| Runtime | Docker Compose |

## 실행 주소

| 서비스 | 주소 |
|--------|------|
| Frontend | `http://localhost:5273` |
| Backend API | `http://localhost:8000` |
| Backend Docs | `http://localhost:8000/docs` |
| MLflow UI | `http://localhost:5000` |

## 현재 구현 흐름

1. 데이터 업로드
2. 실험 설정 `setup()`
3. 모델 비교 `compare_models()` 또는 모듈별 대체 compare 흐름
4. 학습 / 튜닝 `tune_model()`
5. 모델 분석 / XAI `plot_model()`, SHAP, PFI, dependence
6. 모델 확정 `finalize_model()`
7. 레지스트리 등록 / stage 관리
8. 단건 / 배치 예측
9. MLflow 운영 및 모니터링

## 모듈별 상태

| 모듈 | 현재 상태 |
|------|-----------|
| 분류 | `setup / compare / tune / analyze / finalize / predict` 동작 |
| 회귀 | `setup / compare / tune / analyze / finalize / predict` 동작 |
| 클러스터링 | `setup / compare / analyze / finalize` 동작, `tune`은 PyCaret 비지원 |
| 이상탐지 | `setup / compare / analyze / finalize` 동작, `tune`은 PyCaret 비지원 |
| 시계열 | `setup / compare / tune / analyze / finalize` 동작, plotly 기반 시각화 적용 |

## 현재 화면 기준

- 사용자 화면의 기본 운영 모델 카탈로그는 `manufacturing_model` 중심으로 정리되어 있습니다.
- 앱 내부 MLflow 관리 화면과 실제 MLflow 서버가 연동되어 있습니다.
- 브라우저 콘솔의 `chrome-extension://... postMessage` 오류는 앱 문제가 아니라 확장 프로그램 노이즈입니다.

## 샘플 데이터

테스트용 샘플 CSV는 [D:\GITHUB\mfgstudio\data\samples\README.md](D:/GITHUB/mfgstudio/data/samples/README.md)에 정리되어 있습니다.

- [D:\GITHUB\mfgstudio\data\samples\classification_sample.csv](D:/GITHUB/mfgstudio/data/samples/classification_sample.csv)
- [D:\GITHUB\mfgstudio\data\samples\regression_sample.csv](D:/GITHUB/mfgstudio/data/samples/regression_sample.csv)
- [D:\GITHUB\mfgstudio\data\samples\clustering_sample.csv](D:/GITHUB/mfgstudio/data/samples/clustering_sample.csv)
- [D:\GITHUB\mfgstudio\data\samples\anomaly_sample.csv](D:/GITHUB/mfgstudio/data/samples/anomaly_sample.csv)
- [D:\GITHUB\mfgstudio\data\samples\timeseries_sample.csv](D:/GITHUB/mfgstudio/data/samples/timeseries_sample.csv)

## 문서

| 파일 | 용도 |
|------|------|
| [D:\GITHUB\mfgstudio\PROGRESS.md](D:/GITHUB/mfgstudio/PROGRESS.md) | 전체 진행 현황과 완료 로그 |
| [D:\GITHUB\mfgstudio\HANDOFF.md](D:/GITHUB/mfgstudio/HANDOFF.md) | 다음 세션 인수인계 |
| [D:\GITHUB\mfgstudio\NEXT_DEVELOPMENT_PLAN.md](D:/GITHUB/mfgstudio/NEXT_DEVELOPMENT_PLAN.md) | 다음 개발 단계와 우선순위 |
| [D:\GITHUB\mfgstudio\ARCHITECTURE.md](D:/GITHUB/mfgstudio/ARCHITECTURE.md) | 아키텍처 / API / 데이터 구조 |
| [D:\GITHUB\mfgstudio\SETUP.md](D:/GITHUB/mfgstudio/SETUP.md) | 설치 / 실행 방법 |
| [D:\GITHUB\mfgstudio\SCREENS.md](D:/GITHUB/mfgstudio/SCREENS.md) | 화면 설계 기준 |
| [D:\GITHUB\mfgstudio\BACKEND.md](D:/GITHUB/mfgstudio/BACKEND.md) | 백엔드 구현 기준 |
| [D:\GITHUB\mfgstudio\FRONTEND.md](D:/GITHUB/mfgstudio/FRONTEND.md) | 프론트 구현 기준 |

## 실행

```powershell
cd D:\GITHUB\mfgstudio
docker compose up --build -d
```

종료:

```powershell
cd D:\GITHUB\mfgstudio
docker compose down
```
