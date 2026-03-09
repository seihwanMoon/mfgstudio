import { useEffect, useState } from "react"

import ModelCardGrid from "../components/home/ModelCardGrid"
import ModelDetailPanel from "../components/home/ModelDetailPanel"
import StagingAlertBar from "../components/home/StagingAlertBar"
import Spinner from "../components/ui/Spinner"
import { dashboardAPI } from "../api/index"

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([dashboardAPI.getModels(), dashboardAPI.getStats()])
      .then(([modelsRes, statsRes]) => {
        if (!active) return
        setModels(modelsRes)
        setStats(statsRes)
        setSelectedModel(modelsRes[0] ?? null)
      })
      .catch(() => {
        if (!active) return
        setModels([])
        setStats({ production_model_count: 0, prediction_count_total: 0, alert_count: 0 })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div style={{ height: "100%", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      <StagingAlertBar count={0} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <Stat title="운영 모델" value={stats?.production_model_count ?? 0} color="#38BDF8" />
        <Stat title="전체 예측 수" value={stats?.prediction_count_total ?? 0} color="#34D399" />
        <Stat title="알림 수" value={stats?.alert_count ?? 0} color="#FBBF24" />
      </div>

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", flex: 1 }}>
          <Spinner size={28} />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18 }}>
          <div style={{ minHeight: 0, overflow: "auto" }}>
            {models.length ? (
              <ModelCardGrid models={models} selectedModel={selectedModel} onSelect={setSelectedModel} />
            ) : (
              <EmptyState />
            )}
          </div>
          <ModelDetailPanel model={selectedModel} />
        </div>
      )}
    </div>
  )
}

function Stat({ title, value, color }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 16, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#5A7A9A", fontSize: 11, marginBottom: 8 }}>{title}</div>
      <div style={{ color, fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        border: "1px dashed #234466",
        borderRadius: 16,
        background: "#0D1926",
        minHeight: 320,
        display: "grid",
        placeItems: "center",
        color: "#8BA8C8",
        padding: 24,
      }}
    >
      아직 Production 모델이 없습니다. 데이터 업로드와 학습 단계를 진행하면 운영 카드가 여기에 표시됩니다.
    </div>
  )
}
