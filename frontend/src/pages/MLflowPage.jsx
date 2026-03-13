import { useEffect, useState } from "react"

import { mlflowAPI, opsAPI, registryAPI, reportAPI, scheduleAPI } from "../api"
import ExperimentCompareView from "../components/mlflow/ExperimentCompareView"
import ExperimentLogTable from "../components/mlflow/ExperimentLogTable"
import ModelRegistryList from "../components/mlflow/ModelRegistryList"
import OperationsPanel from "../components/mlflow/OperationsPanel"
import ScheduleManager from "../components/mlflow/ScheduleManager"

const TABS = [
  ["logs", "실험 로그"],
  ["compare", "실험 비교"],
  ["registry", "레지스트리"],
  ["schedule", "스케줄"],
  ["operations", "운영 관리"],
]

export default function MLflowPage() {
  const [status, setStatus] = useState(null)
  const [models, setModels] = useState([])
  const [experiments, setExperiments] = useState([])
  const [selectedExperimentId, setSelectedExperimentId] = useState(null)
  const [runs, setRuns] = useState([])
  const [jobs, setJobs] = useState([])
  const [managedExperiments, setManagedExperiments] = useState([])
  const [managedReports, setManagedReports] = useState([])
  const [tab, setTab] = useState("logs")
  const [loadingExperiments, setLoadingExperiments] = useState(true)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [opsMessage, setOpsMessage] = useState("")

  useEffect(() => {
    refreshStatus()
    refreshRegistry()
    refreshMlflowExperiments()
    refreshJobs()
    refreshOperations()
  }, [])

  useEffect(() => {
    if (!selectedExperimentId) {
      setRuns([])
      return
    }

    setLoadingRuns(true)
    mlflowAPI
      .runs(selectedExperimentId)
      .then((response) => setRuns(response.runs || []))
      .catch(() => setRuns([]))
      .finally(() => setLoadingRuns(false))
  }, [selectedExperimentId])

  async function refreshStatus() {
    mlflowAPI.status().then(setStatus).catch(() => setStatus({ status: "disconnected" }))
  }

  async function refreshRegistry() {
    registryAPI.listModels().then(setModels).catch(() => setModels([]))
  }

  async function refreshMlflowExperiments() {
    setLoadingExperiments(true)
    mlflowAPI
      .experiments()
      .then((response) => {
        const rows = response.experiments || []
        setExperiments(rows)
        setSelectedExperimentId((current) => current || rows[0]?.experiment_id || null)
      })
      .catch(() => {
        setExperiments([])
        setSelectedExperimentId(null)
      })
      .finally(() => setLoadingExperiments(false))
  }

  async function refreshJobs() {
    const response = await scheduleAPI.jobs().catch(() => ({ jobs: [] }))
    setJobs(response.jobs || [])
  }

  async function refreshOperations() {
    const [experimentResponse, reportResponse] = await Promise.all([
      opsAPI.experiments().catch(() => ({ experiments: [] })),
      opsAPI.reports().catch(() => ({ reports: [] })),
    ])
    setManagedExperiments(experimentResponse.experiments || [])
    setManagedReports(reportResponse.reports || [])
  }

  async function handleToggle(job) {
    if (job.status === "paused") {
      await scheduleAPI.resume(job.id)
    } else {
      await scheduleAPI.pause(job.id)
    }
    await refreshJobs()
  }

  async function handleRunNow(jobId) {
    await scheduleAPI.runNow(jobId)
    await refreshJobs()
  }

  async function handleArchiveExperiment(item) {
    await opsAPI.archiveExperiment(item.experiment_id)
    setOpsMessage(`실험 '${item.name}'을(를) 보관 상태로 변경했습니다.`)
    await refreshOperations()
  }

  async function handleDeleteExperiment(item) {
    const confirmed = window.confirm(`실험 '${item.name}'을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)
    if (!confirmed) return
    await opsAPI.deleteExperiment(item.experiment_id)
    setOpsMessage(`실험 '${item.name}'을(를) 삭제했습니다.`)
    await Promise.all([refreshOperations(), refreshMlflowExperiments(), refreshRegistry()])
  }

  async function handleRegenerateReport(item) {
    await reportAPI.generate(item.model_id, true)
    setOpsMessage(`리포트 '${item.model_name}'을(를) 다시 생성했습니다.`)
    await refreshOperations()
  }

  async function handleDeleteReport(item) {
    const confirmed = window.confirm(`리포트 PDF '${item.model_name}'을(를) 삭제하시겠습니까?`)
    if (!confirmed) return
    await opsAPI.deleteReport(item.model_id)
    setOpsMessage(`리포트 PDF '${item.model_name}'을(를) 삭제했습니다.`)
    await refreshOperations()
  }

  async function handleRetireModel(item) {
    const confirmed = window.confirm(
      `'${item.model_name}' 모델을 은퇴 정리하시겠습니까?\n\n` +
      `1. 스테이지를 Archived로 전환\n` +
      `2. 리포트 PDF 삭제\n` +
      `3. 예측 이력이 없으면 MLflow 버전과 최종 모델 파일도 정리`
    )
    if (!confirmed) return
    const response = await opsAPI.retireModel(item.model_id)
    const actions = response.actions?.length ? response.actions.join(", ") : "수행된 정리 작업 없음"
    const skipped = response.skipped?.length ? ` / 제외: ${response.skipped.join(", ")}` : ""
    setOpsMessage(`모델 '${item.model_name}' 은퇴 정리 완료: ${actions}${skipped}`)
    await Promise.all([refreshOperations(), refreshRegistry()])
  }

  return (
    <div style={{ height: "100%", padding: 18, display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
          <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 8 }}>MLflow 상태</div>
          <div style={{ color: status?.status === "connected" ? "#34D399" : "#F87171", fontWeight: 700 }}>
            {status?.status === "connected" ? "연결됨" : status?.status === "disconnected" ? "연결 안됨" : status?.status || "상태 없음"}
          </div>
          <div style={{ color: "#8BA8C8", fontSize: 12, marginTop: 8 }}>{status?.uri || "-"}</div>
        </div>
        <ModelRegistryList rows={models} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                borderRadius: 8,
                border: `1px solid ${tab === key ? "#38BDF8" : "#1A3352"}`,
                background: tab === key ? "rgba(56, 189, 248, 0.12)" : "#0D1926",
                color: tab === key ? "#38BDF8" : "#8BA8C8",
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "logs" ? (
          <>
            <ExperimentLogTable
              experiments={loadingExperiments ? [] : experiments}
              selectedExperimentId={selectedExperimentId}
              onSelectExperiment={setSelectedExperimentId}
              runs={loadingRuns ? [] : runs}
            />
            {loadingExperiments || loadingRuns ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                {loadingExperiments ? "MLflow 실험 목록을 불러오는 중..." : "선택한 실험의 run 목록을 불러오는 중..."}
              </div>
            ) : null}
          </>
        ) : null}

        {tab === "compare" ? <ExperimentCompareView experiments={experiments} /> : null}
        {tab === "registry" ? <ModelRegistryList rows={models} /> : null}
        {tab === "schedule" ? <ScheduleManager jobs={jobs} onToggle={handleToggle} onRunNow={handleRunNow} /> : null}
        {tab === "operations" ? (
          <OperationsPanel
            experiments={managedExperiments}
            reports={managedReports}
            message={opsMessage}
            onArchiveExperiment={handleArchiveExperiment}
            onDeleteExperiment={handleDeleteExperiment}
            onRetireModel={handleRetireModel}
            onRegenerateReport={handleRegenerateReport}
            onDeleteReport={handleDeleteReport}
          />
        ) : null}
      </div>
    </div>
  )
}
