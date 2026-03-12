import { useEffect, useMemo, useState } from "react"
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
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const targetMeta = useMemo(
    () => (uploadedDataset?.columns || []).find((column) => (column.name ?? column) === setupParams.target_col),
    [setupParams.target_col, uploadedDataset]
  )

  const code = useMemo(() => {
    if (apiCode) return apiCode
    const lines = [IMPORT_MAP[setupParams.module_type] || IMPORT_MAP.classification, "", "s = setup(", "    data=df,"]
    if (setupParams.target_col) lines.push(`    target='${setupParams.target_col}',`)
    if (setupParams.module_type === "timeseries") {
      lines.push(`    fold=${setupParams.fold || 3},`)
      lines.push("    fh=1,")
    } else {
      lines.push(`    train_size=${setupParams.train_size},`)
      lines.push(`    fold=${setupParams.fold},`)
      if (setupParams.normalize) lines.push("    normalize=True,")
      if (setupParams.normalize_method) lines.push(`    normalize_method='${setupParams.normalize_method}',`)
      if (setupParams.fix_imbalance) lines.push("    fix_imbalance=True,")
      if (setupParams.remove_outliers) lines.push("    remove_outliers=True,")
      lines.push(`    imputation_type='${setupParams.imputation_type}',`)
    }
    lines.push(")")
    return lines.join("\n")
  }, [apiCode, setupParams])

  useEffect(() => {
    if (!targetMeta) return
    const isContinuousNumeric = targetMeta.type === "numeric" && Number(targetMeta.unique_count || 0) > 10
    if (isContinuousNumeric && setupParams.module_type === "classification") {
      setSetupParam("module_type", "regression")
      setNotice("연속형 수치 타깃으로 보여 회귀 모듈로 자동 전환했습니다.")
    }
  }, [setupParams.module_type, setSetupParam, targetMeta])

  async function handleSetup() {
    if (!currentDatasetId) {
      navigate("/upload")
      return
    }

    setLoading(true)
    setError("")
    setNotice("")
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
    } catch (setupError) {
      setResult(null)
      setError(formatSetupError(setupError?.detail || String(setupError)))
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
        {notice ? (
          <div
            style={{
              border: "1px solid rgba(22, 119, 255, 0.28)",
              borderLeft: "4px solid var(--accent-blue)",
              borderRadius: 12,
              background: "var(--accent-blue-soft)",
              padding: 14,
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          >
            {notice}
          </div>
        ) : null}
        <SetupResultToast result={result} error={error} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button variant="outline" onClick={() => navigate("/upload")}>
            업로드로 이동
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            {result ? (
              <Button variant="outline" onClick={() => navigate("/compare")}>
                다음: 모델 비교
              </Button>
            ) : null}
            <Button onClick={handleSetup} disabled={loading}>
              {loading ? "setup() 실행 중..." : "setup() 실행"}
            </Button>
          </div>
        </div>
      </div>

      <div style={{ minHeight: 0 }}>
        <CodePreviewPanel code={code} />
      </div>
    </div>
  )
}

function formatSetupError(message) {
  if (!message) return "setup() 실행 중 알 수 없는 오류가 발생했습니다."
  if (message.includes("least populated class")) {
    return "현재 타깃은 분류보다 회귀에 가까운 연속형 수치입니다. 모듈을 '회귀'로 바꿔 다시 실행해보세요."
  }
  if (message.includes("Column ?? not found")) {
    return "한글 컬럼명을 포함한 타깃 컬럼 처리 중 오류가 발생했습니다. 화면을 새로고침한 뒤 다시 시도해보세요."
  }
  return message
}
