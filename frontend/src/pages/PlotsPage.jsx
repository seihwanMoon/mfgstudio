import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { analyzeAPI, trainAPI } from "../api"
import PlotRenderArea from "../components/analyze/PlotRenderArea"
import PlotSelector from "../components/analyze/PlotSelector"
import TrainTestToggle from "../components/analyze/TrainTestToggle"
import useStore from "../store/useStore"

function getOptionKey(option) {
  return `${option.family}:${option.key}`
}

export default function PlotsPage() {
  const navigate = useNavigate()
  const { currentExperimentId, selectedModelsForTune, setupParams } = useStore()
  const moduleType = setupParams.module_type || "classification"

  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState(null)
  const [plotOptions, setPlotOptions] = useState([])
  const [selectedPlotKey, setSelectedPlotKey] = useState("")
  const [image, setImage] = useState("")
  const [plotlyFigureJson, setPlotlyFigureJson] = useState("")
  const [renderMode, setRenderMode] = useState("image")
  const [plotMeta, setPlotMeta] = useState({ nativeSource: "", fallbackUsed: false })
  const [useTrainData, setUseTrainData] = useState(false)
  const [isLoadingPlot, setIsLoadingPlot] = useState(false)
  const [plotError, setPlotError] = useState("")

  const selectedPlot = useMemo(
    () => plotOptions.find((option) => getOptionKey(option) === selectedPlotKey) || null,
    [plotOptions, selectedPlotKey]
  )

  useEffect(() => {
    if (!currentExperimentId) return

    trainAPI.getCompareResult(currentExperimentId).then((response) => {
      setModels(response)
      const selected = response.find((item) => item.algorithm === selectedModelsForTune[0]) || response[0]
      if (selected) setModelId(selected.id)
    })

    analyzeAPI.listPlots(moduleType).then((response) => {
      const nextOptions = response.plots || []
      setPlotOptions(nextOptions)
      setSelectedPlotKey((current) => {
        const hasCurrent = nextOptions.some((option) => getOptionKey(option) === current)
        return hasCurrent ? current : getOptionKey(nextOptions[0] || { family: "plot", key: "" })
      })
    })
  }, [currentExperimentId, moduleType, selectedModelsForTune])

  useEffect(() => {
    if (!modelId || !selectedPlot) return
    handlePlot()
  }, [modelId, selectedPlotKey, useTrainData])

  async function handlePlot() {
    if (!modelId || !selectedPlot) return

    setPlotError("")
    setIsLoadingPlot(true)
    try {
      const response = await analyzeAPI.plot({
        model_id: modelId,
        plot_type: selectedPlot.key,
        plot_family: selectedPlot.family,
        use_train_data: useTrainData,
      })
      setRenderMode(response.render_mode || "image")
      setImage(response.base64_image || "")
      setPlotlyFigureJson(response.plotly_figure_json || "")
      setPlotMeta({
        nativeSource: response.native_source || "",
        fallbackUsed: Boolean(response.fallback_used),
      })
    } catch (error) {
      setImage("")
      setPlotlyFigureJson("")
      setRenderMode("image")
      setPlotMeta({ nativeSource: "", fallbackUsed: false })
      setPlotError(error?.detail || "진단 그래프를 생성하지 못했습니다.")
    } finally {
      setIsLoadingPlot(false)
    }
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "280px 1fr" }}>
      <PlotSelector
        plots={plotOptions}
        value={selectedPlotKey}
        onChange={setSelectedPlotKey}
        onRefresh={handlePlot}
        title="그래프"
        description="튜닝 이후 확인하는 진단 그래프를 한 화면으로 모아, PyCaret 스타일의 plot_model 흐름과 가깝게 볼 수 있도록 구성했습니다."
        emptyMessage="이 모듈에서 사용할 수 있는 진단 그래프가 없습니다."
        buttonLabel="그래프 새로고침"
      />

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 18,
            background: "var(--bg-surface)",
            boxShadow: "var(--shadow-panel)",
            padding: 18,
            display: "grid",
            gap: 14,
          }}
        >
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>그래프 작업공간</div>
            <div style={{ color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6 }}>
              튜닝된 후보 모델을 선택하고 우선 PyCaret 기반 진단 그래프를 확인합니다. 대체 경로가 사용된 그래프는 그대로 표시되어 렌더링 출처를 바로 확인할 수 있습니다.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <select
              value={modelId || ""}
              onChange={(event) => setModelId(Number(event.target.value))}
              style={{
                minWidth: 280,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg-surface-soft)",
                color: "var(--text-primary)",
                padding: "12px 14px",
              }}
            >
              <option value="">모델 선택</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.algorithm}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <TrainTestToggle value={useTrainData} onChange={setUseTrainData} moduleType={moduleType} />
              <button
                onClick={() => navigate("/xai")}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: "var(--success)",
                  color: "white",
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                XAI 보기
              </button>
            </div>
          </div>
        </div>

        {plotError ? (
          <div
            style={{
              border: "1px solid rgba(210, 82, 82, 0.28)",
              borderLeft: "4px solid var(--danger)",
              borderRadius: 14,
              background: "rgba(210, 82, 82, 0.08)",
              padding: 14,
              color: "var(--text-primary)",
            }}
          >
            {plotError}
          </div>
        ) : null}

        <PlotRenderArea
          image={image}
          figureJson={plotlyFigureJson}
          renderMode={renderMode}
          isLoading={isLoadingPlot}
          plotLabel={selectedPlot?.label}
          plotFamily={selectedPlot?.family}
          moduleType={moduleType}
          nativeSource={plotMeta.nativeSource}
          fallbackUsed={plotMeta.fallbackUsed}
          sourcePreference={selectedPlot?.source_preference}
        />
      </div>
    </div>
  )
}
