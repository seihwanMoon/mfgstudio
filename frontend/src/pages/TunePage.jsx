import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { trainAPI } from "../api"
import OptunaScatter from "../components/charts/OptunaScatter"
import HyperparamsDiff from "../components/tune/HyperparamsDiff"
import ModelSelectFromCompare from "../components/tune/ModelSelectFromCompare"
import TuneBeforeAfter from "../components/tune/TuneBeforeAfter"
import TuneOptionsPanel from "../components/tune/TuneOptionsPanel"
import { useSSETune } from "../hooks/useSSETune"
import useStore, { COMPARE_SORT_OPTIONS, getDefaultCompareSort } from "../store/useStore"

export default function TunePage() {
  const navigate = useNavigate()
  const { currentExperimentId, selectedModelsForTune, tuneTrials, tuneResult, setupParams } = useStore()
  const moduleType = setupParams.module_type || "classification"
  const metricOptions = COMPARE_SORT_OPTIONS[moduleType] || COMPARE_SORT_OPTIONS.classification
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState("")
  const [activeAlgorithm, setActiveAlgorithm] = useState(selectedModelsForTune[0] || "")
  const [tuneOptions, setTuneOptions] = useState({
    optimize: getDefaultCompareSort(moduleType),
    search_library: "scikit-learn",
    n_iter: 20,
  })
  const { startTune } = useSSETune()

  const points = useMemo(() => tuneTrials.map((trial) => ({ x: trial.trial_number, y: trial.value })), [tuneTrials])

  useEffect(() => {
    setActiveAlgorithm((prev) => (selectedModelsForTune.includes(prev) ? prev : selectedModelsForTune[0] || ""))
  }, [selectedModelsForTune])

  useEffect(() => {
    setTuneOptions((prev) => ({
      ...prev,
      optimize: metricOptions.includes(prev.optimize) ? prev.optimize : getDefaultCompareSort(moduleType),
      search_library: "scikit-learn",
    }))
  }, [metricOptions, moduleType])

  function updateOption(key, value) {
    setTuneOptions((prev) => ({ ...prev, [key]: value }))
  }

  async function handleStart() {
    if (!currentExperimentId || !selectedModelsForTune.length || !activeAlgorithm) {
      navigate("/compare")
      return
    }

    setError("")
    setIsRunning(true)
    try {
      const response = await trainAPI.startTune({
        experiment_id: currentExperimentId,
        algorithm: activeAlgorithm,
        tune_options: tuneOptions,
      })
      startTune(
        response.job_id,
        () => setIsRunning(false),
        () => {
          setIsRunning(false)
          setError("튜닝 스트림 처리 중 오류가 발생했습니다.")
        }
      )
    } catch (tuneError) {
      setIsRunning(false)
      setError(tuneError?.detail || "튜닝을 시작하지 못했습니다.")
    }
  }

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "260px 1fr 280px" }}>
      <TuneOptionsPanel
        options={tuneOptions}
        onChange={updateOption}
        onStart={handleStart}
        selectedCount={selectedModelsForTune.length}
        isRunning={isRunning}
        metricOptions={metricOptions}
        selectedAlgorithms={selectedModelsForTune}
        activeAlgorithm={activeAlgorithm}
        onSelectAlgorithm={setActiveAlgorithm}
      />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {error ? (
          <div style={{ border: "1px solid rgba(210, 82, 82, 0.35)", borderLeft: "4px solid var(--danger)", borderRadius: 12, background: "rgba(210, 82, 82, 0.08)", padding: 14, color: "var(--text-primary)", fontSize: 13 }}>
            {error}
          </div>
        ) : null}
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
