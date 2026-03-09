# FRONTEND — React 컴포넌트 구조 및 구현 가이드

---

## 라우팅 설정

### `frontend/src/App.jsx`
```jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";

import HomePage      from "./pages/HomePage";
import UploadPage    from "./pages/UploadPage";
import SetupPage     from "./pages/SetupPage";
import ComparePage   from "./pages/ComparePage";
import TunePage      from "./pages/TunePage";
import AnalyzePage   from "./pages/AnalyzePage";
import FinalizePage  from "./pages/FinalizePage";
import PredictPage   from "./pages/PredictPage";
import MLflowPage    from "./pages/MLflowPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/"          element={<Navigate to="/home" replace />} />
          <Route path="/home"      element={<HomePage />} />
          <Route path="/upload"    element={<UploadPage />} />
          <Route path="/setup"     element={<SetupPage />} />
          <Route path="/compare"   element={<ComparePage />} />
          <Route path="/tune"      element={<TunePage />} />
          <Route path="/analyze"   element={<AnalyzePage />} />
          <Route path="/finalize"  element={<FinalizePage />} />
          <Route path="/predict"   element={<PredictPage />} />
          <Route path="/mlflow"    element={<MLflowPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
```

---

## 레이아웃 컴포넌트

### `frontend/src/components/layout/AppShell.jsx`
```jsx
import Sidebar from "./Sidebar";
import Header  from "./Header";
import { useLocation } from "react-router-dom";

const SCREEN_META = {
  "/home":     { label: "홈 대시보드",  icon: "⬡", color: "#38BDF8", phase: "운영",    desc: "다중 운영 모델 모니터링" },
  "/upload":   { label: "데이터 업로드", icon: "↑", color: "#38BDF8", phase: "DATA",   desc: "CSV/Excel → 자동 타입 감지" },
  "/setup":    { label: "실험 설정",    icon: "⚙", color: "#38BDF8", phase: "SETUP",  desc: "setup() 파라미터 구성" },
  "/compare":  { label: "모델 비교",    icon: "⇄", color: "#FBBF24", phase: "TRAIN",  desc: "compare_models() 리더보드" },
  "/tune":     { label: "학습·튜닝",    icon: "◎", color: "#FBBF24", phase: "TRAIN",  desc: "tune_model() + Optuna" },
  "/analyze":  { label: "모델 분석",    icon: "◈", color: "#A78BFA", phase: "EVAL",   desc: "plot_model() + SHAP" },
  "/finalize": { label: "모델 확정",    icon: "✓", color: "#34D399", phase: "DEPLOY", desc: "finalize + MLflow Registry" },
  "/predict":  { label: "예측 실행",    icon: "▶", color: "#34D399", phase: "DEPLOY", desc: "predict_model() 단건/배치" },
  "/mlflow":   { label: "MLflow 관리",  icon: "≡", color: "#8BA8C8", phase: "OPS",    desc: "실험 추적 + 모델 레지스트리" },
};

const SCREEN_ORDER = ["/home","/upload","/setup","/compare","/tune","/analyze","/finalize","/predict","/mlflow"];

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const meta = SCREEN_META[pathname] || SCREEN_META["/home"];
  const idx = SCREEN_ORDER.indexOf(pathname);
  const prev = idx > 0 ? SCREEN_ORDER[idx - 1] : null;
  const next = idx < SCREEN_ORDER.length - 1 ? SCREEN_ORDER[idx + 1] : null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden",
                  background: "#080F1A", color: "#E2EEFF",
                  fontFamily: "'DM Sans', 'Malgun Gothic', sans-serif" }}>
      <Sidebar activePath={pathname} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header meta={meta} prev={prev} next={next} screens={SCREEN_META} order={SCREEN_ORDER} />
        <main style={{ flex: 1, overflow: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
```

