import ApiTag from "../ui/ApiTag"
import Badge from "../ui/Badge"
import Button from "../ui/Button"

export default function ModelDetailPanel({ model }) {
  if (!model) {
    return (
      <div style={{ border: "1px solid #1A3352", borderRadius: 16, background: "#0D1926", padding: 18 }}>
        <div style={{ color: "#8BA8C8", fontSize: 14 }}>선택된 Production 모델이 없습니다.</div>
      </div>
    )
  }

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 16, background: "#0D1926", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Badge color="#34D399">{model.stage || "Production"}</Badge>
          <Badge color="#38BDF8">{model.algorithm || "Unknown"}</Badge>
        </div>
        <div style={{ color: "#E2EEFF", fontSize: 22, fontWeight: 800 }}>{model.mlflow_model_name || "등록 전 모델"}</div>
      </div>

      <ApiTag method="POST" path={`/api/predict/${model.mlflow_model_name || "{model_name}"}`} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Info label="버전" value={model.mlflow_version ?? "—"} />
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
    <div style={{ border: "1px solid #1A3352", borderRadius: 10, background: "#111E2E", padding: 12 }}>
      <div style={{ color: "#5A7A9A", fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#E2EEFF", fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
