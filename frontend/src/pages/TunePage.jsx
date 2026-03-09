import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { trainAPI } from "../api"
import OptunaScatter from "../components/charts/OptunaScatter"
import HyperparamsDiff from "../components/tune/HyperparamsDiff"
import ModelSelectFromCompare from "../components/tune/ModelSelectFromCompare"
import TuneBeforeAfter from "../components/tune/TuneBeforeAfter"
import TuneOptionsPanel from "../components/tune/TuneOptionsPanel"
import { useSSETune } from "../hooks/useSSETune"
import useStore from "../store/useStore"

export default function TunePage() {
  const navigate = useNavigate()
  const { currentExperimentId, selectedModelsForTune, tuneTrials, tuneResult } = useStore()
  const [isRunning, setIsRunning] = useState(false)
  const [tuneOptions, setTuneOptions] = useState({
    optimize: "Accuracy",
    search_library: "optuna",
    n_iter: 20,
  })
  const { startTune } = useSSETune()

  const points = useMemo(
    () => tuneTrials.map((trial) => ({ x: trial.trial_number, y: trial.value })),
    [tuneTrials]
  )

  function updateOption(key, value) {
    setTuneOptions((prev) => ({ ...prev, [key]: value }))
  }

  async function handleStart() {
    if (!currentExperimentId || !selectedModelsForTune.length) {
      navigate("/compare")
      return
    }

    setIsRunning(true)
    const algorithm = selectedModelsForTune[0]
    const response = await trainAPI.startTune({
      experiment_id: currentExperimentId,
      algorithm,
      tune_options: tuneOptions,
    })
    startTune(
      response.job_id,
      () => setIsRunning(false),
      () => setIsRunning(false)
    )
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "260px 1fr 280px" }}>
      <TuneOptionsPanel
        options={tuneOptions}
        onChange={updateOption}
        onStart={handleStart}
        selectedCount={selectedModelsForTune.length}
        isRunning={isRunning}
      />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <ModelSelectFromCompare algorithms={selectedModelsForTune} />
        <OptunaScatter points={points} />
        <TuneBeforeAfter result={tuneResult} />
      </div>
      <div style={{ padding: 18 }}>
        <HyperparamsDiff result={tuneResult} />
      </div>
    </div>
  )
}
