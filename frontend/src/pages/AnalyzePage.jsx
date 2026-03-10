import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { analyzeAPI, trainAPI } from "../api"
import PlotRenderArea from "../components/analyze/PlotRenderArea"
import PlotSelector from "../components/analyze/PlotSelector"
import ShapIndexSelector from "../components/analyze/ShapIndexSelector"
import ShapWaterfall from "../components/analyze/ShapWaterfall"
import TrainTestToggle from "../components/analyze/TrainTestToggle"
import useStore from "../store/useStore"

export default function AnalyzePage() {
  const navigate = useNavigate()
  const { currentExperimentId, selectedModelsForTune, setupParams } = useStore()
  const moduleType = setupParams.module_type || "classification"

  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState(null)
  const [plots, setPlots] = useState([])
  const [plotType, setPlotType] = useState("")
  const [image, setImage] = useState("")
  const [rowIndex, setRowIndex] = useState(0)
  const [shapResult, setShapResult] = useState(null)
  const [useTrainData, setUseTrainData] = useState(false)
  const [isLoadingPlot, setIsLoadingPlot] = useState(false)
  const [plotError, setPlotError] = useState("")
  const [shapError, setShapError] = useState("")

  useEffect(() => {
    if (!currentExperimentId) return

    trainAPI.getCompareResult(currentExperimentId).then((response) => {
      setModels(response)
      const selected = response.find((item) => item.algorithm === selectedModelsForTune[0]) || response[0]
      if (selected) setModelId(selected.id)
    })

    analyzeAPI.listPlots(moduleType).then((response) => {
      const nextPlots = response.plots || []
      setPlots(nextPlots)
      setPlotType((current) => (nextPlots.includes(current) ? current : nextPlots[0] || ""))
    })
  }, [currentExperimentId, moduleType, selectedModelsForTune])

  useEffect(() => {
    if (!modelId || !plotType) return
    handlePlot()
  }, [modelId, plotType, useTrainData])

  async function handlePlot() {
    if (!modelId || !plotType) return

    setPlotError("")
    setIsLoadingPlot(true)
    try {
      const response = await analyzeAPI.plot({
        model_id: modelId,
        plot_type: plotType,
        use_train_data: useTrainData,
      })
      setImage(response.base64_image || "")
    } catch (error) {
      setImage("")
      setPlotError(error?.detail || "플롯 생성 중 오류가 발생했습니다.")
    } finally {
      setIsLoadingPlot(false)
    }
  }

  async function handleShap() {
    if (!modelId) return

    setShapError("")
    try {
      const response = await analyzeAPI.interpret({
        model_id: modelId,
        row_index: rowIndex,
      })
      setShapResult(response)
    } catch (error) {
      setShapResult(null)
      setShapError(error?.detail || "SHAP 분석 중 오류가 발생했습니다.")
    }
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "240px 1fr 320px" }}>
      <PlotSelector plots={plots} value={plotType} onChange={setPlotType} onRefresh={handlePlot} />

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
            <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>모델 분석 사용법</div>
            <div style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6 }}>
              1. 분석할 모델을 고릅니다.
              <br />
              2. 왼쪽에서 플롯 종류를 선택하면 바로 그래프가 생성됩니다.
              <br />
              3. 오른쪽에서 행 번호를 넣고 SHAP 분석을 실행하면 해당 예측에 영향을 준 주요 변수를 확인할 수 있습니다.
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
              <option value="">분석할 모델 선택</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.algorithm}
                </option>
              ))}
            </select>

            <TrainTestToggle value={useTrainData} onChange={setUseTrainData} />
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

        <PlotRenderArea image={image} isLoading={isLoadingPlot} plotType={plotType} moduleType={moduleType} />
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

        <ShapIndexSelector value={rowIndex} onChange={setRowIndex} onAnalyze={handleShap} />

        <button
          onClick={() => navigate("/finalize")}
          style={{
            border: "none",
            borderRadius: 12,
            background: "var(--success)",
            color: "white",
            padding: "13px 16px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          모델 확정 단계로 이동
        </button>
      </div>
    </div>
  )
}
