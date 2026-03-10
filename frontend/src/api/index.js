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
  finalize: (modelId) => api.post(`/api/train/finalize/${modelId}`),
}

export const mlflowAPI = {
  status: () => api.get("/api/mlflow/status"),
  experiments: () => api.get("/api/mlflow/experiments"),
  runs: (experimentId, limit = 20) => api.get(`/api/mlflow/experiments/${experimentId}/runs?limit=${limit}`),
}

export const dashboardAPI = {
  getModels: () => api.get("/api/dashboard/models"),
  getStats: () => api.get("/api/dashboard/stats"),
}

export const analyzeAPI = {
  plot: (payload) => api.post("/api/analyze/plot", payload),
  interpret: (payload) => api.post("/api/analyze/interpret", payload),
  listPlots: (moduleType) => api.get(`/api/analyze/plots/list?module_type=${moduleType}`),
}

export const registryAPI = {
  listModels: () => api.get("/api/registry/models"),
  register: (payload) => api.post("/api/registry/register", payload),
  listVersions: (name) => api.get(`/api/registry/${name}/versions`),
  changeStage: (name, payload) => api.put(`/api/registry/${name}/stage`, payload),
  rollback: (name, payload) => api.post(`/api/registry/${name}/rollback`, payload),
}

export const predictAPI = {
  models: () => api.get("/api/predict/models"),
  modelSchema: (modelName) => api.get(`/api/predict/models/${modelName}/schema`),
  single: (modelName, payload) => api.post(`/api/predict/${modelName}`, payload),
  batch: (modelName, formData, threshold = 0.5) =>
    api.post(`/api/predict/${modelName}/batch?threshold=${threshold}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  history: (limit = 100) => api.get(`/api/predict/history?limit=${limit}`),
  historyByModel: (modelName, limit = 100) => api.get(`/api/predict/history/${modelName}?limit=${limit}`),
}

export const driftAPI = {
  check: (modelName) => api.post(`/api/drift/check/${modelName}`),
}

export const scheduleAPI = {
  jobs: () => api.get("/api/schedule/jobs"),
  pause: (jobId) => api.put(`/api/schedule/jobs/${jobId}/pause`),
  resume: (jobId) => api.put(`/api/schedule/jobs/${jobId}/resume`),
  runNow: (jobId) => api.post(`/api/schedule/jobs/${jobId}/run`),
}
