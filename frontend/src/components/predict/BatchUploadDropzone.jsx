export default function BatchUploadDropzone({ onFileChange, onSubmit, fileName }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>배치 CSV 업로드</div>
      <input type="file" accept=".csv" onChange={(event) => onFileChange(event.target.files?.[0] || null)} style={{ marginBottom: 10, color: "#8BA8C8" }} />
      <div style={{ color: "#8BA8C8", fontSize: 12, marginBottom: 10 }}>{fileName || "선택된 파일 없음"}</div>
      <button onClick={onSubmit} style={{ width: "100%", border: "none", borderRadius: 10, background: "#34D399", color: "#080F1A", padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}>
        배치 예측 실행
      </button>
    </div>
  )
}