### `frontend/src/components/layout/Sidebar.jsx`
```jsx
import { useNavigate } from "react-router-dom";

const GROUPS = [
  { label: "운영",     paths: ["/home"] },
  { label: "데이터",   paths: ["/upload", "/setup"] },
  { label: "학습",     paths: ["/compare", "/tune"] },
  { label: "평가·배포", paths: ["/analyze", "/finalize", "/predict"] },
  { label: "MLOps",   paths: ["/mlflow"] },
];

export default function Sidebar({ activePath, screenMeta }) {
  const navigate = useNavigate();

  return (
    <div style={{
      width: 196, background: "#111E2E",
      borderRight: "1px solid #1A3352",
      display: "flex", flexDirection: "column",
    }}>
      {/* 로고 */}
      <div style={{ padding: "16px 14px", borderBottom: "1px solid #1A3352" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#38BDF8",
                      fontFamily: "monospace", letterSpacing: "0.04em" }}>
          ⬡ MFG AI STUDIO
        </div>
        <div style={{ fontSize: 9, color: "#5A7A9A", marginTop: 3 }}>
          PyCaret 3.0 · MLflow 2.11
        </div>
      </div>

      {/* 네비게이션 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div style={{ fontSize: 8, color: "#3D5A78", padding: "10px 14px 4px",
                          letterSpacing: "0.14em", fontFamily: "monospace", fontWeight: 700 }}>
              {g.label}
            </div>
            {g.paths.map((path) => {
              const meta = screenMeta[path];
              const isActive = activePath === path;
              return (
                <button key={path} onClick={() => navigate(path)} style={{
                  width: "100%", background: isActive ? `${meta.color}18` : "transparent",
                  border: "none", borderLeft: `3px solid ${isActive ? meta.color : "transparent"}`,
                  padding: "9px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 4, display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 11,
                    background: isActive ? meta.color : `${meta.color}22`,
                    color: isActive ? "#080F1A" : meta.color, fontWeight: 700,
                  }}>{meta.icon}</span>
                  <span style={{ fontSize: 11, color: isActive ? meta.color : "#5A7A9A",
                                 fontWeight: isActive ? 700 : 400 }}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 하단 상태 */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #1A3352" }}>
        <div style={{ fontSize: 9, color: "#34D399" }}>● MLflow 연결됨</div>
        <div style={{ fontSize: 9, color: "#5A7A9A", marginTop: 3 }}>4개 모델 운영 중</div>
      </div>
    </div>
  );
}
```

---

## 주요 훅 (Hooks)

### `frontend/src/hooks/useSSECompare.js`
```js
import { useEffect, useCallback } from "react";
import useStore from "../store/useStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useSSECompare() {
  const { addCompareResult, clearCompareResults } = useStore();

  const startCompare = useCallback((experimentId, onDone) => {
    clearCompareResults();

    const source = new EventSource(
      `${BASE_URL}/api/train/compare/${experimentId}/stream`
    );

    source.addEventListener("model_result", (e) => {
      const data = JSON.parse(e.data);
      addCompareResult(data);
    });

    source.addEventListener("done", (e) => {
      const data = JSON.parse(e.data);
      source.close();
      onDone?.(data);
    });

    source.onerror = () => {
      console.error("SSE 연결 오류");
      source.close();
    };

    return () => source.close();
  }, [addCompareResult, clearCompareResults]);

  return { startCompare };
}
```

### `frontend/src/hooks/useSSETune.js`
```js
import { useCallback } from "react";
import useStore from "../store/useStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useSSETune() {
  const { addTuneTrial, clearTuneTrials, setTuneResult } = useStore();

  const startTune = useCallback((jobId, onDone) => {
    clearTuneTrials();

    const source = new EventSource(
      `${BASE_URL}/api/train/tune/${jobId}/stream`
    );

    source.addEventListener("trial", (e) => {
      const data = JSON.parse(e.data);
      addTuneTrial(data);
    });

    source.addEventListener("done", (e) => {
      const data = JSON.parse(e.data);
      setTuneResult(data);
      source.close();
      onDone?.(data);
    });

    source.onerror = () => source.close();

    return () => source.close();
  }, [addTuneTrial, clearTuneTrials, setTuneResult]);

  return { startTune };
}
```

---

## 페이지 구현 템플릿

