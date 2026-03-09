import Badge from "../ui/Badge"
import DriftGauge from "../charts/DriftGauge"

export default function ModelCard({ model, selected, onSelect }) {
  const score =
    model.metrics?.Accuracy ??
    model.metrics?.accuracy ??
    model.metrics?.R2 ??
    model.metrics?.r2 ??
    "—"

  return (
    <button
      onClick={() => onSelect(model)}
      style={{
        textAlign: "left",
        borderRadius: 14,
        cursor: "pointer",
        border: `1px solid ${selected ? "#38BDF8" : "#1A3352"}`,
        background: selected ? "rgba(56, 189, 248, 0.08)" : "#0D1926",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Badge color="#34D399">{model.stage || "Production"}</Badge>
            <Badge color="#8BA8C8">{model.algorithm || "Unknown"}</Badge>
          </div>
          <div style={{ color: "#E2EEFF", fontSize: 16, fontWeight: 800 }}>{model.mlflow_model_name || "등록 전 모델"}</div>
        </div>
        <div style={{ color: "#38BDF8", fontSize: 22, fontWeight: 800 }}>{score}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", color: "#8BA8C8", fontSize: 12 }}>
        <span>오늘 예측 {model.pred_count_today ?? 0}건</span>
        <span>누적 {model.pred_count_total ?? 0}건</span>
      </div>

      <DriftGauge value={model.drift_score ?? 0} />
    </button>
  )
}
