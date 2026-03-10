export default function BatchUploadDropzone({ onFileChange, onSubmit, fileName }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, background: "var(--bg-surface)", boxShadow: "var(--shadow-panel)", padding: 16 }}>
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 10 }}>배치 예측 파일</div>
      <input type="file" accept=".csv" onChange={(event) => onFileChange(event.target.files?.[0] || null)} style={{ marginBottom: 10, color: "var(--text-secondary)" }} />
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 12 }}>{fileName || "선택된 파일이 없습니다."}</div>
      <button
        onClick={onSubmit}
        style={{
          width: "100%",
          border: "none",
          borderRadius: 12,
          background: "var(--success)",
          color: "white",
          padding: "13px 14px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        배치 예측 실행
      </button>
    </div>
  )
}
