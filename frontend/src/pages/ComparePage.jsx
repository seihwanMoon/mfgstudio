import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { trainAPI } from "../api"
import RadarCompare from "../components/charts/RadarCompare"
import CompareOptionsPanel from "../components/compare/CompareOptionsPanel"
import LeaderboardTable from "../components/compare/LeaderboardTable"
import MLflowRunLinks from "../components/compare/MLflowRunLinks"
import { useSSECompare } from "../hooks/useSSECompare"
import useStore, { COMPARE_SORT_OPTIONS, getDefaultCompareSort } from "../store/useStore"

function filterCatalog(catalog, options) {
  return catalog.filter((item) => {
    const scope = options.catalog_scope || "all"
    const family = options.family || "all"

    if (scope === "turbo" && !item.turbo) return false
    if (scope === "full" && item.turbo) return false
    if (family !== "all" && item.family !== family) return false

    return true
  })
}

export default function ComparePage() {
  const navigate = useNavigate()
  const {
    currentExperimentId,
    compareOptions,
    compareResults,
    setCompareOption,
    setupParams,
    selectedModelsForTune,
  } = useStore()
  const [isRunning, setIsRunning] = useState(false)
  const [modelCatalog, setModelCatalog] = useState([])
  const [familyOptions, setFamilyOptions] = useState([])
  const [error, setError] = useState("")
  const { startCompare } = useSSECompare()
  const moduleType = setupParams.module_type || "classification"
  const metricOptions = COMPARE_SORT_OPTIONS[moduleType] || COMPARE_SORT_OPTIONS.classification
  const bestModel = compareResults[0] || null
  const selectedResults =
    selectedModelsForTune.length > 0
      ? compareResults.filter((row) => selectedModelsForTune.includes(row.algorithm)).slice(0, 3)
      : compareResults.slice(0, 3)

  const filteredCatalog = useMemo(() => filterCatalog(modelCatalog, compareOptions), [modelCatalog, compareOptions])

  useEffect(() => {
    trainAPI
      .getModels(moduleType)
      .then((response) => {
        setModelCatalog(response.catalog || [])
        setFamilyOptions(response.families || [])
      })
      .catch(() => {
        setModelCatalog([])
        setFamilyOptions([])
      })
  }, [moduleType])

  useEffect(() => {
    if (!metricOptions.includes(compareOptions.sort)) {
      setCompareOption("sort", getDefaultCompareSort(moduleType))
    }
  }, [compareOptions.sort, metricOptions, moduleType, setCompareOption])

  useEffect(() => {
    const currentFamily = compareOptions.family || "all"
    if (currentFamily !== "all" && !familyOptions.includes(currentFamily)) {
      setCompareOption("family", "all")
    }
  }, [compareOptions.family, familyOptions, setCompareOption])

  async function handleStart() {
    if (!currentExperimentId) {
      navigate("/setup")
      return
    }

    const sanitizedSort = metricOptions.includes(compareOptions.sort) ? compareOptions.sort : getDefaultCompareSort(moduleType)
    if (sanitizedSort !== compareOptions.sort) {
      setCompareOption("sort", sanitizedSort)
    }

    const include = filteredCatalog.map((item) => item.name)
    if (!include.length) {
      setError("현재 필터에 맞는 비교 대상 모델이 없습니다.")
      return
    }

    setError("")
    setIsRunning(true)
    try {
      await trainAPI.startCompare({
        experiment_id: currentExperimentId,
        options: {
          ...compareOptions,
          sort: sanitizedSort,
          include: include.length === modelCatalog.length ? undefined : include,
        },
      })

      startCompare(
        currentExperimentId,
        () => setIsRunning(false),
        async () => {
          setIsRunning(false)
          try {
            await trainAPI.getCompareResult(currentExperimentId)
          } catch (streamError) {
            setError(streamError?.detail || "모델 비교 결과를 불러오는 중 오류가 발생했습니다.")
          }
        }
      )
    } catch (compareError) {
      setIsRunning(false)
      setError(compareError?.detail || "모델 비교를 시작하지 못했습니다.")
    }
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "260px 1fr 280px" }}>
      <CompareOptionsPanel
        options={compareOptions}
        onChange={setCompareOption}
        onStart={handleStart}
        isRunning={isRunning}
        metricOptions={metricOptions}
        familyOptions={familyOptions}
        totalModelCount={modelCatalog.length}
        filteredModelCount={filteredCatalog.length}
      />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        {bestModel ? (
          <div style={{ border: "1px solid rgba(217, 154, 17, 0.3)", borderLeft: "4px solid var(--warning)", borderRadius: 12, background: "rgba(217, 154, 17, 0.08)", padding: 14 }}>
            <div style={{ color: "var(--warning)", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>최고 추천 모델</div>
            <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>{bestModel.algorithm}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>
              기준 {compareOptions.sort}: {bestModel.metrics?.[compareOptions.sort] ?? "-"}
            </div>
          </div>
        ) : null}
        {error ? (
          <div style={{ border: "1px solid rgba(210, 82, 82, 0.35)", borderLeft: "4px solid var(--danger)", borderRadius: 12, background: "rgba(210, 82, 82, 0.08)", padding: 14, color: "var(--text-primary)", fontSize: 13 }}>
            {error}
          </div>
        ) : null}
        <LeaderboardTable results={compareResults} />
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <RadarCompare models={selectedResults} />
        <MLflowRunLinks results={compareResults} />
      </div>
    </div>
  )
}
