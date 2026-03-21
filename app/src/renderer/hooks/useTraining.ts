import { useState, useEffect } from 'react'
import { api } from './useApi'

interface TrainingState {
  runId: string | null
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress: number
  currentStep: number
  totalSteps: number
  logs: string
  lossHistory: number[]
}

export function useTraining() {
  const [state, setState] = useState<TrainingState>({
    runId: null,
    status: 'idle',
    progress: 0,
    currentStep: 0,
    totalSteps: 0,
    logs: '',
    lossHistory: [],
  })

  const startTraining = async (config: any) => {
    try {
      const result = await api.training.start(config) as { run_id: string }
      setState(prev => ({
        ...prev,
        runId: result.run_id,
        status: 'running',
        progress: 0,
        logs: 'Training started...\n',
      }))
      return result.run_id
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: 'failed',
        logs: `Error: ${error.message}\n`,
      }))
      return null
    }
  }

  const stopTraining = async () => {
    if (state.runId) {
      await api.training.stop(state.runId)
      setState(prev => ({
        ...prev,
        status: 'idle',
        logs: prev.logs + '\nTraining stopped by user.\n',
      }))
    }
  }

  const pollStatus = async () => {
    if (!state.runId || state.status !== 'running') return

    try {
      const status = await api.training.getStatus(state.runId) as any
      const logs = await api.training.getLogs(state.runId) as any
      const loss = await api.training.getLoss(state.runId) as any

      setState(prev => ({
        ...prev,
        progress: status.progress || 0,
        currentStep: status.current_step || 0,
        totalSteps: status.total_steps || 0,
        logs: logs?.logs || prev.logs,
        lossHistory: loss?.loss_history || prev.lossHistory,
        status: status.status === 'completed' ? 'completed' : status.status === 'failed' ? 'failed' : 'running',
      }))
    } catch (error) {
      console.error('Error polling status:', error)
    }
  }

  useEffect(() => {
    if (state.status === 'running') {
      const interval = setInterval(pollStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [state.runId, state.status])

  return {
    ...state,
    startTraining,
    stopTraining,
    reset: () => setState({
      runId: null,
      status: 'idle',
      progress: 0,
      currentStep: 0,
      totalSteps: 0,
      logs: '',
      lossHistory: [],
    }),
  }
}
