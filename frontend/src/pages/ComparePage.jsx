import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { trainAPI } from "../api"
import RadarCompare from "../components/charts/RadarCompare"
import CompareOptionsPanel from "../components/compare/CompareOptionsPanel"
import LeaderboardTable from "../components/compare/LeaderboardTable"
import MLflowRunLinks from "../components/compare/MLflowRunLinks"
import { useSSECompare } from "../hooks/useSSECompare"
import useStore, { COMPARE_SORT_OPTIONS, getDefaultCompareSort } from "../store/useStore"

export default function ComparePage() {
  const navigate = useNavigate()
  const { currentExperimentId, compareOptions, compareResults, setCompareOption, setupParams } = useStore()
  const [isRunning, setIsRunning] = useState(false)
  const [availableModels, setAvailableModels] = useState([])
  const [error, setError] = useState("")
  const { startCompare } = useSSECompare()
  const moduleType = setupParams.module_type || "classification"
  const metricOptions = COMPARE_SORT_OPTIONS[moduleType] || COMPARE_SORT_OPTIONS.classification

  useEffect(() => {
    trainAPI
      .getModels(moduleType)
      .then((response) => setAvailableModels(response.models || []))
      .catch(() => setAvailableModels([]))
  }, [moduleType])

  useEffect(() => {
    if (!metricOptions.includes(compareOptions.sort)) {
      setCompareOption("sort", getDefaultCompareSort(moduleType))
    }
  }, [compareOptions.sort, metricOptions, moduleType, setCompareOption])

  async function handleStart() {
    if (!currentExperimentId) {
      navigate("/setup")
      return
    }

    const sanitizedSort = metricOptions.includes(compareOptions.sort) ? compareOptions.sort : getDefaultCompareSort(moduleType)
    if (sanitizedSort !== compareOptions.sort) {
      setCompareOption("sort", sanitizedSort)
    }

    setError("")
    setIsRunning(true)
    try {
      await trainAPI.startCompare({
        experiment_id: currentExperimentId,
        options: {
          ...compareOptions,
          sort: sanitizedSort,
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
            setError(streamError?.detail || "모델 비교 중 오류가 발생했습니다.")
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
        modelOptions={availableModels}
        metricOptions={metricOptions}
      />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        {error ? (
          <div style={{ border: "1px solid rgba(210, 82, 82, 0.35)", borderLeft: "4px solid var(--danger)", borderRadius: 12, background: "rgba(210, 82, 82, 0.08)", padding: 14, color: "var(--text-primary)", fontSize: 13 }}>
            {error}
          </div>
        ) : null}
        <LeaderboardTable results={compareResults} />
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <RadarCompare models={compareResults.slice(0, 3)} />
        <MLflowRunLinks results={compareResults} />
      </div>
    </div>
  )
}
