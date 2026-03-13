import ApiTag from "../ui/ApiTag"
import Badge from "../ui/Badge"
import Button from "../ui/Button"

export default function ModelDetailPanel({ model }) {
  if (!model) {
    return (
      <div style={{ border: "1px solid var(--border)", borderRadius: 16, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 18 }}>
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>선택된 운영 모델이 없습니다.</div>
      </div>
    )
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 16, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <Badge color="#34D399">{model.stage || "미지정"}</Badge>
          <Badge color="#4A9DFF">{model.algorithm || "알 수 없음"}</Badge>
        </div>
        <div style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 800 }}>{model.mlflow_model_name || "등록 전 모델"}</div>
      </div>

      <ApiTag method="POST" path={`/api/predict/${model.mlflow_model_name || "{model_name}"}`} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Info label="버전" value={model.mlflow_version ?? "-"} />
        <Info label="드리프트" value={`${Math.round((model.drift_score ?? 0) * 100)}%`} />
        <Info label="오늘 예측" value={model.pred_count_today ?? 0} />
        <Info label="누적 예측" value={model.pred_count_total ?? 0} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Button fullWidth>단건 예측</Button>
        <Button variant="outline" fullWidth>
          배치 예측
        </Button>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-surface-strong)", padding: 12 }}>
      <div style={{ color: "var(--text-soft)", fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
