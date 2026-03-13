export default function SaveModelForm({ modelPath, reportUrl, reportError, reportGenerated }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 8 }}>저장된 모델</div>
      <code style={{ color: "#38BDF8", fontSize: 12, display: "block", marginBottom: 12 }}>
        {modelPath || "아직 finalize를 실행하지 않았습니다."}
      </code>

      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 8 }}>보고서</div>
      {reportUrl ? (
        <a
          href={reportUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#34D399", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
        >
          {reportGenerated ? "생성된 PDF 보고서 열기" : "최신 PDF 보고서 열기"}
        </a>
      ) : (
        <div style={{ color: "#8BA8C8", fontSize: 12 }}>아직 사용할 수 있는 보고서가 없습니다.</div>
      )}

      {reportError ? <div style={{ color: "#FCA5A5", fontSize: 12, marginTop: 10 }}>보고서 경고: {reportError}</div> : null}
    </div>
  )
}
