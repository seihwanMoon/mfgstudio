import { useEffect, useMemo, useState } from "react"

import { registryAPI, trainAPI } from "../api"
import MLflowRegisterForm from "../components/finalize/MLflowRegisterForm"
import PipelineSummary from "../components/finalize/PipelineSummary"
import SaveModelForm from "../components/finalize/SaveModelForm"
import SelectedModelCard from "../components/finalize/SelectedModelCard"
import StageManager from "../components/finalize/StageManager"
import VersionTimeline from "../components/finalize/VersionTimeline"
import useStore from "../store/useStore"

export default function FinalizePage() {
  const { currentExperimentId, selectedModelsForTune, setupParams } = useStore()
  const [models, setModels] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [finalizeResult, setFinalizeResult] = useState(null)
  const [registryName, setRegistryName] = useState("manufacturing_model")
  const [registryDraft, setRegistryDraft] = useState("manufacturing_model")
  const [versions, setVersions] = useState([])

  useEffect(() => {
    if (!currentExperimentId) return
    trainAPI.getCompareResult(currentExperimentId).then((response) => {
      setModels(response)
      const preferred = response.find((item) => item.algorithm === selectedModelsForTune[0]) || response[0] || null
      setSelectedId(preferred ? String(preferred.id) : "")
    })
  }, [currentExperimentId, selectedModelsForTune])

  useEffect(() => {
    refreshVersions(registryName)
  }, [registryName])

  const selected = useMemo(
    () => models.find((item) => String(item.id) === String(selectedId)) || null,
    [models, selectedId]
  )

  async function refreshVersions(name) {
    const normalized = String(name || "").trim()
    if (!normalized) {
      setVersions([])
      return
    }
    try {
      const response = await registryAPI.listVersions(normalized)
      setVersions(response)
    } catch {
      setVersions([])
    }
  }

  function commitRegistryName() {
    const normalized = String(registryDraft || "").trim()
    if (!normalized || normalized === registryName) return
    setRegistryName(normalized)
  }

  async function handleFinalize() {
    if (!selected) return
    const response = await trainAPI.finalize(selected.id)
    setFinalizeResult(response)
  }

  async function handleRegister() {
    const normalized = String(registryDraft || "").trim()
    if (!finalizeResult?.run_id || !normalized) return
    if (normalized !== registryName) {
      setRegistryName(normalized)
    }
    const response = await registryAPI.register({ run_id: finalizeResult.run_id, model_name: normalized })
    await refreshVersions(normalized)
    return response
  }

  async function handleStage(version, stage) {
    await registryAPI.changeStage(registryName, { version, stage })
    await refreshVersions(registryName)
  }

  async function handleRollback(version) {
    await registryAPI.rollback(registryName, { version })
    await refreshVersions(registryName)
  }

  const pipelineSteps = useMemo(() => {
    const steps = ["load_dataset"]
    if (setupParams.normalize) steps.push(`normalize:${setupParams.normalize_method}`)
    if (setupParams.fix_imbalance) steps.push("fix_imbalance")
    if (setupParams.remove_outliers) steps.push("remove_outliers")
    if (setupParams.imputation_type) steps.push(`imputation:${setupParams.imputation_type}`)
    return steps
  }, [setupParams])

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 380px", gap: 0 }}>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            border: "1px solid #1A3352",
            borderRadius: 14,
            background: "#0D1926",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ color: "#E2EEFF", fontWeight: 700 }}>확정 대상 선택</div>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            style={{
              borderRadius: 8,
              border: "1px solid #1A3352",
              background: "#111E2E",
              color: "#E2EEFF",
              padding: "10px 12px",
            }}
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.algorithm}
              </option>
            ))}
          </select>
        </div>

        <SelectedModelCard model={selected} />
        <button
          onClick={handleFinalize}
          style={{
            border: "none",
            borderRadius: 10,
            background: "#34D399",
            color: "#080F1A",
            padding: "12px 14px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          finalize_model 실행
        </button>
        <SaveModelForm modelPath={finalizeResult?.model_path} />
        <PipelineSummary steps={pipelineSteps} />
      </div>
      <div style={{ padding: 18, borderLeft: "1px solid #1A3352", display: "flex", flexDirection: "column", gap: 14 }}>
        <MLflowRegisterForm
          value={registryDraft}
          onChange={setRegistryDraft}
          onCommit={commitRegistryName}
          onRegister={handleRegister}
        />
        <StageManager modelName={registryName} versions={versions} onChangeStage={handleStage} onRollback={handleRollback} />
        <VersionTimeline versions={versions} />
      </div>
    </div>
  )
}
