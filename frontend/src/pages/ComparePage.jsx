import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { trainAPI } from "../api"
import RadarCompare from "../components/charts/RadarCompare"
import CompareOptionsPanel from "../components/compare/CompareOptionsPanel"
import LeaderboardTable from "../components/compare/LeaderboardTable"
import MLflowRunLinks from "../components/compare/MLflowRunLinks"
import { useSSECompare } from "../hooks/useSSECompare"
import useStore from "../store/useStore"

export default function ComparePage() {
  const navigate = useNavigate()
  const { currentExperimentId, compareOptions, compareResults, setCompareOption } = useStore()
  const [isRunning, setIsRunning] = useState(false)
  const [availableModels, setAvailableModels] = useState([])
  const { startCompare } = useSSECompare()

  useEffect(() => {
    trainAPI
      .getModels("classification")
      .then((response) => setAvailableModels(response.models || []))
      .catch(() => setAvailableModels([]))
  }, [])

  async function handleStart() {
    if (!currentExperimentId) {
      navigate("/setup")
      return
    }

    setIsRunning(true)
    await trainAPI.startCompare({
      experiment_id: currentExperimentId,
      options: compareOptions,
    })

    startCompare(
      currentExperimentId,
      () => setIsRunning(false),
      () => setIsRunning(false)
    )
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "260px 1fr 280px" }}>
      <CompareOptionsPanel
        options={compareOptions}
        onChange={setCompareOption}
        onStart={handleStart}
        isRunning={isRunning}
        modelOptions={availableModels}
      />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <LeaderboardTable results={compareResults} />
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <RadarCompare models={compareResults.slice(0, 3)} />
        <MLflowRunLinks results={compareResults} />
      </div>
    </div>
  )
}