### `frontend/src/pages/SetupPage.jsx`
```jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import useStore from "../store/useStore";

// 컴포넌트 import
import ModuleSelector    from "../components/setup/ModuleSelector";
import BasicSettingsForm from "../components/setup/BasicSettingsForm";
import PreprocessingForm from "../components/setup/PreprocessingForm";
import CodePreviewPanel  from "../components/setup/CodePreviewPanel";

export default function SetupPage() {
  const navigate = useNavigate();
  const { currentDatasetId, setupParams, setSetupParam, setExperimentId, uploadedDataset } = useStore();
  const [loading, setLoading] = useState(false);
  const [setupResult, setSetupResult] = useState(null);

  const handleSetup = async () => {
    if (!currentDatasetId) {
      alert("먼저 데이터를 업로드하세요");
      navigate("/upload");
      return;
    }

    setLoading(true);
    try {
      const result = await api.post("/api/train/setup", {
        dataset_id: currentDatasetId,
        module_type: setupParams.module_type,
        params: setupParams,
        experiment_name: setupParams.experiment_name || `실험_${Date.now()}`,
      });

      setExperimentId(result.experiment_id);
      setSetupResult(result);

      // 잠시 결과 보여주고 이동
      setTimeout(() => navigate("/compare"), 1500);
    } catch (err) {
      alert(`setup() 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* 왼쪽: 폼 */}
      <div style={{ flex: 1, borderRight: "1px solid #1A3352", overflow: "auto", padding: 20 }}>
        <ModuleSelector
          value={setupParams.module_type}
          onChange={(v) => setSetupParam("module_type", v)}
        />
        <BasicSettingsForm
          params={setupParams}
          columns={uploadedDataset?.columns || []}
          onChange={setSetupParam}
        />
        <PreprocessingForm
          params={setupParams}
          onChange={setSetupParam}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={() => navigate("/upload")} style={btnStyle("outline")}>
            ← 업로드
          </button>
          <button onClick={handleSetup} disabled={loading} style={btnStyle("primary")}>
            {loading ? "setup() 실행 중..." : "setup() 실행 →"}
          </button>
        </div>
      </div>

      {/* 오른쪽: 코드 미리보기 */}
      <div style={{ width: "38%", overflow: "auto" }}>
        <CodePreviewPanel params={setupParams} setupResult={setupResult} />
      </div>
    </div>
  );
}

const btnStyle = (variant) => ({
  padding: "9px 20px",
  borderRadius: 5,
  border: variant === "primary" ? "none" : "1px solid #1A3352",
  background: variant === "primary" ? "#38BDF8" : "transparent",
  color: variant === "primary" ? "#080F1A" : "#8BA8C8",
  fontWeight: 700, fontSize: 12, cursor: "pointer",
});
```

### `frontend/src/pages/ComparePage.jsx`
```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import useStore from "../store/useStore";
import { useSSECompare } from "../hooks/useSSECompare";

import CompareOptionsPanel from "../components/compare/CompareOptionsPanel";
import LeaderboardTable    from "../components/compare/LeaderboardTable";
import RadarCompareChart   from "../components/charts/RadarCompare";

export default function ComparePage() {
  const navigate = useNavigate();
  const { currentExperimentId, compareResults, compareOptions, setCompareOption } = useStore();
  const { startCompare } = useSSECompare();
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = async () => {
    if (!currentExperimentId) {
      alert("먼저 실험을 설정하세요");
      navigate("/setup");
      return;
    }

    setIsRunning(true);
    try {
      await api.post("/api/train/compare", {
        experiment_id: currentExperimentId,
        options: compareOptions,
      });

      const cleanup = startCompare(currentExperimentId, (result) => {
        setIsRunning(false);
        console.log("비교 완료:", result);
      });

      return cleanup;
    } catch (err) {
      alert(`비교 실패: ${err}`);
      setIsRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* 옵션 패널 */}
      <CompareOptionsPanel
        options={compareOptions}
        onChange={setCompareOption}
        isRunning={isRunning}
        onStart={handleStart}
        doneCount={compareResults.length}
      />

      {/* 리더보드 */}
      <div style={{ flex: 1, borderRight: "1px solid #1A3352", overflow: "hidden",
                    display: "flex", flexDirection: "column" }}>
        <LeaderboardTable
          results={compareResults}
          isRunning={isRunning}
        />
        {compareResults.length > 0 && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid #1A3352" }}>
            <button onClick={() => navigate("/tune")} style={{
              background: "#FBBF24", border: "none", color: "#080F1A",
              padding: "8px 20px", borderRadius: 5, fontWeight: 700, cursor: "pointer",
            }}>
              선택 모델 튜닝 →
            </button>
          </div>
        )}
      </div>

      {/* 레이더 차트 */}
      <div style={{ width: 200 }}>
        <RadarCompareChart models={compareResults.slice(0, 3)} />
      </div>
    </div>
  );
}
```

---

## 공통 UI 컴포넌트 구현

### `frontend/src/components/ui/Field.jsx`
```jsx
/**
 * 통합 필드 컴포넌트
 * type: "text" | "number" | "select" | "toggle"
 */
