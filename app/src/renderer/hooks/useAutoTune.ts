import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from './useApi'

export interface TrialConfig {
  trial_id: string
  trial_number: number
  learning_rate: number
  lora_rank: number
  lora_alpha: number
  lora_dropout: number
  per_device_train_batch_size: number
  gradient_accumulation_steps: number
  lr_scheduler_type: string
  warmup_ratio: number
  cutoff_len: number
  weight_decay: number
  ai_reasoning: string
  ai_hypothesis: string
}

export interface TrialResult {
  trial_id: string
  trial_number: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped'
  final_train_loss: number | null
  ai_score: number
  ai_evaluation: string
  training_time_seconds: number
  loss_curve: { step: number; loss: number }[]
  config: TrialConfig
  rank?: number
}

export interface LoopLogEntry {
  timestamp: string
  step: 'think' | 'train' | 'evaluate' | 'feedback' | 'system'
  message: string
}

export interface AutoTuneSession {
  session_id: string
  config: any
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped'
  current_trial: number | null
  total_trials_completed: number
  trials: TrialResult[]
  best_trial_id: string | null
  start_time: string | null
  end_time: string | null
  ai_session_summary: string
  loop_log: LoopLogEntry[]
}

export function useAutoTune() {
  const [activeSession, setActiveSession] = useState<AutoTuneSession | null>(null)
  const [sessions, setSessions] = useState<AutoTuneSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.autotune.getSessions()
      setSessions(data)
    } catch (e: any) {
      console.error('Failed to fetch sessions:', e)
    }
  }, [])

  const fetchSession = useCallback(async (sessionId: string) => {
    try {
      const data = await api.autotune.getSession(sessionId)
      setActiveSession(data)
      return data
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }, [])

  const startSession = useCallback(async (config: any) => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.autotune.start(config)
      return result.session_id
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const pauseSession = useCallback(async (sessionId: string) => {
    try {
      await api.autotune.pause(sessionId)
      setActiveSession(prev => prev ? { ...prev, status: 'paused' } : prev)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const resumeSession = useCallback(async (sessionId: string) => {
    try {
      await api.autotune.resume(sessionId)
      setActiveSession(prev => prev ? { ...prev, status: 'running' } : prev)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const stopSession = useCallback(async (sessionId: string) => {
    try {
      await api.autotune.stop(sessionId)
      setActiveSession(prev => prev ? { ...prev, status: 'stopped' } : prev)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const connectSSE = useCallback((sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource(`http://localhost:8000/api/autotune/sessions/${sessionId}/stream`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setActiveSession(prev => {
          if (!prev) return prev
          return {
            ...prev,
            status: data.status,
            current_trial: data.current_trial,
            total_trials_completed: data.total_trials_completed,
            best_trial_id: data.best_trial_id,
            trials: data.trials?.map((t: any) => ({
              ...t,
              config: t.config || {},
            })) || prev.trials,
            loop_log: [
              ...prev.loop_log,
              ...(data.new_logs || []),
            ],
          }
        })

        if (data.event_type === 'session_complete') {
          es.close()
          eventSourceRef.current = null
          fetchSessions()
        }
      } catch (e) {
        console.error('SSE parse error:', e)
      }
    }

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [fetchSessions])

  const disconnectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return {
    activeSession,
    setActiveSession,
    sessions,
    loading,
    error,
    fetchSessions,
    fetchSession,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    connectSSE,
    disconnectSSE,
  }
}
