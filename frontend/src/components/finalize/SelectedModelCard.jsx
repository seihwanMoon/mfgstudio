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
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{model.algorithm}</div>
      <div style={{ color: "#8BA8C8", fontSize: 12, marginBottom: 4 }}>run_id: {model.mlflow_run_id || "-"}</div>
      <div style={{ color: "#34D399", fontWeight: 700 }}>model_id: {model.id}</div>
    </div>
  )
}