export default function Field({ label, type = "text", value, onChange, options = [], color = "#38BDF8", hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 9, color: "#5A7A9A", letterSpacing: "0.1em",
                      fontFamily: "monospace", textTransform: "uppercase" }}>
        {label}
      </label>

      {type === "toggle" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
             onClick={() => onChange(!value)}>
          <div style={{
            width: 36, height: 18, borderRadius: 9, position: "relative",
            background: value ? color : "#1A3352", transition: "background .2s",
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 2,
              left: value ? 19 : 2, transition: "left .2s",
            }} />
          </div>
          <span style={{ fontSize: 11, color: value ? color : "#5A7A9A" }}>
            {value ? "ON" : "OFF"}
          </span>
        </div>
      ) : type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: "#0D1926", border: "1px solid #1A3352", borderRadius: 4,
            padding: "7px 10px", fontSize: 11, color: "#E2EEFF",
            cursor: "pointer", appearance: "none",
          }}
        >
          {options.map((opt) => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
          style={{
            background: "#0D1926", border: "1px solid #1A3352", borderRadius: 4,
            padding: "7px 10px", fontSize: 11, color: "#E2EEFF",
          }}
        />
      )}

      {hint && <span style={{ fontSize: 9, color: "#3D5A78" }}>{hint}</span>}
    </div>
  );
}
```

### `frontend/src/components/charts/DriftGauge.jsx`
```jsx
/**
 * 드리프트 게이지 바
 * value: 0.0 ~ 1.0
 */
