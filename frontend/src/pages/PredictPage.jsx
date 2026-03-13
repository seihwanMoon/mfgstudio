import { useEffect, useState } from "react"

import { predictAPI } from "../api"
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
  const [schema, setSchema] = useState(null)
  const [singleValues, setSingleValues] = useState({})
  const [singleResult, setSingleResult] = useState(null)
  const [batchFile, setBatchFile] = useState(null)
  const [batchResults, setBatchResults] = useState([])
  const [history, setHistory] = useState([])
  const [threshold, setThreshold] = useState(0.5)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const rows = await predictAPI.models()
      setModels(rows)
      if (rows[0]?.name) setSelectedModel(rows[0].name)
      const logs = await predictAPI.history().catch(() => [])
      setHistory(logs)
    }

    load()
  }, [])

  useEffect(() => {
    if (!selectedModel) {
      setSchema(null)
      setSingleValues({})
      return
    }

    async function loadSchema() {
      const response = await predictAPI.modelSchema(selectedModel)
      setSchema(response)
      setSingleValues(
        Object.fromEntries((response.columns || []).map((column) => [column.name, ""]))
      )
    }

    loadSchema()
  }, [selectedModel])

  function updateField(field, value, type) {
    setSingleValues((prev) => ({
      ...prev,
      [field]: type === "numeric" ? (value === "" ? "" : Number(value)) : value,
    }))
  }

  async function handleSingle() {
    if (!selectedModel) return
    setError("")
    try {
      const payload = Object.fromEntries(Object.entries(singleValues).filter(([, value]) => value !== ""))
      const result = await predictAPI.single(selectedModel, { input_data: payload, threshold })
      setSingleResult(result)
      setHistory(await predictAPI.history())
    } catch (predictError) {
      setSingleResult(null)
      setError(predictError?.detail || "단건 예측 실행 중 오류가 발생했습니다.")
    }
  }

  async function handleBatch() {
    if (!selectedModel || !batchFile) return
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", batchFile)
      const result = await predictAPI.batch(selectedModel, formData, threshold)
      setBatchResults(result.results || [])
      setHistory(await predictAPI.history())
    } catch (predictError) {
      setBatchResults([])
      setError(predictError?.detail || "배치 예측 실행 중 오류가 발생했습니다.")
    }
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "280px 1fr", gap: 0 }}>
      <div
        style={{
          borderRight: "1px solid var(--border)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <h3 style={{ margin: 0, color: "var(--text-primary)" }}>예측 설정</h3>
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
          `finalize`와 `레지스트리 등록`을 마친 모델만 예측 대상으로 표시됩니다.
          <br />
          `Production` 스테이지 모델이 항상 최우선입니다.
        </div>
        <ModelSelector models={models} value={selectedModel} onChange={setSelectedModel} />
        {schema?.module_type === "classification" ? <ThresholdSlider value={threshold} onChange={setThreshold} /> : null}
      </div>

      <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignContent: "start" }}>
        {error ? (
          <div
            style={{
              gridColumn: "1 / -1",
              border: "1px solid rgba(210, 82, 82, 0.28)",
              borderLeft: "4px solid var(--danger)",
              borderRadius: 14,
              background: "rgba(210, 82, 82, 0.08)",
              padding: 14,
              color: "var(--text-primary)",
            }}
          >
            {error}
          </div>
        ) : null}

        <SinglePredictForm columns={schema?.columns || []} values={singleValues} onChange={updateField} onSubmit={handleSingle} />
        <PredictResultCard result={singleResult} moduleType={schema?.module_type} />
        <BatchUploadDropzone onFileChange={setBatchFile} onSubmit={handleBatch} fileName={batchFile?.name} />
        <BatchResultTable rows={batchResults} />
        <div style={{ gridColumn: "1 / -1" }}>
          <PredictionHistory rows={history} />
        </div>
      </div>
    </div>
  )
}
