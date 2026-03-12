import { create } from "zustand"

const getInitialTheme = () => {
  if (typeof window === "undefined") return "dark"
  return localStorage.getItem("mfgstudio-theme") || "dark"
}

export const COMPARE_SORT_OPTIONS = {
  classification: ["Accuracy", "AUC", "F1", "Recall", "Precision"],
  regression: ["R2", "RMSE", "MAE", "MSE", "MAPE"],
  clustering: ["Silhouette", "Calinski-Harabasz", "Davies-Bouldin"],
  anomaly: ["AUC", "Recall", "Precision"],
  timeseries: ["MAE", "RMSE", "MAPE", "SMAPE"],
}

export function getDefaultCompareSort(moduleType) {
  return COMPARE_SORT_OPTIONS[moduleType]?.[0] || "Accuracy"
}

const useStore = create((set) => ({
  theme: getInitialTheme(),
  currentDatasetId: null,
  currentExperimentId: null,
  currentModelId: null,
  currentStep: "home",
  uploadedDataset: null,
  columnOverrides: {},
  compareResults: [],
  tuneTrials: [],
  tuneResult: null,
  selectedModelsForTune: [],
  productionModels: [],
  setupParams: {
    module_type: "classification",
    target_col: "",
    experiment_name: "",
    train_size: 0.8,
    fold: 10,
    session_id: 42,
    normalize: false,
    normalize_method: "zscore",
    fix_imbalance: false,
    remove_outliers: false,
    imputation_type: "simple",
    log_experiment: true,
    log_plots: true,
  },
  compareOptions: {
    sort: getDefaultCompareSort("classification"),
    n_select: 3,
    budget_time: null,
    catalog_scope: "all",
    family: "all",
    exclude: [],
  },
  setCurrentStep: (currentStep) => set({ currentStep }),
  setDatasetId: (currentDatasetId) => set({ currentDatasetId }),
  setExperimentId: (currentExperimentId) => set({ currentExperimentId }),
  setModelId: (currentModelId) => set({ currentModelId }),
  setUploadedDataset: (uploadedDataset) => set({ uploadedDataset }),
  setColumnOverride: (column, value) =>
    set((state) => ({
      columnOverrides: {
        ...state.columnOverrides,
        [column]: value,
      },
    })),
  setSetupParam: (key, value) =>
    set((state) => ({
      setupParams: {
        ...state.setupParams,
        [key]: value,
      },
    })),
  setCompareOption: (key, value) =>
    set((state) => ({
      compareOptions: {
        ...state.compareOptions,
        [key]: value,
      },
    })),
  resetCompareOptions: (moduleType) =>
    set((state) => ({
      compareOptions: {
        ...state.compareOptions,
        sort: getDefaultCompareSort(moduleType),
      },
    })),
  addCompareResult: (row) =>
    set((state) => ({
      compareResults: [...state.compareResults, row],
    })),
  clearCompareResults: () => set({ compareResults: [] }),
  setCompareResults: (compareResults) => set({ compareResults }),
  addTuneTrial: (trial) =>
    set((state) => ({
      tuneTrials: [...state.tuneTrials, trial],
    })),
  clearTuneTrials: () => set({ tuneTrials: [] }),
  setTuneResult: (tuneResult) => set({ tuneResult }),
  setSelectedModelsForTune: (selectedModelsForTune) => set({ selectedModelsForTune: selectedModelsForTune.slice(0, 3) }),
  clearSelectedModelsForTune: () => set({ selectedModelsForTune: [] }),
  toggleSelectModel: (algorithm) =>
    set((state) => ({
      selectedModelsForTune: state.selectedModelsForTune.includes(algorithm)
        ? state.selectedModelsForTune.filter((item) => item !== algorithm)
        : [...state.selectedModelsForTune, algorithm].slice(0, 3),
    })),
  setProductionModels: (productionModels) => set({ productionModels }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "dark" ? "light" : "dark",
    })),
}))

export default useStore
