import { api } from "./client"

export const dataAPI = {
  upload: (formData) =>
    api.post("/api/data/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getPreview: (id) => api.get(`/api/data/${id}/preview`),
  getQuality: (id) => api.get(`/api/data/${id}/quality`),
  updateColumns: (id, overrides) => api.patch(`/api/data/${id}/columns`, { overrides }),
}

export const trainAPI = {
  setup: (payload) => api.post("/api/train/setup", payload),
  getCode: (id) => api.get(`/api/train/setup/${id}/code`),
  startCompare: (payload) => api.post("/api/train/compare", payload),
  getCompareResult: (id) => api.get(`/api/train/compare/${id}/result`),
  getModels: (moduleType) => api.get(`/api/train/models?module_type=${moduleType}`),
  startTune: (payload) => api.post("/api/train/tune", payload),
}

export const mlflowAPI = {
  status: () => api.get("/api/mlflow/status"),
}

export const dashboardAPI = {
  getModels: () => api.get("/api/dashboard/models"),
  getStats: () => api.get("/api/dashboard/stats"),
}
