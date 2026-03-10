import { useCallback } from "react"
import { useDropzone } from "react-dropzone"

export default function FileDropzone({ onFileSelect, loading }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles[0]) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxSize: 200 * 1024 * 1024,
  })

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? "var(--accent-blue)" : "var(--border-strong)"}`,
        borderRadius: 16,
        background: isDragActive ? "var(--accent-blue-soft)" : "var(--bg-surface)",
        boxShadow: "var(--shadow-panel)",
        padding: 28,
        cursor: "pointer",
      }}
    >
      <input {...getInputProps()} />
      <div style={{ fontSize: 36, marginBottom: 10, color: "var(--accent-blue)" }}>↑</div>
      <div style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800, marginBottom: 6 }}>CSV 또는 Excel 파일을 드래그하세요</div>
      <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>지원 형식: `.csv`, `.xlsx`, `.xls` / 최대 200MB</div>
      <div style={{ color: "var(--accent-blue)", fontSize: 12, fontWeight: 700 }}>{loading ? "업로드 중..." : "파일 선택 또는 드롭"}</div>
    </div>
  )
}
