const STAGE_LABELS = {
  None: "미지정",
  Staging: "스테이징",
  Production: "프로덕션",
  Archived: "보관",
}

export default function VersionTimeline({ versions = [] }) {
  return (
    <div style={{ border: "1px solid #1A3352", borderRadius: 14, background: "#0D1926", padding: 16 }}>
      <div style={{ color: "#E2EEFF", fontWeight: 700, marginBottom: 10 }}>버전 히스토리</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {versions.length ? (
          versions.map((version) => (
            <div key={version.version} style={{ borderTop: "1px solid #1A3352", paddingTop: 8, color: "#8BA8C8" }}>
              v{version.version} / {STAGE_LABELS[version.stage] || version.stage} / {version.algorithm}
            </div>
          ))
        ) : (
          <div style={{ color: "#8BA8C8" }}>등록된 버전이 없습니다.</div>
        )}
      </div>
    </div>
  )
}
