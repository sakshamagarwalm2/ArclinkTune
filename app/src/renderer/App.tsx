import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { useTheme } from './hooks/useTheme'
import { Layout } from './components/layout/Layout'
import { ModelsPage } from './pages/ModelsPage'
import { TrainPage } from './pages/TrainPage'
import { ChatPage } from './pages/ChatPage'
import { EvaluatePage } from './pages/EvaluatePage'
import { ExportPage } from './pages/ExportPage'
import { MonitorPage } from './pages/MonitorPage'
import { SetupPage } from './pages/SetupPage'
import { AboutPage } from './pages/AboutPage'

function App() {
  useTheme()
  const [isFirstLaunch, setIsFirstLaunch] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkFirstLaunch()
  }, [])

  const checkFirstLaunch = async () => {
    try {
      const modelsDir = await window.electronAPI.system.getModelsDir()
      if (!modelsDir) {
        setIsFirstLaunch(true)
      }
    } catch {
      setIsFirstLaunch(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupComplete = () => {
    setIsFirstLaunch(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background mesh-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-neon" />
          <p className="text-muted-foreground">Loading ArclinkTune...</p>
        </div>
      </div>
    )
  }

  if (isFirstLaunch) {
    return <SetupPage onComplete={handleSetupComplete} />
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/models" replace />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/train" element={<TrainPage />} />
          <Route path="/evaluate" element={<EvaluatePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Layout>
    </>
  )
}

export default App
