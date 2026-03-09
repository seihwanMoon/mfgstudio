import { useNavigate } from "react-router-dom"

const GROUPS = [
  { label: "운영", paths: ["/home"] },
  { label: "데이터", paths: ["/upload", "/setup"] },
  { label: "학습", paths: ["/compare", "/tune"] },
  { label: "평가·배포", paths: ["/analyze", "/finalize", "/predict"] },
  { label: "MLOps", paths: ["/mlflow"] },
]

export default function Sidebar({ activePath, screenMeta }) {
  const navigate = useNavigate()

  return (
    <aside
      style={{
        width: 196,
        flexShrink: 0,
        borderRight: "1px solid #1A3352",
        background: "#111E2E",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "16px 14px", borderBottom: "1px solid #1A3352" }}>
        <div style={{ color: "#38BDF8", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800 }}>
          ⬡ MFG AI STUDIO
        </div>
        <div style={{ color: "#5A7A9A", fontSize: 9, marginTop: 3 }}>PyCaret 3.0 · MLflow 2.11</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div style={{ color: "#3D5A78", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, padding: "10px 14px 4px" }}>
              {group.label}
            </div>
            {group.paths.map((path) => {
              const meta = screenMeta[path]
              const active = path === activePath
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "none",
                    cursor: "pointer",
                    padding: "9px 14px",
                    textAlign: "left",
                    background: active ? `${meta.color}18` : "transparent",
                    borderLeft: `3px solid ${active ? meta.color : "transparent"}`,
                    color: active ? meta.color : "#8BA8C8",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: active ? meta.color : `${meta.color}22`,
                      color: active ? "#080F1A" : meta.color,
                      fontWeight: 700,
                    }}
                  >
                    {meta.icon}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 400 }}>{meta.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 14px", borderTop: "1px solid #1A3352", fontSize: 9 }}>
        <div style={{ color: "#34D399" }}>● MLflow 연결 상태 확인 필요</div>
        <div style={{ color: "#5A7A9A", marginTop: 3 }}>운영 모델 0개</div>
      </div>
    </aside>
  )
}
