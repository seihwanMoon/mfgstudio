# SCREENS — 화면 레이아웃 상세 설계

> 각 화면의 컴포넌트 구성, 레이아웃, API 연결 포인트를 정의합니다.
> 와이어프레임 확인: `wireframe_all_screens.jsx` 참조

---

## 화면 이동 흐름

```
홈 대시보드
    │
    ├─ [+ 새 모델 추가] ──→ ② 데이터 업로드
    └─ [예측하기] ────────→ ⑧ 예측 실행

② 데이터 업로드 → ③ 실험 설정 → ④ 모델 비교 → ⑤ 학습·튜닝
                                                      │
                                              ┌───────┴───────┐
                                           ⑥ 모델 분석    ⑦ 모델 확정
                                                              │
                                                       ⑧ 예측 실행

⑨ MLflow 관리 (사이드바에서 언제든 접근 가능)
```

---

## ① 홈 대시보드 (`pages/HomePage.jsx`)

### 레이아웃
```
┌─────────────────────────────────────────────────────────────┐
│ StagingAlertBar (Staging 모델 존재 시 노출)                  │
├──────────────────────────────┬──────────────────────────────┤
│ ModelCardGrid (55%)          │ ModelDetailPanel (45%)        │
│                              │                              │
│ ┌──────────┐ ┌──────────┐    │ [탭] 예측실행|모델정보|      │
│ │ModelCard │ │ModelCard │    │      드리프트|버전관리       │
│ └──────────┘ └──────────┘    │                              │
│ ┌──────────┐ ┌──────────┐    │ (선택된 모델 상세 정보)      │
│ │ModelCard │ │ModelCard │    │                              │
│ └──────────┘ └──────────┘    │                              │
│                              │                              │
│ MultiModelServingNote        │                              │
└──────────────────────────────┴──────────────────────────────┘
```

### 컴포넌트 명세

**`StagingAlertBar`**
- 조건: Staging 스테이지 모델이 1개 이상 존재할 때만 렌더링
- 표시: 모델명, 알고리즘, 지표 값, 현재 Production과 비교
- 버튼: [승격] → `PUT /api/registry/{name}/stage` body: `{ stage: "Production" }`

**`ModelCard`** (클릭 시 ModelDetailPanel 업데이트)
- 상단: 모듈타입 배지, 버전, 알림 배지(⚠ N)
- 중단: 모델명, 알고리즘, 핵심 지표 값 (대형 숫자), 오늘 예측 건수
- 하단: 드리프트 게이지 바 + 상태 (정상/주의/위험)
- 드리프트 색상 규칙: `< 0.2` → 초록 / `0.2~0.4` → 노랑 / `> 0.4` → 빨강

**`ModelDetailPanel`** (우측 패널)
- 탭 1 `예측 실행`: 엔드포인트 주소, 오늘/누적 예측 수, 단건/배치/실시간 버튼
- 탭 2 `모델 정보`: 알고리즘, 버전, 스테이지, 학습일, 데이터 행 수 등 key-value
- 탭 3 `드리프트`: 드리프트 세부 지표 3개, 위험 시 [재학습하기] 버튼
- 탭 4 `버전 관리`: 버전 히스토리 + 각 버전 [롤백] 버튼

### API 연결
```
GET /api/dashboard/models   → productionModels (Zustand)
GET /api/dashboard/stats    → 상단 통계 (운영 모델 수, 오늘 예측 수)
PUT /api/registry/{name}/stage  → 승격/롤백
```

---

## ② 데이터 업로드 (`pages/UploadPage.jsx`)

### 레이아웃
```
┌───────────────────────────────────┬────────────────────────┐
│ 메인 영역 (58%)                    │ 미리보기 (42%)          │
│                                   │                        │
│ FileDropzone                      │ DataPreviewTable       │
│ (드래그앤드롭)                     │ (상위 50행)            │
│                                   │                        │
│ DataQualitySummary                │ (결측값 노란 배경)      │
│ (7개 통계 카드)                    │                        │
│                                   │                        │
│ ColumnTypeTable                   │                        │
│ (컬럼 타입 + 무시 체크박스)         │   [다음: 실험 설정 →]  │
└───────────────────────────────────┴────────────────────────┘
```

