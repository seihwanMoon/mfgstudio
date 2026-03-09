import { useEffect, useState } from "react"

import { mlflowAPI, registryAPI, scheduleAPI } from "../api"
import ExperimentCompareView from "../components/mlflow/ExperimentCompareView"
import ExperimentLogTable from "../components/mlflow/ExperimentLogTable"
import ModelRegistryList from "../components/mlflow/ModelRegistryList"
import ScheduleManager from "../components/mlflow/ScheduleManager"

export default function MLflowPage() {
  const [status, setStatus] = useState(null)
  const [models, setModels] = useState([])
  const [jobs, setJobs] = useState([])
  const [tab, setTab] = useState("logs")

  useEffect(() => {
    mlflowAPI.status().then(setStatus).catch(() => setStatus({ status: "disconnected" }))
    registryAPI.listModels().then(setModels).catch(() => setModels([]))
    scheduleAPI.jobs().then((response) => setJobs(response.jobs || [])).catch(() => setJobs([]))
  }, [])

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
          <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 8 }}>MLflow Status</div>
          <div style={{ color: status?.status === "connected" ? "#34D399" : "#F87171", fontWeight: 700 }}>
            {status?.status || "unknown"}
          </div>
          <div style={{ color: "#8BA8C8", fontSize: 12, marginTop: 8 }}>{status?.uri || "-"}</div>
        </div>
        <ModelRegistryList rows={models} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["logs", "Experiment Logs"],
            ["compare", "Experiment Compare"],
            ["registry", "Registry"],
            ["schedule", "Schedule"],
          ].map(([key, label]) => (
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
        {tab === "logs" ? <ExperimentLogTable rows={models} /> : null}
        {tab === "compare" ? <ExperimentCompareView rows={models} /> : null}
        {tab === "registry" ? <ModelRegistryList rows={models} /> : null}
        {tab === "schedule" ? (
          <ScheduleManager jobs={jobs} onToggle={handleToggle} onRunNow={handleRunNow} />
        ) : null}
      </div>
    </div>
  )
}
