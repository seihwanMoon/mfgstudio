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
  const { currentExperimentId, selectedModelsForTune } = useStore()
  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState(null)
  const [plots, setPlots] = useState([])
  const [plotType, setPlotType] = useState("")
  const [image, setImage] = useState("")
  const [rowIndex, setRowIndex] = useState(0)
  const [shapResult, setShapResult] = useState(null)
  const [useTrainData, setUseTrainData] = useState(false)

  useEffect(() => {
    if (!currentExperimentId) return
    trainAPI.getCompareResult(currentExperimentId).then((response) => {
      setModels(response)
      const selected = response.find((item) => item.algorithm === selectedModelsForTune[0]) || response[0]
      if (selected) setModelId(selected.id)
    })
    analyzeAPI.listPlots("classification").then((response) => {
      setPlots(response.plots || [])
      setPlotType(response.plots?.[0] || "")
    })
  }, [currentExperimentId, selectedModelsForTune])

  async function handlePlot() {
    if (!modelId || !plotType) return
    const response = await analyzeAPI.plot({ model_id: modelId, plot_type: plotType, use_train_data: useTrainData })
    setImage(response.base64_image)
  }

  async function handleShap() {
    if (!modelId) return
    const response = await analyzeAPI.interpret({ model_id: modelId, row_index: rowIndex })
    setShapResult(response)
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "220px 1fr 280px" }}>
      <PlotSelector plots={plots} value={plotType} onChange={setPlotType} onRefresh={handlePlot} />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <select value={modelId || ""} onChange={(event) => setModelId(Number(event.target.value))} style={{ borderRadius: 8, border: "1px solid #1A3352", background: "#0D1926", color: "#E2EEFF", padding: "10px 12px" }}>
            <option value="">모델 선택</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.algorithm}
              </option>
            ))}
          </select>
          <TrainTestToggle value={useTrainData} onChange={setUseTrainData} />
        </div>
        <PlotRenderArea image={image} />
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <ShapWaterfall result={shapResult} />
        <ShapIndexSelector value={rowIndex} onChange={setRowIndex} onAnalyze={handleShap} />
        <button onClick={() => navigate("/finalize")} style={{ border: "none", borderRadius: 10, background: "#34D399", color: "#080F1A", padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}>
          모델 확정 →
        </button>
      </div>
    </div>
  )
}
