import { useEffect, useState } from "react"

import { mlflowAPI, registryAPI, scheduleAPI } from "../api"
import ExperimentCompareView from "../components/mlflow/ExperimentCompareView"
import ExperimentLogTable from "../components/mlflow/ExperimentLogTable"
import ModelRegistryList from "../components/mlflow/ModelRegistryList"
import ScheduleManager from "../components/mlflow/ScheduleManager"

const TABS = [
  ["logs", "실험 로그"],
  ["compare", "실험 비교"],
  ["registry", "레지스트리"],
  ["schedule", "스케줄"],
]

export default function MLflowPage() {
  const [status, setStatus] = useState(null)
  const [models, setModels] = useState([])
  const [experiments, setExperiments] = useState([])
  const [selectedExperimentId, setSelectedExperimentId] = useState(null)
  const [runs, setRuns] = useState([])
  const [jobs, setJobs] = useState([])
  const [tab, setTab] = useState("logs")
  const [loadingExperiments, setLoadingExperiments] = useState(true)
  const [loadingRuns, setLoadingRuns] = useState(false)

  useEffect(() => {
    mlflowAPI.status().then(setStatus).catch(() => setStatus({ status: "disconnected" }))
    registryAPI.listModels().then(setModels).catch(() => setModels([]))

    setLoadingExperiments(true)
    mlflowAPI
      .experiments()
      .then((response) => {
        const rows = response.experiments || []
        setExperiments(rows)
        setSelectedExperimentId(rows[0]?.experiment_id || null)
      })
      .catch(() => {
        setExperiments([])
        setSelectedExperimentId(null)
      })
      .finally(() => setLoadingExperiments(false))

    scheduleAPI.jobs().then((response) => setJobs(response.jobs || [])).catch(() => setJobs([]))
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

  async function refreshJobs() {
    const response = await scheduleAPI.jobs()
    setJobs(response.jobs || [])
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

  return (
    <div style={{ height: "100%", padding: 18, display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
          <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 8 }}>MLflow 상태</div>
          <div style={{ color: status?.status === "connected" ? "#34D399" : "#F87171", fontWeight: 700 }}>
            {status?.status || "unknown"}
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
      </div>
    </div>
  )
}