### 컴포넌트 명세

**`FileDropzone`**
- 허용: `.csv`, `.xlsx`, `.xls`
- 용량: 최대 200MB
- 업로드 후: chardet 인코딩 감지 결과 토스트 표시
- 샘플 데이터 버튼: 불량예측 예시 CSV 다운로드

**`DataQualitySummary`**
- 통계 7개: 총 행, 총 열, 결측 컬럼 수, 중복 행, 수치형, 범주형, 날짜형
- 결측/중복 > 0인 경우 해당 카드 노란 배경

**`ColumnTypeTable`**
- 컬럼: 컬럼명 / 감지 타입 배지 / 결측률 / 고유값 수 / [무시] 체크박스
- 타입 배지: 숫자(파란색) / 범주(노란색) / 날짜(보라색)
- 결측률 > 5%: 빨간 텍스트
- 타입 변경: 배지 클릭 → 드롭다운 (숫자/범주/날짜/무시)
- 무시 체크박스: ignore_features에 추가

**`DataPreviewTable`** (오른쪽)
- `@tanstack/react-table` 사용
- 결측값(`NaN`, `None`, 빈 문자열): 노란 배경 셀
- 스크롤 가능 (고정 헤더)

### API 연결
```
POST /api/data/upload             → { dataset_id, filename, encoding }
GET  /api/data/{id}/preview       → { columns: [{name, type, missing_pct}], rows: [] }
GET  /api/data/{id}/quality       → { row_count, col_count, missing_cols, duplicate_rows, ... }
PATCH /api/data/{id}/columns      → body: { overrides: { col: type } }
```

### 상태 전환
- 업로드 성공 → `useStore.setDatasetId(id)` + `setUploadedDataset(data)`
- [다음] 버튼 → `navigate('/setup')`

---

## ③ 실험 설정 (`pages/SetupPage.jsx`)

### 레이아웃
```
┌─────────────────────────────────┬──────────────────────────┐
│ 설정 폼 (62%)                   │ 코드 미리보기 (38%)        │
│                                 │                          │
│ ModuleSelector (탭 5개)         │ CodePreviewPanel         │
│                                 │ (Python 코드 실시간)     │
│ BasicSettingsForm               │                          │
│ - 타겟 컬럼                      │                          │
│ - 실험 이름                      │ SetupResultSummary       │
│ - train_size 슬라이더            │ (setup() 완료 후 표시)   │
│ - fold 입력                     │                          │
│ - session_id                   │                          │
│                                 │                          │
│ PreprocessingForm               │                          │
│ - 결측값 처리                    │                          │
│ - 정규화                         │                          │
│ - 이상치 제거                    │                          │
│ - SMOTE                         │                          │
│                                 │                          │
│ [← 업로드]  [setup() 실행 →]    │                          │
└─────────────────────────────────┴──────────────────────────┘
```

### 컴포넌트 명세

**`ModuleSelector`**
- 탭 5개: 분류 / 회귀 / 클러스터링 / 이상탐지 / 시계열
- 선택 시: 타겟 컬럼 필드 표시 여부 변경 (클러스터링/이상탐지는 숨김)

**`CodePreviewPanel`** ⭐ 핵심 기능
- setupParams 변경마다 자동 재생성
- 생성 함수: `generateSetupCode(setupParams, module_type)`
- 구문 하이라이팅: 키워드(보라)/문자열(초록)/숫자(노랑)/주석(회색)
- 복사 버튼

**`SetupResultSummary`**
- setup() 완료 후에만 노출
- 표시: 변환 후 데이터 shape, 파이프라인 단계, 타겟 분포

### API 연결
```
POST /api/train/setup      → { experiment_id, pipeline_steps, transformed_shape }
GET  /api/train/setup/{id}/code  → { code: "from pycaret..." }
```

### 상태 전환
- setup() 성공 → `useStore.setExperimentId(id)`
- 자동 이동 → `navigate('/compare')`

---

## ④ 모델 비교 (`pages/ComparePage.jsx`)

