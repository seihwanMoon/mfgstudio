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

function buildRetirePreviewMessage(item, preview) {
  const actions = preview.actions?.length
    ? preview.actions.map((value, index) => `${index + 1}. ${value}`).join("\n")
    : "예정된 정리 작업이 없습니다."
  const skipped = preview.skipped?.length ? `\n\n제외 항목:\n- ${preview.skipped.join("\n- ")}` : ""
  const deleteState = preview.experiment_deletable_after
    ? "\n\n정리 후에는 연결된 실험도 삭제 가능한 상태가 됩니다."
    : preview.experiment_delete_blockers_after?.length
      ? `\n\n정리 후에도 실험 삭제 제한이 남습니다:\n- ${preview.experiment_delete_blockers_after.join("\n- ")}`
      : ""

  return (
    `'${item.model_name}' 모델 은퇴 정리 미리보기\n\n` +
    `예정 작업:\n${actions}` +
    skipped +
    deleteState +
    "\n\n이대로 실행하시겠습니까?"
  )
}

function buildCleanupDeleteMessage(item, preview) {
  const actions = preview.actions?.length
    ? preview.actions.map((value, index) => `${index + 1}. ${value}`).join("\n")
    : "예정된 정리 작업이 없습니다."
  const blockers = preview.delete_blockers_before?.length
    ? `\n\n현재 삭제 제한:\n- ${preview.delete_blockers_before.join("\n- ")}`
    : ""

  return (
    `'${item.name}' 실험 정리 후 삭제\n\n` +
    `연결 자산까지 함께 삭제합니다.\n` +
    `- 모델 ${preview.model_count || 0}개\n` +
    `- 예측 이력 ${preview.prediction_count || 0}건\n` +
    `- 리포트 ${preview.report_count || 0}개\n\n` +
    `예정 작업:\n${actions}` +
    blockers +
    "\n\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?"
  )
}

