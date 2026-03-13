const STAGE_LABELS = {
  None: "미지정",
  Staging: "스테이징",
  Production: "프로덕션",
  Archived: "보관",
}

export default function StageManager({ modelName, versions = [], onChangeStage, onRollback }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 18,
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-panel)",
        padding: 16,
      }}
    >
      <div style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: 8 }}>스테이지 관리</div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
        같은 모델명 안에서 버전별 상태를 관리합니다.
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 12 }}>모델명: {modelName || "-"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {versions.map((version) => (
          <div key={version.version} style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ color: "var(--text-primary)" }}>
                v{version.version}
                <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>{STAGE_LABELS[version.stage] || version.stage}</span>
              </div>
              {version.stage !== "Production" ? (
                <button onClick={() => onRollback(version.version)} style={miniButton}>
                  이 버전으로 롤백
                </button>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["None", "Staging", "Production", "Archived"].map((stage) => (
                <button key={stage} onClick={() => onChangeStage(version.version, stage)} style={miniButton}>
                  {STAGE_LABELS[stage] || stage}
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
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--bg-surface-soft)",
  color: "var(--text-primary)",
  padding: "8px 10px",
  cursor: "pointer",
}