### 레이아웃
```
┌────────────┬──────────────────────────────┬──────────────┐
│ 옵션 (22%) │ 리더보드 (54%)               │ 시각화 (24%) │
│            │                              │              │
│ sort 선택  │ LeaderboardTable             │ RadarCompare │
│ n_select   │ (실시간 행 추가)              │              │
│ budget_time│                              │ MLflow Links │
│ exclude    │ ─ 알고리즘 × 지표 ─          │              │
│            │ ★ LightGBM   0.9241 ...     │              │
│ [▶ 시작]   │   CatBoost   0.9187 ...     │              │
│            │   XGBoost    0.9103 ...     │              │
│ 진행 표시  │                              │              │
│ ████░ 8/12 │ [선택 모델 튜닝 →]           │              │
└────────────┴──────────────────────────────┴──────────────┘
```

### 컴포넌트 명세

**`LeaderboardTable`**
- 컬럼: 선택 체크박스 / 순위 / 알고리즘 / Accuracy / AUC / Recall / Precision / F1 / TT(s)
- SSE 수신 시 행이 순서대로 추가됨 (`addCompareResult()`)
- 1위 행: 골드 배경, ★ 아이콘
- 체크박스: 최대 3개 선택 (튜닝 대상)
- 지표명 클릭: 해당 컬럼 기준 정렬

**`useSSECompare` 훅**
```js
// hooks/useSSECompare.js
import { useEffect } from "react";
import { createSSEStream } from "../api/client";
import useStore from "../store/useStore";

export function useSSECompare(experimentId, enabled) {
  const { addCompareResult, clearCompareResults } = useStore();

  useEffect(() => {
    if (!enabled || !experimentId) return;
    clearCompareResults();

    const cleanup = createSSEStream(
      `/api/train/compare/${experimentId}/stream`,
      (data) => addCompareResult(data),     // model_result 이벤트
      (data) => console.log("완료:", data), // done 이벤트
      (err) => console.error("SSE 에러:", err)
    );

    return cleanup;
  }, [experimentId, enabled]);
}
```

### API 연결
```
POST /api/train/compare                  → { job_id }
GET  /api/train/compare/{id}/stream      → SSE 스트림
GET  /api/train/compare/{id}/result      → 최종 리더보드
```

---

## ⑤ 학습·튜닝 (`pages/TunePage.jsx`)

### 레이아웃
```
┌────────────┬──────────────────────────────┬──────────────┐
│ 옵션 (23%) │ 튜닝 진행 (52%)              │ 파라미터(25%)│
│            │                              │              │
│ 모델 선택  │ OptunaScatterChart           │ HyperparamsDiff│
│ (compare   │ (trial 실시간 산점도)         │              │
│  결과 목록)│                              │ 변경된 파라미터│
│ optimize   │ TuneBeforeAfter              │ diff 표시    │
│ n_iter     │ (Before/After 지표 비교)     │              │
│ early_stop │                              │              │
│ choose_bet │ [분석 →]  [이 모델로 확정 →] │              │
│            │                              │              │
│ 앙상블 옵션│                              │              │
│            │                              │              │
│ [◎ 시작]   │                              │              │
└────────────┴──────────────────────────────┴──────────────┘
```

### 컴포넌트 명세

**`OptunaScatterChart`**
- x축: Trial 번호, y축: 최적화 지표 값
- 실시간 점 추가 (SSE 수신 시)
- 현재 최고 trial: 크고 밝은 점
- recharts ScatterChart 사용

**`TuneBeforeAfter`**
- 지표 4개: Accuracy, AUC, F1, Recall
- 컬럼: 지표명 / Before(회색) / After(초록) / 개선율(↑ +X%)
- choose_better=True 적용 시: 개선 없을 경우 "원본 유지" 배지

**`useSSETune` 훅**
```js
// trial SSE → addTuneTrial(trial) 호출
// done SSE → setTuneResult(result) 호출
```

### API 연결
```
POST /api/train/tune             → { job_id }
GET  /api/train/tune/{id}/stream → SSE (trial events)
```

---

## ⑥ 모델 분석 (`pages/AnalyzePage.jsx`)