export default function MLflowPage() {
  const [status, setStatus] = useState(null)
  const [models, setModels] = useState([])
  const [experiments, setExperiments] = useState([])
  const [selectedExperimentId, setSelectedExperimentId] = useState(null)
  const [runs, setRuns] = useState([])
  const [jobs, setJobs] = useState([])
  const [managedExperiments, setManagedExperiments] = useState([])
  const [managedReports, setManagedReports] = useState([])
  const [mlflowOrphans, setMlflowOrphans] = useState({ experiments: [], registered_models: [], counts: {} })
  const [cacheStatus, setCacheStatus] = useState(null)
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
    const [experimentResponse, reportResponse, cacheResponse, mlflowOrphanResponse] = await Promise.all([
      opsAPI.experiments().catch(() => ({ experiments: [] })),
      opsAPI.reports().catch(() => ({ reports: [] })),
      opsAPI.cacheStatus().catch(() => null),
      opsAPI.mlflowOrphans().catch(() => ({ experiments: [], registered_models: [], counts: {} })),
    ])
    setManagedExperiments(experimentResponse.experiments || [])
    setManagedReports(reportResponse.reports || [])
    setCacheStatus(cacheResponse)
    setMlflowOrphans(mlflowOrphanResponse || { experiments: [], registered_models: [], counts: {} })
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
    setOpsMessage(`실험 '${item.name}'을 보관 상태로 변경했습니다.`)
    await refreshOperations()
  }

  async function handleArchiveExperiments(items) {
    const targets = items.filter((item) => item.status !== "archived")
    if (!targets.length) {
      setOpsMessage("보관할 실험이 없습니다.")
      return
    }
    const confirmed = window.confirm(`선택된 ${targets.length}개 실험을 보관 상태로 변경하시겠습니까?`)
    if (!confirmed) return
    await Promise.all(targets.map((item) => opsAPI.archiveExperiment(item.experiment_id)))
    setOpsMessage(`${targets.length}개 실험을 보관 상태로 변경했습니다.`)
    await refreshOperations()
  }

  async function handleDeleteExperiment(item) {
    const confirmed = window.confirm(`실험 '${item.name}'을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)
    if (!confirmed) return
    await opsAPI.deleteExperiment(item.experiment_id)
    setOpsMessage(`실험 '${item.name}'을 삭제했습니다.`)
    await Promise.all([refreshOperations(), refreshMlflowExperiments(), refreshRegistry()])
  }

  async function handleCleanupDeleteExperiment(item) {
    const preview = await opsAPI.cleanupDeletePreview(item.experiment_id)
    const confirmed = window.confirm(buildCleanupDeleteMessage(item, preview))
    if (!confirmed) return

    const response = await opsAPI.cleanupDeleteExperiment(item.experiment_id)
    const actions = response.actions?.length ? response.actions.join(", ") : "정리 작업 없음"
    const skipped = response.skipped?.length ? ` / 예외: ${response.skipped.join(", ")}` : ""
    const sync = response.mlflow_synced === false ? " / MLflow는 일부 수동 정리가 필요합니다." : ""
    setOpsMessage(`실험 '${item.name}' 정리 후 삭제 완료: ${actions}${skipped}${sync}`)
    await Promise.all([refreshOperations(), refreshMlflowExperiments(), refreshRegistry()])
  }

  async function handleRegenerateReport(item) {
    await reportAPI.generate(item.model_id, true)
    setOpsMessage(`보고서 '${item.model_name}'을 다시 생성했습니다.`)
    await refreshOperations()
  }

  async function handleRegenerateReports(items) {
    const targets = items.filter((item) => !item.report_exists)
    if (!targets.length) {
      setOpsMessage("생성할 누락 보고서가 없습니다.")
      return
    }
    const confirmed = window.confirm(`누락된 ${targets.length}개 보고서를 한 번에 생성하시겠습니까?`)
    if (!confirmed) return
    await Promise.all(targets.map((item) => reportAPI.generate(item.model_id, true)))
    setOpsMessage(`누락된 ${targets.length}개 보고서를 생성했습니다.`)
    await refreshOperations()
  }

  async function handleDeleteReport(item) {
    const confirmed = window.confirm(`보고서 PDF '${item.model_name}'을 삭제하시겠습니까?`)
    if (!confirmed) return
    await opsAPI.deleteReport(item.model_id)
    setOpsMessage(`보고서 PDF '${item.model_name}'을 삭제했습니다.`)
    await refreshOperations()
  }

  async function handleRetireModel(item) {
    const preview = await opsAPI.retirePreview(item.model_id)
    const confirmed = window.confirm(buildRetirePreviewMessage(item, preview))
    if (!confirmed) return

    const response = await opsAPI.retireModel(item.model_id)
    const actions = response.actions?.length ? response.actions.join(", ") : "실행된 정리 작업 없음"
    const skipped = response.skipped?.length ? ` / 제외: ${response.skipped.join(", ")}` : ""
    const deleteState = response.experiment_deletable_after
      ? " / 연결 실험도 이제 삭제 가능합니다."
      : response.experiment_delete_blockers_after?.length
        ? ` / 남은 실험 삭제 제한: ${response.experiment_delete_blockers_after.join(", ")}`
        : ""

    setOpsMessage(`모델 '${item.model_name}' 은퇴 정리 완료: ${actions}${skipped}${deleteState}`)
    await Promise.all([refreshOperations(), refreshRegistry(), refreshMlflowExperiments()])
  }

  async function handleCleanupCache() {
    const confirmed = window.confirm("현재 보존 정책 기준으로 아티팩트 캐시를 정리하시겠습니까?")
    if (!confirmed) return
    const response = await opsAPI.cleanupCache()
    const reportPairs = response?.cleanup?.report_chart_cache?.removed_pairs || 0
    const xaiPairs = response?.cleanup?.xai_snapshot_cache?.removed_pairs || 0
    setOpsMessage(`캐시 정리 완료: report ${reportPairs}쌍, XAI ${xaiPairs}쌍 정리`)
    setCacheStatus(response)
  }

  async function handleDeleteMlflowExperiment(item) {
    const confirmed = window.confirm(`MLflow 실험 '${item.name}' (${item.experiment_id})를 삭제하시겠습니까?\n앱과 연결되지 않은 MLflow 자산만 정리하는 용도입니다.`)
    if (!confirmed) return
    await opsAPI.deleteMlflowExperiment(item.experiment_id)
    setOpsMessage(`MLflow 고아 실험 '${item.name}'을 삭제했습니다.`)
    await Promise.all([refreshOperations(), refreshMlflowExperiments()])
  }

  async function handleDeleteMlflowModel(item) {
    const confirmed = window.confirm(`MLflow 등록 모델 '${item.name}'을 삭제하시겠습니까?\n남아 있는 모든 등록 버전이 함께 제거됩니다.`)
    if (!confirmed) return
    await opsAPI.deleteMlflowModel(item.name)
    setOpsMessage(`MLflow 고아 등록 모델 '${item.name}'을 삭제했습니다.`)
    await Promise.all([refreshOperations(), refreshRegistry()])
  }

  return (
    <div style={{ height: "100%", padding: 18, display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
          <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 8 }}>MLflow 상태</div>
          <div style={{ color: status?.status === "connected" ? "#34D399" : "#F87171", fontWeight: 700 }}>
            {status?.status === "connected"
              ? "연결됨"
              : status?.status === "disconnected"
                ? "연결 안 됨"
                : status?.status || "상태 없음"}
          </div>
          <div style={{ color: "#8BA8C8", fontSize: 12, marginTop: 8 }}>{status?.uri || "-"}</div>
          {status?.error ? <div style={{ color: "#FCA5A5", fontSize: 12, marginTop: 8 }}>{status.error}</div> : null}
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
                {loadingExperiments ? "MLflow 실험 목록을 불러오는 중입니다..." : "선택한 실험의 run 목록을 불러오는 중입니다..."}
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
            mlflowOrphans={mlflowOrphans}
            cacheStatus={cacheStatus}
            message={opsMessage}
            onArchiveExperiment={handleArchiveExperiment}
            onArchiveExperiments={handleArchiveExperiments}
            onDeleteExperiment={handleDeleteExperiment}
            onCleanupDeleteExperiment={handleCleanupDeleteExperiment}
            onRetireModel={handleRetireModel}
            onRegenerateReport={handleRegenerateReport}
            onRegenerateReports={handleRegenerateReports}
            onDeleteReport={handleDeleteReport}
            onRefreshCacheStatus={refreshOperations}
            onCleanupCache={handleCleanupCache}
            onDeleteMlflowExperiment={handleDeleteMlflowExperiment}
            onDeleteMlflowModel={handleDeleteMlflowModel}
          />
        ) : null}
      </div>
    </div>
  )
}
