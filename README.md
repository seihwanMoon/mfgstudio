# Manufacturing AI Studio

제조 공정 데이터를 대상으로 `PyCaret + FastAPI + React + MLflow` 기반의 로컬 AutoML/MLOps 워크벤치를 제공하는 프로젝트입니다.

## 현재 상태

- 전체 구현 범위는 [PROGRESS.md](D:/GITHUB/mfgstudio/PROGRESS.md) 기준 `76 / 76` 완료입니다.
- 사용자 화면 기준 활성 카탈로그에는 현재 `manufacturing_model`만 노출됩니다.
- 실제 MLflow 서버에도 `manufacturing_model` 버전 1~3이 등록되어 있습니다.
- 프론트, 백엔드, MLflow 컨테이너는 Docker에서 기동됩니다.
- 최근 주요 보완:
  - 파란 계열 라이트/다크 테마
  - 실제 PyCaret 기반 `setup/compare/tune/analyze/finalize/predict`
  - 회귀/분류별 플롯 분기
  - SHAP 타깃 누수 수정
  - 한글 컬럼 정규화 및 matplotlib 한글 폰트 대응
  - 예측 화면의 finalized 모델 필터링 및 동적 입력 스키마
  - 테스트/샘플 모델의 사용자 화면 노출 제거

## 기술 스택

| 영역 | 구성 |
|------|------|
| Frontend | React 18, Vite, Zustand, Recharts |
| Backend | FastAPI, SQLAlchemy, Uvicorn |
| ML | PyCaret 3.3.2, scikit-learn, SHAP |
| MLOps | MLflow 2.11 |
| Storage | SQLite, local artifact files |
| Runtime | Docker Compose |

## 실행 포트

| 서비스 | 주소 |
|--------|------|
| Frontend | `http://localhost:5273` |
| Backend API | `http://localhost:8000` |
| Backend Docs | `http://localhost:8000/docs` |
| MLflow UI | `http://localhost:5000` |

## 주요 사용자 흐름

1. 데이터 업로드
2. 실험 설정 `setup()`
3. 모델 비교 `compare_models()`
4. 학습/튜닝 `tune_model()`
5. 모델 분석 / XAI `plot_model() + SHAP`
6. 모델 확정 `finalize_model()`
7. 레지스트리 등록 / 스테이지 관리
8. 단건/배치 예측
9. MLflow 운영 확인

## 현재 구현 범위

### 데이터

- CSV / Excel 업로드
- parquet 변환 저장
- 미리보기, 품질 요약, 컬럼 타입 수정

### 학습

- PyCaret `setup()`
- PyCaret `compare_models()`
- PyCaret `create_model() + tune_model()`
- 실시간 SSE 기반 compare / tune 진행 표시

### 분석 / XAI

- PyCaret `plot_model()` 기반 회귀/분류 플롯
- SHAP 단건 설명
- 한글 컬럼명 정규화 처리

### 모델 운영

- `finalize_model()` 및 로컬 모델 저장
- 레지스트리 등록 / 버전 / stage 관리
- 단건 / 배치 예측
- 드리프트 점수, 스케줄러, PDF 리포트

## 현재 알려진 상태

### 사용자 화면 기준

- 홈 / 예측 / 앱 내부 MLflow 관리 화면은 `manufacturing_model` 중심으로 정리되어 있습니다.
- 브라우저 콘솔의 `chrome-extension://... postMessage` 오류는 앱 오류가 아니라 브라우저 확장 프로그램 오류입니다.

### 실제 MLflow 서버 기준

- `finalize -> register -> stage` 흐름이 실제 MLflow run / registry와 연결되었습니다.
- 기존 `manufacturing_model` 버전 1~3도 백필되어 MLflow UI에서 확인할 수 있습니다.
- 현재 `manufacturing_model` 최신 버전은 `v3 / Production`입니다.
- 다음 우선 작업은 compare / tune 단계의 MLflow run 연결 정밀화와 운영 리포트 고도화입니다.

## 개발 문서

| 파일 | 용도 |
|------|------|
| [PROGRESS.md](D:/GITHUB/mfgstudio/PROGRESS.md) | 전체 태스크 완료 현황과 작업 로그 |
| [HANDOFF.md](D:/GITHUB/mfgstudio/HANDOFF.md) | 다음 세션 인수인계 |
| [ARCHITECTURE.md](D:/GITHUB/mfgstudio/ARCHITECTURE.md) | 아키텍처 / API / 데이터 구조 |
| [SETUP.md](D:/GITHUB/mfgstudio/SETUP.md) | 설치 및 실행 |
| [SCREENS.md](D:/GITHUB/mfgstudio/SCREENS.md) | 화면 설계 기준 |
| [BACKEND.md](D:/GITHUB/mfgstudio/BACKEND.md) | 백엔드 구현 기준 |
| [FRONTEND.md](D:/GITHUB/mfgstudio/FRONTEND.md) | 프론트 구현 기준 |

## 로컬 실행

```powershell
cd D:\GITHUB\mfgstudio
docker compose up --build -d
```

정지:

```powershell
cd D:\GITHUB\mfgstudio
docker compose down
```
