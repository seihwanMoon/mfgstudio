export default function VersionTimeline({ versions = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>버전 히스토리</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {versions.map((version) => (
          <div key={version.version} style={{ borderTop: "1px solid #1A3352", paddingTop: 8, color: "#8BA8C8" }}>
            v{version.version} · {version.stage} · {version.algorithm}
          </div>
        ))}
      </div>
    </div>
  )
}