### 레이아웃
```
┌──────────┬───────────────────────────────┬──────────────┐
│ 플롯 선택│ 차트 영역 (중앙)               │ SHAP (우측)  │
│ (18%)    │                              │ (21%)        │
│          │ PlotRenderArea               │              │
│ 분류 플롯│ (base64 PNG 이미지)           │ ShapWaterfall│
│ - AUC    │                              │ (단건 이유)  │
│ - 혼동행렬│ TrainTestToggle              │              │
│ - 피처중요│                              │ ShapIndex    │
│ ...      │ PNG 저장 버튼                 │ Selector     │
│          │                              │              │
│ SHAP 해석│                              │              │
│ - Summary│                              │              │
│ - 단건분석│ [← 튜닝]  [모델 확정 →]      │              │
└──────────┴───────────────────────────────┴──────────────┘
```

### 컴포넌트 명세

**`PlotRenderArea`**
- `POST /api/analyze/plot` 응답의 `base64_image`를 `<img>` 태그로 렌더링
- 로딩 중: Spinner 표시
- 다운로드: `<a download>` 태그로 PNG 저장

**`ShapWaterfall`**
- SHAP 값 + 방향 (↑ 빨강 / ↓ 파랑)
- 각 피처: 이름, SHAP 값, 기여 방향
- 최종 예측값/확률 하이라이트 카드

**플롯 타입 → PyCaret `plot` 파라미터 매핑**
```js
const PLOT_MAP = {
  classification: {
    "AUC-ROC": "auc",
    "혼동행렬": "confusion_matrix",
    "Feature Importance": "feature",
    "Learning Curve": "learning",
    "PR Curve": "pr",
    "Calibration": "calibration",
  },
  regression: {
    "잔차 플롯": "residuals",
    "예측 오차": "error",
    "Cook's Distance": "cooks",
    "Feature Importance": "feature",
    "Learning Curve": "learning",
  },
};
```

---

## ⑦ 모델 확정 (`pages/FinalizePage.jsx`)

### 레이아웃
```
┌─────────────────────────────┬────────────────────────────┐
│ 확정 폼 (58%)               │ MLflow 레지스트리 (42%)     │
│                             │                            │
│ SelectedModelCard           │ MLflowRegisterForm         │
│ (모델 요약)                  │ (모델명 입력 + 등록)        │
│                             │                            │
│ FinalizeButton              │ StageManager               │
│ (전체 데이터 재학습)          │ (None→Staging→Production)  │
│                             │                            │
│ SaveModelForm               │ VersionTimeline            │
│ (파일명, 경로 입력)           │ (버전 목록 + 롤백)          │
│                             │                            │
│ PipelineSummary             │ [예측 화면으로 →]           │
└─────────────────────────────┴────────────────────────────┘
```

### 컴포넌트 명세

**`FinalizeButton`**
- 클릭 → `POST /api/train/finalize/{model_id}` 호출
- 완료 후: `final_accuracy` 표시 (CV 정확도보다 소폭 향상)
- 완료 후 `SaveModelForm` 활성화

**`StageManager`**
- 4개 버튼: None / Staging / Production / Archived
- Production 클릭 시 확인 다이얼로그: "기존 Production 버전을 Archive합니까?"
- 토글: 기존 Production 자동 Archive ON/OFF

**`VersionTimeline`**
- 각 버전: v번호, 스테이지 배지, 정확도, 날짜, [롤백] 버튼
- 현재 Production: 초록 배경 + "● LIVE" 배지
- 롤백 클릭 → `POST /api/registry/{name}/rollback`

### API 연결
```
POST /api/train/finalize/{model_id}   → { final_accuracy, model_path }
POST /api/registry/register           → { version, registry_uri }
PUT  /api/registry/{name}/stage       → { stage, version }
POST /api/registry/{name}/rollback    → { restored_version }
```

---

## ⑧ 예측 실행 (`pages/PredictPage.jsx`)

### 레이아웃
```
┌────────────┬──────────────────────────────┬──────────────┐
│ 설정 (22%) │ 메인 (탭 전환) (52%)          │ SHAP (26%)   │
│            │                              │              │
│ ModelSel   │ [단건예측] [배치예측] [이력]  │ ShapWaterfall│
│ (드롭다운) │                              │ (단건일 때)  │
│            │ 단건: SinglePredictForm       │              │
│ ModelMeta  │ 배치: BatchDropzone           │              │
│ Card       │      + BatchResultTable      │              │
│            │ 이력: PredictionHistory       │              │
│ Threshold  │                              │              │
│ Slider     │                              │              │
│ (0.0~1.0)  │                              │              │
└────────────┴──────────────────────────────┴──────────────┘
```

