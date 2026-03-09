import { useNavigate } from "react-router-dom"

export default function Header({ meta, prev, next, screens, order }) {
  const navigate = useNavigate()

  return (
    <header
      style={{
        borderBottom: "1px solid #1A3352",
        background: "#111E2E",
        padding: "10px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: meta.color,
              border: `1px solid ${meta.color}55`,
              background: `${meta.color}22`,
            }}
          >
            {meta.icon}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: meta.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700 }}>{meta.phase}</span>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{meta.label}</span>
            </div>
            <div style={{ color: "#5A7A9A", fontSize: 9 }}>{meta.desc}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {order.map((path) => {
              const active = screens[path].label === meta.label
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    width: active ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    border: "none",
                    cursor: "pointer",
                    background: active ? screens[path].color : `${screens[path].color}44`,
                  }}
                />
              )
            })}
          </div>

          {prev ? (
            <button
              onClick={() => navigate(prev)}
              style={{ border: "1px solid #3D5A78", background: "transparent", color: "#8BA8C8", borderRadius: 5, padding: "6px 12px", cursor: "pointer" }}
            >
              ← 이전
            </button>
          ) : null}
          {next ? (
            <button
              onClick={() => navigate(next)}
              style={{ border: "none", background: meta.color, color: "#080F1A", borderRadius: 5, padding: "6px 12px", fontWeight: 700, cursor: "pointer" }}
            >
              다음 →
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
