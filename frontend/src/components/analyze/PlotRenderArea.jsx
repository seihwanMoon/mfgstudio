import { useEffect, useMemo, useRef } from "react"

function getModeLabel(moduleType) {
  if (moduleType === "regression") return "회귀"
  if (moduleType === "classification") return "분류"
  if (moduleType === "clustering") return "클러스터링"
  if (moduleType === "anomaly") return "이상탐지"
  if (moduleType === "timeseries") return "시계열"
  return moduleType
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

export default function PlotRenderArea({
  image,
  figureJson,
  renderMode,
  isLoading,
  plotLabel,
  plotFamily,
  moduleType,
}) {
  const modeLabel = getModeLabel(moduleType)
  const familyLabel = plotFamily === "xai" ? "XAI" : "모델 진단"

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
        placeItems: "center",
      }}
    >
      {isLoading ? (
        <div style={{ color: "var(--text-secondary)" }}>플롯을 생성하는 중입니다...</div>
      ) : renderMode === "plotly" && figureJson ? (
        <div style={{ width: "100%" }}>
          <PlotlyFigure figureJson={figureJson} />
        </div>
      ) : image ? (
        <img alt="analysis plot" src={`data:image/png;base64,${image}`} style={{ width: "100%", borderRadius: 10 }} />
      ) : (
        <div style={{ color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.7 }}>
          아직 생성된 플롯이 없습니다.
          <br />
          현재 실험 유형은 {modeLabel}이고, 선택한 항목은 {plotLabel || "없음"} ({familyLabel}) 입니다.
        </div>
      )}
    </div>
  )
}
