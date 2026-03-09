import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { trainAPI } from "../api"
import ModuleSelector from "../components/setup/ModuleSelector"
import BasicSettingsForm from "../components/setup/BasicSettingsForm"
import PreprocessingForm from "../components/setup/PreprocessingForm"
import CodePreviewPanel from "../components/setup/CodePreviewPanel"
import SetupResultToast from "../components/setup/SetupResultToast"
import Button from "../components/ui/Button"
import useStore from "../store/useStore"

const IMPORT_MAP = {
  classification: "from pycaret.classification import *",
  regression: "from pycaret.regression import *",
  clustering: "from pycaret.clustering import *",
  anomaly: "from pycaret.anomaly import *",
  timeseries: "from pycaret.time_series import *",
}

export default function SetupPage() {
  const navigate = useNavigate()
  const { currentDatasetId, setupParams, setExperimentId, setSetupParam, uploadedDataset } = useStore()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [apiCode, setApiCode] = useState("")

  const code = useMemo(() => {
    if (apiCode) return apiCode
    const lines = [IMPORT_MAP[setupParams.module_type] || IMPORT_MAP.classification, "", "s = setup(", "    data=df,"]
    if (setupParams.target_col) lines.push(`    target='${setupParams.target_col}',`)
    lines.push(`    train_size=${setupParams.train_size},`)
    lines.push(`    fold=${setupParams.fold},`)
    if (setupParams.normalize) lines.push("    normalize=True,")
    if (setupParams.normalize_method) lines.push(`    normalize_method='${setupParams.normalize_method}',`)
    if (setupParams.fix_imbalance) lines.push("    fix_imbalance=True,")
    if (setupParams.remove_outliers) lines.push("    remove_outliers=True,")
    lines.push(`    imputation_type='${setupParams.imputation_type}',`)
    lines.push(")")
    return lines.join("\n")
  }, [apiCode, setupParams])

  async function handleSetup() {
    if (!currentDatasetId) {
      navigate("/upload")
      return
    }

    setLoading(true)
    try {
      const response = await trainAPI.setup({
        dataset_id: currentDatasetId,
        module_type: setupParams.module_type,
        params: setupParams,
        experiment_name: setupParams.experiment_name || `experiment_${Date.now()}`,
      })
      setExperimentId(response.experiment_id)
      setResult(response)
      const codeResponse = await trainAPI.getCode(response.experiment_id)
      setApiCode(codeResponse.code)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: "100%", padding: 24, display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ModuleSelector value={setupParams.module_type} onChange={(value) => setSetupParam("module_type", value)} />
        <BasicSettingsForm params={setupParams} columns={uploadedDataset?.columns || []} onChange={setSetupParam} />
        <PreprocessingForm params={setupParams} onChange={setSetupParam} />
        <SetupResultToast result={result} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button variant="outline" onClick={() => navigate("/upload")}>
            ← 업로드
          </Button>
          <Button onClick={handleSetup} disabled={loading}>
            {loading ? "setup() 실행 중..." : "setup() 실행"}
          </Button>
        </div>
      </div>

      <div style={{ minHeight: 0 }}>
        <CodePreviewPanel code={code} />
      </div>
    </div>
  )
}
