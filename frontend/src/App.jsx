import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import AppShell from "./components/layout/AppShell"
import AnalyzePage from "./pages/AnalyzePage"
import ComparePage from "./pages/ComparePage"
import FinalizePage from "./pages/FinalizePage"
import HomePage from "./pages/HomePage"
import MLflowPage from "./pages/MLflowPage"
import PredictPage from "./pages/PredictPage"
import SetupPage from "./pages/SetupPage"
import TunePage from "./pages/TunePage"
import UploadPage from "./pages/UploadPage"
import useStore from "./store/useStore"

export default function App() {
  const theme = useStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("mfgstudio-theme", theme)
  }, [theme])

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/tune" element={<TunePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/finalize" element={<FinalizePage />} />
          <Route path="/predict" element={<PredictPage />} />
          <Route path="/mlflow" element={<MLflowPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
