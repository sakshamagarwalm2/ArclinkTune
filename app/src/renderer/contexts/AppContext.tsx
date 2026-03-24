import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

export interface ModelInfo {
  name: string
  path: string
  template?: string
  downloaded?: boolean
  size?: string
}

export interface DownloadTask {
  task_id: string
  model_path: string
  model_name: string
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'not_found'
  progress: number
  downloaded: string
  total: string
  speed: string
  eta: string
  error?: string
  local_path?: string
  hub?: string
}

export interface TrainingResult {
  outputDir: string
  modelPath: string
  finetuningType: string
  checkpointPath: string
  dataset: string
  datasetDir: string
  template: string
  timestamp: number
}

export interface EvalResult {
  modelPath: string
  checkpointPath: string
  template: string
  finetuningType: string
  outputDir: string
  metrics: Record<string, any>
  timestamp: number
}

interface AppContextType {
  selectedModel: ModelInfo | null
  setSelectedModel: (model: ModelInfo | null) => void
  
  downloadedModels: string[]
  addDownloadedModel: (path: string) => void
  removeDownloadedModel: (path: string) => void
  loadDownloadedModels: () => void
  
  downloadTasks: DownloadTask[]
  addDownloadTask: (task: DownloadTask) => void
  updateDownloadTask: (id: string, updates: Partial<DownloadTask>) => void
  removeDownloadTask: (id: string) => void
  clearCompletedTasks: () => void
  
  templates: string[]
  setTemplates: (templates: string[]) => void
  
  lastTrainingResult: TrainingResult | null
  setLastTrainingResult: (result: TrainingResult | null) => void
  lastEvalResult: EvalResult | null
  setLastEvalResult: (result: EvalResult | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const DOWNLOADED_MODELS_FILE = 'downloaded_models.json'
const TRAINING_RESULT_KEY = 'arclink_last_training_result'
const EVAL_RESULT_KEY = 'arclink_last_eval_result'
const SELECTED_MODEL_KEY = 'arclink_selected_model'

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModelState] = useState<ModelInfo | null>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_MODEL_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [downloadedModels, setDownloadedModels] = useState<string[]>([])
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([])
  const [templates, setTemplates] = useState<string[]>([])
  const [lastTrainingResult, setLastTrainingResultState] = useState<TrainingResult | null>(() => {
    try {
      const saved = localStorage.getItem(TRAINING_RESULT_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [lastEvalResult, setLastEvalResultState] = useState<EvalResult | null>(() => {
    try {
      const saved = localStorage.getItem(EVAL_RESULT_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const loadDownloadedModels = useCallback(() => {
    try {
      const models = localStorage.getItem(DOWNLOADED_MODELS_FILE)
      if (models) {
        setDownloadedModels(JSON.parse(models))
      }
    } catch (e) {
      console.error('Failed to load downloaded models:', e)
    }
  }, [])

  const setSelectedModel = useCallback((model: ModelInfo | null) => {
    setSelectedModelState(model)
    if (model) {
      localStorage.setItem(SELECTED_MODEL_KEY, JSON.stringify(model))
    } else {
      localStorage.removeItem(SELECTED_MODEL_KEY)
    }
  }, [])

  const addDownloadedModel = useCallback((path: string) => {
    setDownloadedModels(prev => {
      const updated = prev.includes(path) ? prev : [...prev, path]
      localStorage.setItem(DOWNLOADED_MODELS_FILE, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeDownloadedModel = useCallback((path: string) => {
    setDownloadedModels(prev => {
      const updated = prev.filter(p => p !== path)
      localStorage.setItem(DOWNLOADED_MODELS_FILE, JSON.stringify(updated))
      return updated
    })
  }, [])

  const addDownloadTask = useCallback((task: DownloadTask) => {
    setDownloadTasks(prev => [...prev, task])
  }, [])

  const updateDownloadTask = useCallback((id: string, updates: Partial<DownloadTask>) => {
    setDownloadTasks(prev => prev.map(task => 
      task.task_id === id ? { ...task, ...updates } : task
    ))
  }, [])

  const removeDownloadTask = useCallback((id: string) => {
    setDownloadTasks(prev => prev.filter(task => task.task_id !== id))
  }, [])

  const clearCompletedTasks = useCallback(() => {
    setDownloadTasks(prev => prev.filter(task => 
      task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'failed'
    ))
  }, [])

  const setLastTrainingResult = useCallback((result: TrainingResult | null) => {
    setLastTrainingResultState(result)
    if (result) {
      localStorage.setItem(TRAINING_RESULT_KEY, JSON.stringify(result))
    } else {
      localStorage.removeItem(TRAINING_RESULT_KEY)
    }
  }, [])

  const setLastEvalResult = useCallback((result: EvalResult | null) => {
    setLastEvalResultState(result)
    if (result) {
      localStorage.setItem(EVAL_RESULT_KEY, JSON.stringify(result))
    } else {
      localStorage.removeItem(EVAL_RESULT_KEY)
    }
  }, [])

  useEffect(() => {
    loadDownloadedModels()
  }, [loadDownloadedModels])

  return (
    <AppContext.Provider value={{
      selectedModel,
      setSelectedModel,
      downloadedModels,
      addDownloadedModel,
      removeDownloadedModel,
      loadDownloadedModels,
      downloadTasks,
      addDownloadTask,
      updateDownloadTask,
      removeDownloadTask,
      clearCompletedTasks,
      templates,
      setTemplates,
      lastTrainingResult,
      setLastTrainingResult,
      lastEvalResult,
      setLastEvalResult,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
