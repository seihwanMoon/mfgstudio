import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { trainAPI } from "../api"
import OptunaScatter from "../components/charts/OptunaScatter"
import HyperparamsDiff from "../components/tune/HyperparamsDiff"
import ModelSelectFromCompare from "../components/tune/ModelSelectFromCompare"
import TuneBeforeAfter from "../components/tune/TuneBeforeAfter"
import TuneOptionsPanel from "../components/tune/TuneOptionsPanel"
import { useSSETune } from "../hooks/useSSETune"
import useStore, { COMPARE_SORT_OPTIONS, getDefaultCompareSort } from "../store/useStore"

const UNSUPPORTED_TUNE_MODULES = {
  anomaly: "이상탐지 모듈은 PyCaret에서 tune_model()을 지원하지 않습니다. 비교 결과와 분석 단계로 진행해 최종 후보를 확정하세요.",
  clustering: "클러스터링 모듈은 PyCaret에서 tune_model()을 지원하지 않습니다. 비교 결과와 분석 단계로 진행해 최종 후보를 확정하세요.",
}

export default function TunePage() {
  const navigate = useNavigate()
  const {
    currentExperimentId,
    selectedModelsForTune,
    tuneTrials,
    tuneResult,
    setupParams,
    setCompareResults,
    uploadedDataset,
  } = useStore()
  const moduleType = setupParams.module_type || "classification"
  const targetMeta = useMemo(
    () => (uploadedDataset?.columns || []).find((column) => (column.name ?? column) === setupParams.target_col),
    [setupParams.target_col, uploadedDataset]
  )
  const isBinaryClassification = moduleType === "classification" && Number(targetMeta?.unique_count || 0) === 2
  const metricOptions = COMPARE_SORT_OPTIONS[moduleType] || COMPARE_SORT_OPTIONS.classification
  const isTuneSupported = !Object.hasOwn(UNSUPPORTED_TUNE_MODULES, moduleType)
  const tuneSupportMessage = UNSUPPORTED_TUNE_MODULES[moduleType] || ""

  const [isRunning, setIsRunning] = useState(false)
  const [isAdvancedRunning, setIsAdvancedRunning] = useState(false)
  const [error, setError] = useState("")
  const [advancedError, setAdvancedError] = useState("")
  const [advancedResult, setAdvancedResult] = useState(null)
  const [activeAlgorithm, setActiveAlgorithm] = useState(selectedModelsForTune[0] || "")
  const [tuneOptions, setTuneOptions] = useState({
    optimize: getDefaultCompareSort(moduleType),
    search_library: "scikit-learn",
    n_iter: 20,
    calibration_method: "sigmoid",
  })
  const { startTune } = useSSETune()

  const points = useMemo(() => tuneTrials.map((trial) => ({ x: trial.trial_number, y: trial.value })), [tuneTrials])

  useEffect(() => {
    setActiveAlgorithm((prev) => (selectedModelsForTune.includes(prev) ? prev : selectedModelsForTune[0] || ""))
  }, [selectedModelsForTune])

  useEffect(() => {
    setTuneOptions((prev) => ({
      ...prev,
      optimize: metricOptions.includes(prev.optimize) ? prev.optimize : getDefaultCompareSort(moduleType),
      search_library: "scikit-learn",
      calibration_method: prev.calibration_method || "sigmoid",
    }))
  }, [metricOptions, moduleType])

  function updateOption(key, value) {
    setTuneOptions((prev) => ({ ...prev, [key]: value }))
  }

  async function refreshCandidateRows() {
    const response = await trainAPI.getCompareResult(currentExperimentId)
    setCompareResults(response)
  }

  async function handleStart() {
    if (!currentExperimentId || !selectedModelsForTune.length || !activeAlgorithm) {
      navigate("/compare")
      return
    }
    if (!isTuneSupported) {
      setError(tuneSupportMessage)
      return
    }

    setError("")
    setIsRunning(true)
    try {
      const response = await trainAPI.startTune({
        experiment_id: currentExperimentId,
        algorithm: activeAlgorithm,
        tune_options: tuneOptions,
      })
      startTune(
        response.job_id,
        async () => {
          setIsRunning(false)
          await refreshCandidateRows()
        },
        () => {
          setIsRunning(false)
          setError("튜닝 스트림 처리 중 오류가 발생했습니다.")
        }
      )
    } catch (tuneError) {
      setIsRunning(false)
      setError(tuneError?.detail || "튜닝을 시작하지 못했습니다.")
    }
  }

  async function handleAdvancedAction(kind) {
    if (!currentExperimentId) {
      navigate("/compare")
      return
    }

    setAdvancedError("")
    setIsAdvancedRunning(true)
    try {
      let response
      if (kind === "blend" || kind === "stack") {
        response = await trainAPI.createEnsemble({
          experiment_id: currentExperimentId,
          algorithms: selectedModelsForTune,
          method: kind,
          options: {
            optimize: tuneOptions.optimize,
            choose_better: true,
          },
        })
      } else if (kind === "automl") {
        response = await trainAPI.createAutoML({
          experiment_id: currentExperimentId,
          options: {
            optimize: tuneOptions.optimize,
          },
        })
      } else if (kind === "calibrate") {
        response = await trainAPI.createClassificationOptimization({
          experiment_id: currentExperimentId,
          algorithm: activeAlgorithm,
          method: "calibrate",
          options: {
            method: tuneOptions.calibration_method,
          },
        })
      } else if (kind === "threshold") {
        response = await trainAPI.createClassificationOptimization({
          experiment_id: currentExperimentId,
          algorithm: activeAlgorithm,
          method: "threshold",
          options: {
            optimize: tuneOptions.optimize,
          },
        })
      }
      setAdvancedResult(response)
      await refreshCandidateRows()
    } catch (actionError) {
      setAdvancedError(actionError?.detail || "PyCaret 고급 단계를 실행하지 못했습니다.")
    } finally {
      setIsAdvancedRunning(false)
    }
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "260px 1fr 320px" }}>
      <TuneOptionsPanel
        options={tuneOptions}
        onChange={updateOption}
        onStart={handleStart}
        selectedCount={selectedModelsForTune.length}
        isRunning={isRunning}
        metricOptions={metricOptions}
        selectedAlgorithms={selectedModelsForTune}
        activeAlgorithm={activeAlgorithm}
        onSelectAlgorithm={setActiveAlgorithm}
        moduleType={moduleType}
        isTuneSupported={isTuneSupported}
        supportMessage={tuneSupportMessage}
      />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {error ? (
          <div
            style={{
              border: "1px solid rgba(210, 82, 82, 0.35)",
              borderLeft: "4px solid var(--danger)",
              borderRadius: 12,
              background: "rgba(210, 82, 82, 0.08)",
              padding: 14,
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}
        <ModelSelectFromCompare algorithms={selectedModelsForTune} />
        <OptunaScatter points={points} />
        <TuneBeforeAfter result={tuneResult} />

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            background: "var(--bg-surface)",
            boxShadow: "var(--shadow-panel)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>PyCaret 고급 단계</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
            비교 결과 상위 모델을 기준으로 <code>blend_models()</code>, <code>stack_models()</code>, <code>automl()</code> 후보를
            추가 생성합니다. 생성된 후보는 즉시 비교 결과 목록에 반영되고, 이후 <strong>모델 확정</strong> 화면에서 선택할 수 있습니다.
            {moduleType === "classification" ? (
              <>
                <br />
                분류 실험에서는 <code>calibrate_model()</code>과 <code>optimize_threshold()</code>도 추가로 실행할 수 있습니다.
              </>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => handleAdvancedAction("blend")}
              disabled={selectedModelsForTune.length < 2 || isAdvancedRunning}
              style={advancedButtonStyle}
            >
              Blend Ensemble
            </button>
            <button
              onClick={() => handleAdvancedAction("stack")}
              disabled={selectedModelsForTune.length < 2 || isAdvancedRunning}
              style={advancedButtonStyle}
            >
              Stack Ensemble
            </button>
            <button onClick={() => handleAdvancedAction("automl")} disabled={isAdvancedRunning} style={advancedButtonStyle}>
              AutoML Best
            </button>
            {moduleType === "classification" ? (
              <button
                onClick={() => handleAdvancedAction("calibrate")}
                disabled={!activeAlgorithm || isAdvancedRunning}
                style={advancedButtonStyle}
              >
                Calibrate Model
              </button>
            ) : null}
            {moduleType === "classification" ? (
              <button
                onClick={() => handleAdvancedAction("threshold")}
                disabled={!activeAlgorithm || isAdvancedRunning || !isBinaryClassification}
                style={advancedButtonStyle}
              >
                Optimize Threshold
              </button>
            ) : null}
            <button onClick={() => navigate("/finalize")} style={secondaryButtonStyle}>
              모델 확정으로 이동
            </button>
          </div>
          {advancedError ? <div style={{ color: "var(--danger)", fontSize: 13 }}>{advancedError}</div> : null}
          {moduleType === "classification" && !isBinaryClassification ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              <code>optimize_threshold()</code>는 이진 분류에서만 사용할 수 있습니다. 현재 타깃 클래스 수를 확인해보세요.
            </div>
          ) : null}
          {advancedResult ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "var(--bg-surface-soft)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ color: "var(--text-primary)", fontWeight: 700 }}>{advancedResult.algorithm}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                생성 방식: {advancedResult.operation}
                {advancedResult.members?.length ? ` / 구성 모델: ${advancedResult.members.join(", ")}` : ""}
                {advancedResult.resolved_model_name ? ` / 선택 모델: ${advancedResult.resolved_model_name}` : ""}
                {advancedResult.method ? ` / 방식: ${advancedResult.method}` : ""}
                {advancedResult.optimize ? ` / 기준 지표: ${advancedResult.optimize}` : ""}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                주요 지표{" "}
                {Object.entries(advancedResult.after_metrics || {})
                  .slice(0, 4)
                  .map(([key, value]) => `${key}=${value}`)
                  .join(" / ")}
              </div>
              <div style={{ color: "var(--accent-blue)", fontSize: 12 }}>
                후보 목록을 갱신했습니다. 모델 확정 단계에서 바로 선택할 수 있습니다.
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ padding: 18 }}>
        <HyperparamsDiff result={tuneResult} />
      </div>
    </div>
  )
}

const advancedButtonStyle = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--bg-surface-strong)",
  color: "var(--text-primary)",
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
}

const secondaryButtonStyle = {
  border: "1px solid var(--accent-blue)",
  borderRadius: 10,
  background: "rgba(56, 189, 248, 0.12)",
  color: "var(--accent-blue)",
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
}
