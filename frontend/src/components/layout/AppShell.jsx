import { useLocation } from "react-router-dom"

import Header from "./Header"
import Sidebar from "./Sidebar"

const SCREEN_META = {
  "/home": { label: "홈 대시보드", icon: "H", color: "#38BDF8", phase: "HOME", desc: "전체 모델 운영 현황" },
  "/upload": { label: "데이터 업로드", icon: "U", color: "#38BDF8", phase: "DATA", desc: "CSV/Excel 업로드와 품질 분석" },
  "/setup": { label: "실험 설정", icon: "S", color: "#38BDF8", phase: "SETUP", desc: "setup() 파라미터 구성" },
  "/compare": { label: "모델 비교", icon: "C", color: "#FBBF24", phase: "TRAIN", desc: "compare_models() 리더보드" },
  "/tune": { label: "학습·튜닝", icon: "T", color: "#FBBF24", phase: "TRAIN", desc: "tune_model() 기반 최적화" },
  "/analyze": { label: "XAI 분석", icon: "X", color: "#A78BFA", phase: "XAI", desc: "plot_model() + SHAP 설명" },
  "/finalize": { label: "모델 확정", icon: "F", color: "#34D399", phase: "DEPLOY", desc: "finalize + Registry 등록" },
  "/predict": { label: "예측 실행", icon: "P", color: "#34D399", phase: "SERVE", desc: "단건/배치/이력 예측" },
  "/mlflow": { label: "MLflow 관리", icon: "M", color: "#8BA8C8", phase: "OPS", desc: "실험 로그와 운영 관리" },
}

const ORDER = Object.keys(SCREEN_META)

export default function AppShell({ children }) {
  const { pathname } = useLocation()
  const meta = SCREEN_META[pathname] || SCREEN_META["/home"]
  const index = ORDER.indexOf(pathname)

  return (
    <div style={{ display: "flex", minHeight: "100vh", color: "var(--text-primary)" }}>
      <Sidebar activePath={pathname} screenMeta={SCREEN_META} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header
          meta={meta}
          prev={index > 0 ? ORDER[index - 1] : null}
          next={index < ORDER.length - 1 ? ORDER[index + 1] : null}
          screens={SCREEN_META}
          order={ORDER}
        />
        <main style={{ flex: 1, minHeight: 0 }}>{children}</main>
      </div>
    </div>
  )
}
