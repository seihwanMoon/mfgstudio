import { useEffect, useMemo, useState } from "react"

import { reportAPI, registryAPI, trainAPI } from "../api"
import MLflowRegisterForm from "../components/finalize/MLflowRegisterForm"
import PipelineSummary from "../components/finalize/PipelineSummary"
import SaveModelForm from "../components/finalize/SaveModelForm"
import SelectedModelCard from "../components/finalize/SelectedModelCard"
import StageManager from "../components/finalize/StageManager"
import VersionTimeline from "../components/finalize/VersionTimeline"
import useStore from "../store/useStore"

const STAGE_LABELS = {
  Production: "프로덕션",
  Staging: "스테이징",
  Archived: "보관",
  None: "미지정",
}

function buildMlflowStatus(response, successText) {
  if (!response) return ""
  if (response.mlflow_synced === false) {
    const detail = response.mlflow_error ? ` (${response.mlflow_error})` : ""
    return `${successText} MLflow 서버와는 동기화하지 못해 앱 기준 메타데이터로 처리했습니다.${detail}`
  }
  return successText
}

function buildRegistryMessage(response, fallbackText) {
  const base = buildMlflowStatus(response, fallbackText)
  if (response?.report_error) {
    return `${base} 보고서 갱신 경고: ${response.report_error}`
  }
  if (response?.report_generated) {
    return `${base} 프로덕션 보고서를 다시 생성했습니다.`
  }
  return base
}

export default function FinalizePage() {
  const { currentExperimentId, selectedModelsForTune, setupParams } = useStore()
  const [models, setModels] = useState([])
  const [selectedId, setSelectedId] = useState("")
  const [finalizeResult, setFinalizeResult] = useState(null)
  const [registryName, setRegistryName] = useState("manufacturing_model")
  const [registryDraft, setRegistryDraft] = useState("manufacturing_model")
  const [versions, setVersions] = useState([])
  const [registryMessage, setRegistryMessage] = useState("")
  const [registryReportUrl, setRegistryReportUrl] = useState("")

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

  const reportUrl = useMemo(() => {
    if (!finalizeResult?.model_id) return ""
    return reportAPI.downloadUrl(finalizeResult.model_id)
  }, [finalizeResult])

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
    setRegistryReportUrl(response?.report_download_url || "")
    setRegistryMessage(buildMlflowStatus(response, "모델 확정을 완료했습니다."))
  }

  async function handleRegister() {
    const normalized = String(registryDraft || "").trim()
    if (!finalizeResult?.run_id || !normalized) return
    if (normalized !== registryName) {
      setRegistryName(normalized)
    }
    const response = await registryAPI.register({ run_id: finalizeResult.run_id, model_name: normalized })
    await refreshVersions(normalized)
    setRegistryMessage(buildMlflowStatus(response, "레지스트리 등록을 완료했습니다."))
    return response
  }

  async function handleStage(version, stage) {
    const response = await registryAPI.changeStage(registryName, { version, stage })
    await refreshVersions(registryName)
    setRegistryReportUrl(response?.report_download_url || "")

    if (stage === "Production") {
      setRegistryMessage(buildRegistryMessage(response, "프로덕션 스테이지로 변경했습니다."))
    } else {
      setRegistryMessage(buildMlflowStatus(response, `${STAGE_LABELS[stage] || stage} 상태로 변경했습니다.`))
    }
  }

  async function handleRollback(version) {
    const response = await registryAPI.rollback(registryName, { version })
    await refreshVersions(registryName)
    setRegistryReportUrl(response?.report_download_url || "")
    setRegistryMessage(buildRegistryMessage(response, "롤백을 완료했습니다."))
  }

  const pipelineSteps = useMemo(() => {
    const steps = ["데이터 로드", "PyCaret setup"]
    if (setupParams.normalize) steps.push(`정규화(${setupParams.normalize_method || "auto"})`)
    if (setupParams.fix_imbalance) steps.push("불균형 보정")
    if (setupParams.remove_outliers) steps.push("이상치 제거")
    if (setupParams.imputation_type) steps.push(`결측치 처리:${setupParams.imputation_type}`)
    steps.push("finalize_model")
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
          <div style={{ color: "#E2EEFF", fontWeight: 700 }}>확정 대상 모델</div>
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
        <SaveModelForm
          modelPath={finalizeResult?.model_path}
          reportUrl={reportUrl}
          reportError={finalizeResult?.report_error}
          reportGenerated={finalizeResult?.report_generated}
          mlflowSynced={finalizeResult?.mlflow_synced}
          mlflowError={finalizeResult?.mlflow_error}
        />
        <PipelineSummary steps={pipelineSteps} />
      </div>
      <div style={{ padding: 18, borderLeft: "1px solid #1A3352", display: "flex", flexDirection: "column", gap: 14 }}>
        <MLflowRegisterForm
          value={registryDraft}
          onChange={setRegistryDraft}
          onCommit={commitRegistryName}
          onRegister={handleRegister}
        />
        {registryMessage ? (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              background: "var(--bg-surface)",
              boxShadow: "var(--shadow-panel)",
              padding: 14,
              color: "var(--text-primary)",
              fontSize: 13,
              lineHeight: 1.5,
              display: "grid",
              gap: 8,
            }}
          >
            <div>{registryMessage}</div>
            {registryReportUrl ? (
              <a
                href={registryReportUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent-blue)", fontWeight: 700, textDecoration: "none" }}
              >
                갱신된 보고서 열기
              </a>
            ) : null}
          </div>
        ) : null}
        <StageManager modelName={registryName} versions={versions} onChangeStage={handleStage} onRollback={handleRollback} />
        <VersionTimeline versions={versions} />
      </div>
    </div>
  )
}
