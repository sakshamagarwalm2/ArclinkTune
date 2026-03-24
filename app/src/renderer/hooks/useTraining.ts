import { useState, useEffect, useCallback } from 'react'
import { api } from './useApi'

interface TrainingState {
  runId: string | null
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress: number
  currentStep: number
  totalSteps: number
  logs: string[]
  lossHistory: number[]
  outputDir: string | null
}

const STORAGE_KEY = 'arclink_training_runid'

export function useTraining() {
  const [state, setState] = useState<TrainingState>(() => {
    const savedRunId = localStorage.getItem(STORAGE_KEY)
    return {
      runId: savedRunId || null,
      status: savedRunId ? 'running' : 'idle',
      progress: 0,
      currentStep: 0,
      totalSteps: 0,
      logs: [],
      lossHistory: [],
      outputDir: null,
    }
  })

  const pollStatus = useCallback(async () => {
    if (!state.runId) return

    try {
      const status = await api.training.getStatus(state.runId) as any
      const logsResponse = await api.training.getLogs(state.runId) as any
      const lossResponse = await api.training.getLoss(state.runId) as any

      setState(prev => {
        if (!prev.runId) return prev

        const newLossHistory = lossResponse?.loss_history?.length > 0
          ? [...prev.lossHistory, ...lossResponse.loss_history.filter((l: number) => !prev.lossHistory.includes(l))]
          : prev.lossHistory

        const newLogs = logsResponse?.logs?.length > 0
          ? [...prev.logs, ...logsResponse.logs.slice(-50)].slice(-200)
          : prev.logs

        return {
          ...prev,
          progress: status.progress || 0,
          currentStep: status.current_step || 0,
          totalSteps: status.total_steps || 0,
          logs: newLogs,
          lossHistory: newLossHistory,
          status: status.status === 'completed' ? 'completed'
            : status.status === 'failed' ? 'failed'
            : status.status === 'running' ? 'running'
            : prev.status,
        }
      })
    } catch (error) {
      console.error('Error polling status:', error)
    }
  }, [state.runId])

  useEffect(() => {
    if (state.runId && state.status === 'running') {
      const interval = setInterval(pollStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [state.runId, state.status, pollStatus])

  useEffect(() => {
    if (state.runId) {
      pollStatus()
    }
  }, [state.runId])

  const startTraining = async (config: any) => {
    try {
      const result = await api.training.start(config) as { run_id: string; output_dir?: string }
      localStorage.setItem(STORAGE_KEY, result.run_id)
      setState(prev => ({
        ...prev,
        runId: result.run_id,
        status: 'running',
        progress: 0,
        currentStep: 0,
        totalSteps: 0,
        logs: [`[${new Date().toLocaleTimeString()}] Training started...`],
        lossHistory: [],
        outputDir: result.output_dir || config.output_dir || null,
      }))
      return result.run_id
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: 'failed',
        logs: [`[${new Date().toLocaleTimeString()}] Error: ${error.message}`],
      }))
      return null
    }
  }

  const stopTraining = async () => {
    if (state.runId) {
      try {
        await api.training.stop(state.runId)
      } catch (e) {
        console.error('Error stopping training:', e)
      }
      localStorage.removeItem(STORAGE_KEY)
      setState(prev => ({
        ...prev,
        status: 'idle',
        logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] Training stopped by user.`],
      }))
    }
  }

  const clearTraining = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState({
      runId: null,
      status: 'idle',
      progress: 0,
      currentStep: 0,
      totalSteps: 0,
      logs: [],
      lossHistory: [],
      outputDir: null,
    })
  }

  return {
    ...state,
    startTraining,
    stopTraining,
    clearTraining,
    reset: clearTraining,
  }
}
