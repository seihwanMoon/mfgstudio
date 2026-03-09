import { useMemo } from "react"

import useStore from "../store/useStore"

export function useSSECompare() {
  const { addCompareResult, clearCompareResults } = useStore()

  return useMemo(
    () => ({
      startCompare(experimentId, onDone, onError) {
        clearCompareResults()
        const source = new EventSource(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/train/compare/${experimentId}/stream`
        )

        source.addEventListener("model_result", (event) => {
          addCompareResult(JSON.parse(event.data))
        })
        source.addEventListener("done", (event) => {
          onDone?.(JSON.parse(event.data))
          source.close()
        })
        source.onerror = (error) => {
          onError?.(error)
          source.close()
        }

        return () => source.close()
      },
    }),
    [addCompareResult, clearCompareResults]
  )
}