export default function DriftGauge({ value, label = "DRIFT" }) {
  const pct = Math.round(value * 100);
  const color = value > 0.4 ? "#F87171" : value > 0.2 ? "#FBBF24" : "#34D399";
  const status = value > 0.4 ? "위험" : value > 0.2 ? "주의" : "정상";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: "#5A7A9A", fontFamily: "monospace",
                       letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ fontSize: 9, color, fontWeight: 700 }}>
          {pct}% {status}
        </span>
      </div>
      <div style={{ height: 5, background: "#1A3352", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: color, borderRadius: 3,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}
```

### `frontend/src/components/setup/CodePreviewPanel.jsx`
```jsx
import { useMemo } from "react";

/**
 * setup() 파라미터 → Python 코드 실시간 생성
 */
function generateCode(params) {
  const MODULE_IMPORTS = {
    classification: "from pycaret.classification import *",
    regression:     "from pycaret.regression import *",
    clustering:     "from pycaret.clustering import *",
    anomaly:        "from pycaret.anomaly import *",
    timeseries:     "from pycaret.time_series import *",
  };

  const lines = [
    `# PyCaret 3.0 — 자동 생성 코드`,
    `${MODULE_IMPORTS[params.module_type] || "from pycaret.classification import *"}`,
    ``,
    `s = setup(`,
    `    data=df,`,
  ];

  if (params.target_col)       lines.push(`    target='${params.target_col}',`);
  if (params.train_size)       lines.push(`    train_size=${params.train_size},`);
  if (params.fold)             lines.push(`    fold=${params.fold},`);
  if (params.normalize)        lines.push(`    normalize=True,`);
  if (params.normalize && params.normalize_method)
                               lines.push(`    normalize_method='${params.normalize_method}',`);
  if (params.fix_imbalance)    lines.push(`    fix_imbalance=True,`);
  if (params.remove_outliers)  lines.push(`    remove_outliers=True,`);
  if (params.imputation_type)  lines.push(`    imputation_type='${params.imputation_type}',`);
  if (params.log_experiment)   lines.push(`    log_experiment=True,`);
  if (params.log_plots)        lines.push(`    log_plots=True,`);
  if (params.experiment_name)  lines.push(`    experiment_name='${params.experiment_name}',`);
  if (params.session_id)       lines.push(`    session_id=${params.session_id},`);

  lines.push(`)`);
  return lines.join("\n");
}

export default function CodePreviewPanel({ params, setupResult }) {
  const code = useMemo(() => generateCode(params), [params]);

  // 간단한 구문 하이라이팅
  const highlighted = code
    .replace(/('.*?')/g, '<span style="color:#34D399">$1</span>')
    .replace(/\b(True|False|None)\b/g, '<span style="color:#FBBF24">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#FBBF24">$1</span>')
    .replace(/(#.*$)/gm, '<span style="color:#3D5A78">$1</span>')
    .replace(/\b(from|import|as)\b/g, '<span style="color:#A78BFA">$1</span>');

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1A3352",
                    background: "#111E2E" }}>
        <div style={{ fontSize: 9, color: "#34D399", fontFamily: "monospace",
                      letterSpacing: "0.1em", fontWeight: 700 }}>
          코드 미리보기 (실시간)
        </div>
        <div style={{ fontSize: 10, color: "#5A7A9A", marginTop: 2 }}>
          설정 변경 시 자동 업데이트
        </div>
      </div>

      <div style={{ flex: 1, margin: 14, background: "#050E1A", borderRadius: 5,
                    border: "1px solid #1A3352", overflow: "auto" }}>
        <pre style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.9,
          padding: 16, margin: 0, color: "#7AA8D0",
        }}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>

      {/* 복사 버튼 */}
      <div style={{ padding: "0 14px 14px" }}>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          style={{
            width: "100%", background: "transparent", border: "1px solid #1A3352",
            color: "#8BA8C8", padding: "7px 0", borderRadius: 4, fontSize: 11, cursor: "pointer",
          }}
        >
          📋 코드 복사
        </button>
      </div>

      {/* setup() 결과 */}
      {setupResult && (
        <div style={{ margin: "0 14px 14px", background: "#0A1828", borderRadius: 5,
                      border: "1px solid #1A3352", borderLeft: "3px solid #34D399", padding: 12 }}>
          <div style={{ fontSize: 9, color: "#34D399", fontFamily: "monospace",
                        marginBottom: 8, fontWeight: 700 }}>SETUP 결과</div>
          {[
            ["변환 후 shape", setupResult.transformed_shape?.join(" × ")],
            ["파이프라인", setupResult.pipeline_steps?.join(" → ")],
          ].map(([k, v]) => (
            <div key={k} style={{ fontSize: 10, color: "#8BA8C8", marginBottom: 3 }}>
              <span style={{ color: "#5A7A9A" }}>{k}: </span>{v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### `frontend/src/components/compare/LeaderboardTable.jsx`
```jsx
import useStore from "../../store/useStore";

const COLS = ["Algorithm", "Accuracy", "AUC", "F1", "Recall", "Precision", "TT(s)"];

export default function LeaderboardTable({ results, isRunning }) {
  const { selectedModelsForTune, toggleSelectModel } = useStore();

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      {/* 헤더 */}
      <div style={{ display: "grid", gridTemplateColumns: "2rem 2.5fr 1fr 1fr 1fr 1fr 1fr 0.8fr",
                    gap: 4, padding: "7px 10px", background: "#111E2E",
                    position: "sticky", top: 0, zIndex: 1 }}>
        <span/>
        {COLS.map((h) => (
          <span key={h} style={{ fontSize: 9, color: h === "Accuracy" ? "#FBBF24" : "#5A7A9A",
                                  fontFamily: "monospace", fontWeight: h === "Accuracy" ? 700 : 400 }}>
            {h}
          </span>
        ))}
      </div>

      {/* 행 */}
      {results.map((row, i) => {
        const isTop = i === 0;
        const isSelected = selectedModelsForTune.includes(row.mlflow_run_id);

        return (
          <div key={row.algorithm} style={{
            display: "grid", gridTemplateColumns: "2rem 2.5fr 1fr 1fr 1fr 1fr 1fr 0.8fr",
            gap: 4, padding: "7px 10px",
            background: isTop ? "#FBBF2412" : i % 2 === 0 ? "#0D1926" : "transparent",
            borderTop: "1px solid #1A3352", alignItems: "center",
          }}>
            {/* 체크박스 */}
            <div
              onClick={() => toggleSelectModel(row.mlflow_run_id)}
              style={{
                width: 14, height: 14, borderRadius: 3, cursor: "pointer",
                background: isSelected ? "#FBBF24" : "#0D1926",
                border: `1px solid ${isSelected ? "#FBBF24" : "#1A3352"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {isSelected && <span style={{ fontSize: 9, color: "#080F1A", fontWeight: 800 }}>✓</span>}
            </div>

            {/* 알고리즘명 */}
            <span style={{ fontSize: 11, color: isTop ? "#FBBF24" : "#E2EEFF",
                           fontWeight: isTop ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
              {isTop && <span style={{ fontSize: 9, background: "#FBBF2422", color: "#FBBF24",
                                       padding: "1px 5px", borderRadius: 3 }}>★ 1위</span>}
              {row.algorithm}
            </span>

            {/* 지표 */}
            {["Accuracy","AUC","F1","Recall","Precision"].map((k) => (
              <span key={k} style={{ fontSize: 10, fontFamily: "monospace",
                                     color: k === "Accuracy" && isTop ? "#FBBF24" : "#8BA8C8" }}>
                {row.metrics?.[k]?.toFixed(4) ?? "—"}
              </span>
            ))}
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#8BA8C8" }}>
              {row.tt_sec}s
            </span>
          </div>
        );
      })}

      {/* 로딩 인디케이터 */}
      {isRunning && (
        <div style={{ padding: "12px 10px", textAlign: "center",
                      fontSize: 11, color: "#FBBF24" }}>
          ● 학습 중...
        </div>
      )}
    </div>
  );
}
```

---

## API 함수 모음

### `frontend/src/api/index.js`
```js
import { api } from "./client";

// ── 데이터 ──────────────────────────────────
export const dataAPI = {
  upload: (formData) => api.post("/api/data/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  getPreview: (id) => api.get(`/api/data/${id}/preview`),
  getQuality: (id) => api.get(`/api/data/${id}/quality`),
  updateColumns: (id, overrides) => api.patch(`/api/data/${id}/columns`, { overrides }),
};

// ── 학습 ────────────────────────────────────
export const trainAPI = {
  setup: (payload) => api.post("/api/train/setup", payload),
  getCode: (id) => api.get(`/api/train/setup/${id}/code`),
  startCompare: (payload) => api.post("/api/train/compare", payload),
  startTune: (payload) => api.post("/api/train/tune", payload),
  finalize: (modelId) => api.post(`/api/train/finalize/${modelId}`),
};

// ── 분석 ────────────────────────────────────
export const analyzeAPI = {
  getPlot: (payload) => api.post("/api/analyze/plot", payload),
  getShap: (payload) => api.post("/api/analyze/interpret", payload),
  getPlotList: (moduleType) => api.get(`/api/analyze/plots/list?module_type=${moduleType}`),
};

// ── 예측 ────────────────────────────────────
export const predictAPI = {
  single: (modelName, input, threshold = 0.5) =>
    api.post(`/api/predict/${modelName}`, { input_data: input, threshold }),
  batch: (modelName, formData, threshold = 0.5) =>
    api.post(`/api/predict/${modelName}/batch?threshold=${threshold}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getHistory: (limit = 100) => api.get(`/api/predict/history?limit=${limit}`),
};

// ── 레지스트리 ───────────────────────────────
export const registryAPI = {
  register: (runId, modelName) => api.post("/api/registry/register", { run_id: runId, model_name: modelName }),
  getModels: () => api.get("/api/registry/models"),
  getVersions: (name) => api.get(`/api/registry/${name}/versions`),
  changeStage: (name, version, stage) => api.put(`/api/registry/${name}/stage`, { version, stage }),
  rollback: (name, version) => api.post(`/api/registry/${name}/rollback`, { version }),
};

// ── 대시보드 ─────────────────────────────────
export const dashboardAPI = {
  getModels: () => api.get("/api/dashboard/models"),
  getStats: () => api.get("/api/dashboard/stats"),
};
```

---

## 환경 설정

### `frontend/.env`
```bash
VITE_API_BASE_URL=http://localhost:8000
```

### `frontend/index.html`
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Manufacturing AI Studio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```
