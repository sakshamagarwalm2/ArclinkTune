import { useState, useEffect, useCallback } from 'react'
import { api } from './useApi'

export interface AIProviderConfig {
  provider: 'gemini' | 'ollama' | 'none'
  gemini_api_key?: string | null
  gemini_model: string
  ollama_base_url: string
  ollama_model: string
  temperature: number
  max_tokens: number
}

export interface AppSettings {
  ai_provider: AIProviderConfig
  autotune_defaults?: any
  theme: 'dark' | 'light'
  notifications_enabled: boolean
  report_format: 'html' | 'json' | 'both'
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.settings.get()
      setSettings(data)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveSettings = useCallback(async (updated: Partial<AppSettings>) => {
    try {
      setSaving(true)
      const data = await api.settings.update(updated)
      setSettings(data)
      setError(null)
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const saveAiProvider = useCallback(async (config: AIProviderConfig) => {
    try {
      setSaving(true)
      const data = await api.settings.updateAiProvider(config)
      setSettings(prev => prev ? { ...prev, ai_provider: data } : prev)
      setError(null)
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const testGemini = useCallback(async (apiKey: string, model: string) => {
    return api.settings.testGemini(apiKey, model)
  }, [])

  const testOllama = useCallback(async (baseUrl: string, model: string) => {
    return api.settings.testOllama(baseUrl, model)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    saving,
    error,
    fetchSettings,
    saveSettings,
    saveAiProvider,
    testGemini,
    testOllama,
  }
}
