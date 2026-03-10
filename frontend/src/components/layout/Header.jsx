import { useNavigate } from "react-router-dom"

import useStore from "../../store/useStore"

export default function Header({ meta, prev, next, screens, order }) {
  const navigate = useNavigate()
  const theme = useStore((state) => state.theme)
  const setTheme = useStore((state) => state.setTheme)

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        padding: "14px 20px",
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: meta.color,
              border: `1px solid ${meta.color}55`,
              background: `${meta.color}18`,
            }}
          >
            {meta.icon}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: meta.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700 }}>{meta.phase}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{meta.label}</span>
            </div>
            <div style={{ color: "var(--text-soft)", fontSize: 10 }}>{meta.desc}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: 4,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--bg-surface-strong)",
            }}
          >
            {[
              ["light", "라이트"],
              ["dark", "다크"],
            ].map(([value, label]) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "7px 12px",
                    cursor: "pointer",
                    background: active ? "var(--accent-blue)" : "transparent",
                    color: active ? "var(--accent-contrast)" : "var(--text-secondary)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

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
              style={{
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--text-secondary)",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              이전
            </button>
          ) : null}
          {next ? (
            <button
              onClick={() => navigate(next)}
              style={{
                border: "none",
                background: meta.color,
                color: "var(--accent-contrast)",
                borderRadius: 8,
                padding: "8px 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              다음
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
