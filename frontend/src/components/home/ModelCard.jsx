import DriftGauge from "../charts/DriftGauge"
import Badge from "../ui/Badge"

const STAGE_LABELS = {
  None: "미지정",
  Staging: "스테이징",
  Production: "프로덕션",
  Archived: "보관",
}

export default function ModelCard({ model, selected, onSelect }) {
  const score = model.metrics?.Accuracy ?? model.metrics?.accuracy ?? model.metrics?.R2 ?? model.metrics?.r2 ?? "-"

  return (
    <button
      onClick={() => onSelect(model)}
      style={{
        textAlign: "left",
        borderRadius: 14,
        cursor: "pointer",
        border: `1px solid ${selected ? "var(--accent-blue)" : "var(--border)"}`,
        background: selected ? "var(--accent-blue-soft)" : "var(--bg-surface)",
        boxShadow: "var(--shadow-panel)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <Badge color="#34D399">{STAGE_LABELS[model.stage] || model.stage || "미지정"}</Badge>
            <Badge color="#4A9DFF">{model.algorithm || "알고리즘 없음"}</Badge>
          </div>
          <div style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 800 }}>{model.mlflow_model_name || "등록 전 모델"}</div>
        </div>
        <div style={{ color: "var(--accent-blue)", fontSize: 22, fontWeight: 800 }}>{score}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: 12 }}>
        <span>오늘 예측 {model.pred_count_today ?? 0}건</span>
        <span>누적 {model.pred_count_total ?? 0}건</span>
      </div>

      <DriftGauge value={model.drift_score ?? 0} />
    </button>
  )
}
