import { useEffect, useMemo, useRef } from "react"

function getModeLabel(moduleType) {
  if (moduleType === "regression") return "회귀"
  if (moduleType === "classification") return "분류"
  if (moduleType === "clustering") return "클러스터링"
  if (moduleType === "anomaly") return "이상치 탐지"
  if (moduleType === "timeseries") return "시계열"
  return moduleType
}

function getSupportLevelLabel(level) {
  if (level === "preferred") return "native 강함"
  if (level === "conditional") return "조건부 native"
  if (level === "fallback_only") return "fallback 전용"
  return "-"
}

function getObservationLabel(status) {
  if (status === "native_only") return "native 관찰"
  if (status === "mixed") return "혼합 관찰"
  if (status === "fallback_only") return "fallback 관찰"
  return "관찰 없음"
}

function PlotlyFigure({ figureJson }) {
  const containerRef = useRef(null)
  const figure = useMemo(() => {
    if (!figureJson) return null
    try {
      return JSON.parse(figureJson)
    } catch {
      return null
    }
  }, [figureJson])

  useEffect(() => {
    if (!containerRef.current || !figure) return

    let mounted = true
    let plotlyInstance = null

    async function renderFigure() {
      const Plotly = (await import("plotly.js-dist-min")).default
      if (!mounted || !containerRef.current) return
      plotlyInstance = Plotly

      const layout = {
        ...(figure.layout || {}),
        autosize: true,
        paper_bgcolor: "white",
        plot_bgcolor: "white",
        font: {
          family: "'Malgun Gothic', 'NanumGothic', sans-serif",
          ...(figure.layout?.font || {}),
        },
        margin: {
          l: 60,
          r: 30,
          t: 70,
          b: 55,
          ...(figure.layout?.margin || {}),
        },
      }

      Plotly.react(containerRef.current, figure.data || [], layout, {
        responsive: true,
        displayModeBar: false,
      })
    }

    renderFigure()

    function handleResize() {
      if (plotlyInstance && containerRef.current) {
        plotlyInstance.Plots.resize(containerRef.current)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => {
      mounted = false
      window.removeEventListener("resize", handleResize)
      if (plotlyInstance && containerRef.current) {
        plotlyInstance.purge(containerRef.current)
      }
    }
  }, [figure])

  return <div ref={containerRef} style={{ width: "100%", minHeight: 520 }} />
}

function SourceBadge({ fallbackUsed }) {
  const color = fallbackUsed ? "var(--warning)" : "var(--success)"
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: `${color}18`,
        color,
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {fallbackUsed ? "fallback 경로" : "native 경로"}
    </span>
  )
}

export default function PlotRenderArea({
  image,
  figureJson,
  renderMode,
  isLoading,
  plotLabel,
  plotFamily,
  moduleType,
  nativeSource,
  fallbackUsed,
  sourcePreference,
  nativeReason = "",
  fallbackReason = "",
  estimatorFamilyLabel = "",
  supportLevel = "",
  effectiveSupportLevel = "",
  policyNote = "",
  effectivePolicyNote = "",
  observedStatus = "",
  observedNote = "",
  observedSampleCount = 0,
  cacheHit = false,
  cachePath = "",
}) {
  const modeLabel = getModeLabel(moduleType)
  const familyLabel = plotFamily === "xai" ? "XAI" : "진단 그래프"
  const displaySupportLevel = effectiveSupportLevel || supportLevel
  const displayPolicyNote = effectivePolicyNote || policyNote

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 18,
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-panel)",
        padding: 16,
        minHeight: 420,
        display: "grid",
        gap: 14,
        alignContent: "start",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>{plotLabel || "분석 그래프"}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {modeLabel} / {familyLabel} / 선호 경로:{" "}
            {sourcePreference === "native" ? "native 우선" : sourcePreference === "fallback" ? "fallback 우선" : "정보 없음"} / 실제 경로:{" "}
            {nativeSource || "정보 없음"}
          </div>
          {(estimatorFamilyLabel || displaySupportLevel) ? (
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
              모델 계열: {estimatorFamilyLabel || "-"} / 정책 수준: {getSupportLevelLabel(displaySupportLevel)}
            </div>
          ) : null}
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            관찰 상태: {getObservationLabel(observedStatus)} / 관찰 샘플: {observedSampleCount}
          </div>
          {cacheHit ? <div style={{ color: "var(--text-muted)", fontSize: 12 }}>cache: snapshot 재사용{cachePath ? ` / ${cachePath}` : ""}</div> : null}
          {displayPolicyNote ? <div style={{ color: "var(--text-muted)", fontSize: 12 }}>policy: {displayPolicyNote}</div> : null}
          {observedNote ? <div style={{ color: "var(--text-muted)", fontSize: 12 }}>observed: {observedNote}</div> : null}
          {nativeReason ? <div style={{ color: "var(--text-muted)", fontSize: 12 }}>native: {nativeReason}</div> : null}
          {fallbackReason ? <div style={{ color: "var(--warning)", fontSize: 12 }}>fallback: {fallbackReason}</div> : null}
        </div>
        <SourceBadge fallbackUsed={Boolean(fallbackUsed)} />
      </div>

      {isLoading ? (
        <div style={{ color: "var(--text-secondary)", minHeight: 520, display: "grid", placeItems: "center" }}>
          그래프 생성 중입니다...
        </div>
      ) : renderMode === "plotly" && figureJson ? (
        <div style={{ width: "100%" }}>
          <PlotlyFigure figureJson={figureJson} />
        </div>
      ) : image ? (
        <img alt="analysis plot" src={`data:image/png;base64,${image}`} style={{ width: "100%", borderRadius: 10 }} />
      ) : (
        <div style={{ color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.7, minHeight: 520, display: "grid", placeItems: "center" }}>
          아직 생성된 그래프가 없습니다.
        </div>
      )}
    </div>
  )
}
