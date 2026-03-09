export default function StageManager({ modelName, versions = [], onChangeStage, onRollback }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>스테이지 관리</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {versions.map((version) => (
          <div key={version.version} style={{ borderTop: "1px solid #1A3352", paddingTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ color: "#E2EEFF" }}>
                v{version.version} <span style={{ color: "#8BA8C8", marginLeft: 8 }}>{version.stage}</span>
              </div>
              {version.stage !== "Production" ? (
                <button onClick={() => onRollback(version.version)} style={miniButton}>
                  롤백
                </button>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["None", "Staging", "Production", "Archived"].map((stage) => (
                <button key={stage} onClick={() => onChangeStage(version.version, stage)} style={miniButton}>
                  {stage}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const miniButton = {
  border: "1px solid #1A3352",
  borderRadius: 8,
  background: "#111E2E",
  color: "#E2EEFF",
  padding: "8px 10px",
  cursor: "pointer",
}
