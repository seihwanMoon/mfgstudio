import { useEffect, useState } from "react"

import { predictAPI, registryAPI } from "../api"
import BatchResultTable from "../components/predict/BatchResultTable"
import BatchUploadDropzone from "../components/predict/BatchUploadDropzone"
import ModelSelector from "../components/predict/ModelSelector"
import PredictionHistory from "../components/predict/PredictionHistory"
import PredictResultCard from "../components/predict/PredictResultCard"
import SinglePredictForm from "../components/predict/SinglePredictForm"
import ThresholdSlider from "../components/predict/ThresholdSlider"

export default function PredictPage() {
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState("")
  const [singleValues, setSingleValues] = useState({})
  const [singleResult, setSingleResult] = useState(null)
  const [batchFile, setBatchFile] = useState(null)
  const [batchResults, setBatchResults] = useState([])
  const [history, setHistory] = useState([])
  const [threshold, setThreshold] = useState(0.5)

  useEffect(() => {
    registryAPI.listModels().then((rows) => {
      setModels(rows)
      if (rows[0]?.name) setSelectedModel(rows[0].name)
    })
    predictAPI.history().then(setHistory).catch(() => setHistory([]))
  }, [])

  function updateField(field, value) {
    setSingleValues((prev) => ({ ...prev, [field]: Number(value) || value }))
  }

  async function handleSingle() {
    if (!selectedModel) return
    const result = await predictAPI.single(selectedModel, { input_data: singleValues, threshold })
    setSingleResult(result)
    setHistory(await predictAPI.history())
  }

  async function handleBatch() {
    if (!selectedModel || !batchFile) return
    const formData = new FormData()
    formData.append("file", batchFile)
    const result = await predictAPI.batch(selectedModel, formData, threshold)
    setBatchResults(result.results || [])
    setHistory(await predictAPI.history())
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "240px 1fr", gap: 0 }}>
      <div style={{ borderRight: "1px solid #1A3352", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ margin: 0, color: "#E2EEFF" }}>예측 설정</h3>
        <ModelSelector models={models} value={selectedModel} onChange={setSelectedModel} />
        <ThresholdSlider value={threshold} onChange={setThreshold} />
      </div>
      <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignContent: "start" }}>
        <SinglePredictForm values={singleValues} onChange={updateField} onSubmit={handleSingle} />
        <PredictResultCard result={singleResult} />
        <BatchUploadDropzone onFileChange={setBatchFile} onSubmit={handleBatch} fileName={batchFile?.name} />
        <BatchResultTable rows={batchResults} />
        <div style={{ gridColumn: "1 / -1" }}>
          <PredictionHistory rows={history} />
        </div>
      </div>
    </div>
  )
}
