export default function SelectedModelCard({ model }) {
  if (!model) {
    return (
      <div
        style={{
          border: "1px dashed #234466",
          borderRadius: 14,
          minHeight: 160,
          display: "grid",
          placeItems: "center",
          color: "#8BA8C8",
        }}
      >
        선택된 모델이 없습니다.
      </div>
    )
  }

  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ color: "#E2EEFF", fontSize: 18, fontWeight: 800 }}>{model.algorithm}</div>
        {model.operation ? <Badge color="#38BDF8">{model.operation}</Badge> : null}
        {model.is_tuned ? <Badge color="#34D399">tuned</Badge> : null}
      </div>
      <div style={{ color: "#8BA8C8", fontSize: 12 }}>run_id: {model.mlflow_run_id || "-"}</div>
      <div style={{ color: "#34D399", fontWeight: 700 }}>model_id: {model.id}</div>
      {model.members?.length ? <div style={{ color: "#8BA8C8", fontSize: 12 }}>구성 모델: {model.members.join(", ")}</div> : null}
      {model.resolved_model_name ? <div style={{ color: "#8BA8C8", fontSize: 12 }}>실제 추정기: {model.resolved_model_name}</div> : null}
    </div>
  )
}

function Badge({ children, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: `${color}22`,
        color,
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  )
}