### 컴포넌트 명세

**`SinglePredictForm`**
- 피처 목록은 학습 시 사용된 컬럼에서 자동 생성
- 수치형 피처: number input (min, max 힌트 표시)
- 범주형 피처: select box (학습 시 나타난 고유값 목록)
- [예측 실행] → 결과 카드 업데이트

**`ThresholdSlider`**
- 슬라이더 값 변경 시 배치 결과 테이블 실시간 재필터
- 표시: "X% 이상 → 불량으로 판정"

**`BatchResultTable`**
- 원본 데이터 컬럼 + `Label` + `Score` 컬럼 추가
- Label이 양성(불량/이상 등)인 행: 연한 빨강 배경
- Score 컬럼: threshold 넘으면 빨강, 아니면 초록
- [고위험만 보기] 버튼: threshold 초과 행만 필터
- [CSV 다운로드] 버튼

**`PredictionHistory`**
- 컬럼: 시각 / 모델 / 소스 / 예측값 / 확률
- 소스 배지: manual(파랑) / batch(노랑) / realtime(초록) / scheduled(보라)

### API 연결
```
GET  /api/registry/models                      → Production 모델 목록
POST /api/predict/{model_name}                 → { label, score, shap_values }
POST /api/predict/{model_name}/batch           → { results: [{ label, score, ...원본 }] }
GET  /api/predict/history                      → 최근 100건
```

---

## ⑨ MLflow 관리 (`pages/MLflowPage.jsx`)

### 레이아웃
```
┌──────────┬──────────────────────────────────────────────┐
│ 사이드 탭│ 콘텐츠 영역 (탭 전환)                          │
│ (18%)    │                                              │
│          │ [실험 로그]  = ExperimentLogTable             │
│ 실험 로그│ [실험 비교]  = RadarCompare + ParamDiff       │
│ 실험 비교│ [레지스트리] = ModelRegistryList              │
│ 레지스트리│ [스케줄]     = ScheduleManager               │
│ 자동스케줄│                                              │
│          │                                              │
│ MLflow   │                                              │
│ 서버 상태│                                              │
│ [UI열기↗]│                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 컴포넌트 명세

**`ExperimentLogTable`**
- 컬럼: Run ID / 모델 / 지표들 / 학습시간 / 날짜
- 필터: 실험명 드롭다운, 날짜 범위, 지표 범위
- Run ID: MLflow UI 링크 (`http://localhost:5000/#/experiments/...`)
- 행 체크박스 2~5개 선택 → [비교] 버튼 활성화

**`ScheduleManager`**
- 스케줄 목록: 작업명 / 주기 / 다음 실행 / 상태(활성/중지)
- [편집] 버튼: 인라인 편집 폼
- [지금 실행] 버튼: 즉시 트리거

### API 연결
```
GET /api/dashboard/models         → ModelRegistryList 데이터
GET /api/registry/models          → 등록 모델 목록
PUT /api/registry/{name}/stage    → 스테이지 변경
GET /api/schedule/jobs            → 스케줄 목록
```

---

## 공통 컴포넌트 명세

### `Sidebar.jsx`
- 그룹: 운영 / 데이터 / 학습 / 평가·배포 / MLOps
- 활성 항목: 좌측 컬러 바 + 배경 강조
- 하단: MLflow 연결 상태 ● / 운영 모델 수

### `Header.jsx`
- 좌측: 화면 아이콘 + 단계 배지 + 화면명 + 설명
- 우측: 스텝 점 인디케이터 (클릭 가능) + 이전/다음 버튼

### 색상 시스템
```js
const COLORS = {
  // 모듈별
  classification: "#38BDF8",  // cyan
  regression:     "#FBBF24",  // amber
  clustering:     "#34D399",  // green
  anomaly:        "#A78BFA",  // violet
  timeseries:     "#34D399",  // green

  // 드리프트
  drift_ok:       "#34D399",  // < 20%
  drift_warn:     "#FBBF24",  // 20~40%
  drift_danger:   "#F87171",  // > 40%

  // 상태
  production:     "#34D399",
  staging:        "#FBBF24",
  archived:       "#5A7A9A",
};
```
