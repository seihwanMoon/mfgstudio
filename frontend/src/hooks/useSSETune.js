import { useMemo } from "react"

import useStore from "../store/useStore"

export function useSSETune() {
  const { addTuneTrial, clearTuneTrials, setTuneResult } = useStore()

  return useMemo(
    () => ({
      startTune(jobId, onDone, onError) {
        clearTuneTrials()
        const source = new EventSource(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/train/tune/${jobId}/stream`
        )

        source.addEventListener("trial", (event) => {
          addTuneTrial(JSON.parse(event.data))
        })
        source.addEventListener("done", (event) => {
          const payload = JSON.parse(event.data)
          setTuneResult(payload)
          onDone?.(payload)
          source.close()
        })
        source.onerror = (error) => {
          onError?.(error)
          source.close()
        }

        return () => source.close()
      },
    }),
    [addTuneTrial, clearTuneTrials, setTuneResult]
  )
}
