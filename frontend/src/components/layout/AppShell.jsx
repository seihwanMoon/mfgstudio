import { useLocation } from "react-router-dom"

import Header from "./Header"
import Sidebar from "./Sidebar"

const SCREEN_META = {
  "/home": { label: "대시보드", icon: "H", color: "#38BDF8", phase: "HOME", desc: "전체 작업 현황과 최근 모델 상태" },
  "/upload": { label: "업로드", icon: "U", color: "#38BDF8", phase: "DATA", desc: "데이터 업로드와 원본 확인" },
  "/setup": { label: "설정", icon: "S", color: "#38BDF8", phase: "SETUP", desc: "PyCaret setup 파라미터 구성" },
  "/compare": { label: "비교", icon: "C", color: "#FBBF24", phase: "TRAIN", desc: "compare_models() 후보 비교" },
  "/tune": { label: "튜닝", icon: "T", color: "#FBBF24", phase: "TRAIN", desc: "tune_model() 기반 최적화" },
  "/plots": { label: "그래프", icon: "P", color: "#F59E0B", phase: "ANALYZE", desc: "튜닝 이후 진단 그래프 통합 화면" },
  "/xai": { label: "XAI", icon: "X", color: "#A78BFA", phase: "EXPLAIN", desc: "설명 그래프와 행 단위 SHAP" },
  "/finalize": { label: "모델 확정", icon: "F", color: "#34D399", phase: "DEPLOY", desc: "모델 확정과 리포트 및 레지스트리 반영" },
  "/predict": { label: "예측", icon: "R", color: "#34D399", phase: "SERVE", desc: "단건, 배치, 이력 예측 실행" },
  "/mlflow": { label: "MLflow", icon: "M", color: "#8BA8C8", phase: "OPS", desc: "실험, 런, 레지스트리 운영 상태" },
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
