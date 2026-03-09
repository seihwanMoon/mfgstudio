import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { dataAPI } from "../api"
import FileDropzone from "../components/upload/FileDropzone"
import DataQualitySummary from "../components/upload/DataQualitySummary"
import ColumnTypeTable from "../components/upload/ColumnTypeTable"
import DataPreviewTable from "../components/upload/DataPreviewTable"
import Button from "../components/ui/Button"
import useStore from "../store/useStore"

export default function UploadPage() {
  const navigate = useNavigate()
  const { columnOverrides, setColumnOverride, setDatasetId, setUploadedDataset } = useStore()
  const [uploadInfo, setUploadInfo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [quality, setQuality] = useState(null)
  const [loading, setLoading] = useState(false)

  const columns = useMemo(() => uploadInfo?.columns || [], [uploadInfo])

  async function handleFileSelect(file) {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const upload = await dataAPI.upload(formData)
      const [previewRes, qualityRes] = await Promise.all([
        dataAPI.getPreview(upload.dataset_id),
        dataAPI.getQuality(upload.dataset_id),
      ])
      setUploadInfo(upload)
      setPreview(previewRes)
      setQuality(qualityRes)
      setDatasetId(upload.dataset_id)
      setUploadedDataset({
        id: upload.dataset_id,
        filename: upload.filename,
        columns: upload.columns,
        preview: previewRes,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleColumnChange(name, value) {
    if (!uploadInfo?.dataset_id) return
    setColumnOverride(name, value)
    await dataAPI.updateColumns(uploadInfo.dataset_id, { ...columnOverrides, [name]: value })
  }

  return (
    <div style={{ height: "100%", padding: 24, display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
        <FileDropzone onFileSelect={handleFileSelect} loading={loading} />
        <DataQualitySummary quality={quality} />
        <ColumnTypeTable columns={columns} overrides={columnOverrides} onChange={handleColumnChange} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => navigate("/setup")} disabled={!uploadInfo}>
            다음: 실험 설정 →
          </Button>
        </div>
      </div>

      <div style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ color: "#E2EEFF", fontSize: 18, fontWeight: 800 }}>미리보기</div>
        <DataPreviewTable preview={preview} />
      </div>
    </div>
  )
}
