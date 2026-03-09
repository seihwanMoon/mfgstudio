import { useLocation } from "react-router-dom"

import Header from "./Header"
import Sidebar from "./Sidebar"

const SCREEN_META = {
  "/home": { label: "홈 대시보드", icon: "⬡", color: "#38BDF8", phase: "운영", desc: "다중 운영 모델 모니터링" },
  "/upload": { label: "데이터 업로드", icon: "↑", color: "#38BDF8", phase: "DATA", desc: "CSV/Excel 업로드와 품질 분석" },
  "/setup": { label: "실험 설정", icon: "⚙", color: "#38BDF8", phase: "SETUP", desc: "setup() 파라미터 구성" },
  "/compare": { label: "모델 비교", icon: "⇄", color: "#FBBF24", phase: "TRAIN", desc: "compare_models() 리더보드" },
  "/tune": { label: "학습·튜닝", icon: "◎", color: "#FBBF24", phase: "TRAIN", desc: "tune_model() + Optuna" },
  "/analyze": { label: "모델 분석", icon: "◈", color: "#A78BFA", phase: "EVAL", desc: "plot_model() + SHAP" },
  "/finalize": { label: "모델 확정", icon: "✓", color: "#34D399", phase: "DEPLOY", desc: "finalize + MLflow Registry" },
  "/predict": { label: "예측 실행", icon: "▶", color: "#34D399", phase: "DEPLOY", desc: "단건/배치/이력 예측" },
  "/mlflow": { label: "MLflow 관리", icon: "≡", color: "#8BA8C8", phase: "OPS", desc: "실험 로그와 레지스트리" },
}

const ORDER = Object.keys(SCREEN_META)

export default function AppShell({ children }) {
  const { pathname } = useLocation()
  const meta = SCREEN_META[pathname] || SCREEN_META["/home"]
  const index = ORDER.indexOf(pathname)

  return (
    <div style={{ display: "flex", minHeight: "100vh", color: "#E2EEFF" }}>
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
