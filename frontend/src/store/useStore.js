import { create } from "zustand"

const useStore = create((set) => ({
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
    sort: "Accuracy",
    n_select: 3,
    budget_time: null,
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
  addCompareResult: (row) =>
    set((state) => ({
      compareResults: [...state.compareResults, row],
    })),
  clearCompareResults: () => set({ compareResults: [] }),
  addTuneTrial: (trial) =>
    set((state) => ({
      tuneTrials: [...state.tuneTrials, trial],
    })),
  clearTuneTrials: () => set({ tuneTrials: [] }),
  setTuneResult: (tuneResult) => set({ tuneResult }),
  toggleSelectModel: (algorithm) =>
    set((state) => ({
      selectedModelsForTune: state.selectedModelsForTune.includes(algorithm)
        ? state.selectedModelsForTune.filter((item) => item !== algorithm)
        : [...state.selectedModelsForTune, algorithm].slice(0, 3),
    })),
  setProductionModels: (productionModels) => set({ productionModels }),
}))

export default useStore
