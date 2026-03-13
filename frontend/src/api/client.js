import axios from "axios"

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error.response?.data || error.message)
)

export function createSSEStream(path, onMessage, onDone, onError) {
  const source = new EventSource(`${BASE_URL}${path}`)

  source.onmessage = (event) => {
    onMessage?.(JSON.parse(event.data))
  }

  source.addEventListener("done", (event) => {
    onDone?.(JSON.parse(event.data))
    source.close()
  })

  source.onerror = (error) => {
    onError?.(error)
    source.close()
  }

  return () => source.close()
}
