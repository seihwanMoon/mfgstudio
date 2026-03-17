import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { analyzeAPI, trainAPI } from "../api"
import PlotRenderArea from "../components/analyze/PlotRenderArea"
import PlotSelector from "../components/analyze/PlotSelector"
import ShapIndexSelector from "../components/analyze/ShapIndexSelector"
import ShapWaterfall from "../components/analyze/ShapWaterfall"
import TrainTestToggle from "../components/analyze/TrainTestToggle"
import XaiPolicyMatrix from "../components/analyze/XaiPolicyMatrix"
import useStore from "../store/useStore"

function getOptionKey(option) {
  return `${option.family}:${option.key}`
}

const SHAP_SUPPORTED_MODULES = new Set(["classification", "regression"])

export default function XAIPage() {
  const navigate = useNavigate()
  const { currentExperimentId, selectedModelsForTune, setupParams } = useStore()
  const moduleType = setupParams.module_type || "classification"
  const isShapSupported = SHAP_SUPPORTED_MODULES.has(moduleType)

  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState(null)
  const [plotOptions, setPlotOptions] = useState([])
  const [matrixRows, setMatrixRows] = useState([])
  const [selectedPlotKey, setSelectedPlotKey] = useState("")
  const [image, setImage] = useState("")
  const [plotlyFigureJson, setPlotlyFigureJson] = useState("")
  const [renderMode, setRenderMode] = useState("image")
  const [plotMeta, setPlotMeta] = useState({
    nativeSource: "",
    fallbackUsed: false,
    nativeReason: "",
    fallbackReason: "",
    estimatorFamilyLabel: "",
    supportLevel: "",
    effectiveSupportLevel: "",
    policyNote: "",
    effectivePolicyNote: "",
    observedStatus: "",
    observedNote: "",
    observedSampleCount: 0,
    cacheHit: false,
    cachePath: "",
  })
  const [rowIndex, setRowIndex] = useState(0)
  const [shapResult, setShapResult] = useState(null)
  const [useTrainData, setUseTrainData] = useState(false)
  const [isLoadingPlot, setIsLoadingPlot] = useState(false)
  const [plotError, setPlotError] = useState("")
  const [shapError, setShapError] = useState("")

  const selectedModel = useMemo(
    () => models.find((item) => Number(item.id) === Number(modelId)) || null,
    [models, modelId]
  )

  const selectedPlot = useMemo(
    () => plotOptions.find((option) => getOptionKey(option) === selectedPlotKey) || null,
    [plotOptions, selectedPlotKey]
  )

  useEffect(() => {
    if (!currentExperimentId) return

    trainAPI.getCompareResult(currentExperimentId).then((response) => {
      setModels(response)
      const selected = response.find((item) => item.algorithm === selectedModelsForTune[0]) || response[0]
      if (selected) setModelId(selected.id)
    })
  }, [currentExperimentId, selectedModelsForTune])

  useEffect(() => {
    if (!currentExperimentId) return
    refreshMatrix()
  }, [currentExperimentId])

  useEffect(() => {
    analyzeAPI.listPlots(moduleType, selectedModel?.algorithm || "", currentExperimentId || "").then((response) => {
      const nextOptions = response.xai || []
      setPlotOptions(nextOptions)
      setSelectedPlotKey((current) => {
        const hasCurrent = nextOptions.some((option) => getOptionKey(option) === current)
        return hasCurrent ? current : getOptionKey(nextOptions[0] || { family: "xai", key: "" })
      })
    })
  }, [moduleType, selectedModel?.algorithm, currentExperimentId])

  useEffect(() => {
    if (!modelId || !selectedPlot) return
    handlePlot()
  }, [modelId, selectedPlotKey, useTrainData])

  async function refreshMatrix() {
    if (!currentExperimentId) return
    try {
      const response = await analyzeAPI.xaiMatrix(currentExperimentId)
      setMatrixRows(response.rows || [])
    } catch {
      setMatrixRows([])
    }
  }

  async function handlePlot() {
    if (!modelId || !selectedPlot) return

    setPlotError("")
    setIsLoadingPlot(true)
    try {
      const response = await analyzeAPI.plot({
        model_id: modelId,
        plot_type: selectedPlot.key,
        plot_family: selectedPlot.family,
        use_train_data: useTrainData,
        row_index: rowIndex,
      })
      setRenderMode(response.render_mode || "image")
      setImage(response.base64_image || "")
      setPlotlyFigureJson(response.plotly_figure_json || "")
      setPlotMeta({
        nativeSource: response.native_source || "",
        fallbackUsed: Boolean(response.fallback_used),
        nativeReason: response.native_reason || "",
        fallbackReason: response.fallback_reason || "",
        estimatorFamilyLabel: response.estimator_family_label || selectedPlot.estimator_family_label || "",
        supportLevel: response.support_level || selectedPlot.support_level || "",
        effectiveSupportLevel: response.effective_support_level || selectedPlot.effective_support_level || "",
        policyNote: response.policy_note || selectedPlot.notes || "",
        effectivePolicyNote: response.effective_policy_note || selectedPlot.effective_policy_note || "",
        observedStatus: response.observed_status || selectedPlot.observed_status || "",
        observedNote: response.observed_note || selectedPlot.observed_note || "",
        observedSampleCount: Number(response.observed_sample_count ?? selectedPlot.observed_sample_count ?? 0),
        cacheHit: Boolean(response.cache_hit),
        cachePath: response.cache_path || "",
      })
      refreshMatrix()
    } catch (error) {
      setImage("")
      setPlotlyFigureJson("")
      setRenderMode("image")
      setPlotMeta({
        nativeSource: "",
        fallbackUsed: false,
        nativeReason: "",
        fallbackReason: "",
        estimatorFamilyLabel: "",
        supportLevel: "",
        effectiveSupportLevel: "",
        policyNote: "",
        effectivePolicyNote: "",
        observedStatus: "",
        observedNote: "",
        observedSampleCount: 0,
        cacheHit: false,
        cachePath: "",
      })
      setPlotError(error?.detail || "XAI 그래프를 생성하지 못했습니다.")
    } finally {
      setIsLoadingPlot(false)
    }
  }

  async function handleShap() {
    if (!modelId) return
    if (!isShapSupported) {
      setShapResult(null)
      setShapError("개별 SHAP 분석은 현재 분류와 회귀 모듈에서만 지원합니다.")
      return
    }

    setShapError("")
    try {
      const response = await analyzeAPI.interpret({
        model_id: modelId,
        row_index: rowIndex,
      })
      setShapResult(response)
    } catch (error) {
      setShapResult(null)
      setShapError(error?.detail || "SHAP 결과를 생성하지 못했습니다.")
    }
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "280px 1fr 320px" }}>
      <PlotSelector
        plots={plotOptions}
        value={selectedPlotKey}
        onChange={setSelectedPlotKey}
        onRefresh={handlePlot}
        title="XAI"
        description="선택한 모델 기준으로 native 우선 경로와 fallback 정책, 그리고 실험에서 실제 관찰된 결과를 함께 보여줍니다."
        emptyMessage="이 모듈에서 사용할 수 있는 XAI 그래프가 없습니다."
        buttonLabel="XAI 새로고침"
      />

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 18,
            background: "var(--bg-surface)",
            boxShadow: "var(--shadow-panel)",
            padding: 18,
            display: "grid",
            gap: 14,
          }}
        >
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>XAI 작업 공간</div>
            <div style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6 }}>
              선택 모델별 XAI 정책, 실제 렌더 경로, 누적 관찰 결과를 함께 확인할 수 있습니다. 진단 그래프는 `Plots`,
              설명 그래프는 `XAI`에서 분리해서 관리합니다.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <select
              value={modelId || ""}
              onChange={(event) => setModelId(Number(event.target.value))}
              style={{
                minWidth: 280,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg-surface-soft)",
                color: "var(--text-primary)",
                padding: "12px 14px",
              }}
            >
              <option value="">모델 선택</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.algorithm}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <TrainTestToggle value={useTrainData} onChange={setUseTrainData} moduleType={moduleType} />
              <button
                onClick={() => navigate("/finalize")}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: "var(--success)",
                  color: "white",
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                모델 확정으로 이동
              </button>
            </div>
          </div>
        </div>

        {plotError ? (
          <div
            style={{
              border: "1px solid rgba(210, 82, 82, 0.28)",
              borderLeft: "4px solid var(--danger)",
              borderRadius: 14,
              background: "rgba(210, 82, 82, 0.08)",
              padding: 14,
              color: "var(--text-primary)",
            }}
          >
            {plotError}
          </div>
        ) : null}

        <PlotRenderArea
          image={image}
          figureJson={plotlyFigureJson}
          renderMode={renderMode}
          isLoading={isLoadingPlot}
          plotLabel={selectedPlot?.label}
          plotFamily={selectedPlot?.family}
          moduleType={moduleType}
          nativeSource={plotMeta.nativeSource}
          fallbackUsed={plotMeta.fallbackUsed}
          sourcePreference={selectedPlot?.source_preference}
          nativeReason={plotMeta.nativeReason}
          fallbackReason={plotMeta.fallbackReason}
          estimatorFamilyLabel={plotMeta.estimatorFamilyLabel}
          supportLevel={plotMeta.supportLevel}
          effectiveSupportLevel={plotMeta.effectiveSupportLevel}
          policyNote={plotMeta.policyNote}
          effectivePolicyNote={plotMeta.effectivePolicyNote}
          observedStatus={plotMeta.observedStatus}
          observedNote={plotMeta.observedNote}
          observedSampleCount={plotMeta.observedSampleCount}
          cacheHit={plotMeta.cacheHit}
          cachePath={plotMeta.cachePath}
        />

        <XaiPolicyMatrix rows={matrixRows} selectedModelId={modelId} moduleType={moduleType} />
      </div>

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <ShapWaterfall result={shapResult} moduleType={moduleType} />

        {shapError ? (
          <div
            style={{
              border: "1px solid rgba(210, 82, 82, 0.28)",
              borderRadius: 14,
              background: "rgba(210, 82, 82, 0.08)",
              padding: 14,
              color: "var(--text-primary)",
            }}
          >
            {shapError}
          </div>
        ) : null}

        <ShapIndexSelector
          value={rowIndex}
          onChange={setRowIndex}
          onAnalyze={handleShap}
          disabled={!isShapSupported}
          helperText={
            isShapSupported
              ? "개별 설명을 확인할 행 번호를 입력해 주세요. 0은 첫 번째 샘플입니다."
              : "이 모듈은 아직 개별 SHAP를 지원하지 않습니다. 왼쪽 XAI 그래프를 사용해 주세요."
          }
        />
      </div>
    </div>
  )
}
