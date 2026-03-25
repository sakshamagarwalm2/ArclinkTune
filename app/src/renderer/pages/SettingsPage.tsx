import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Settings as SettingsIcon, Brain, Sparkles, Globe, CheckCircle2, XCircle,
  Loader2, Eye, EyeOff, FileText, Info
} from 'lucide-react'
import { useSettings, AIProviderConfig } from '@/hooks/useSettings'
import { api } from '@/hooks/useApi'

export function SettingsPage() {
  const { settings, loading, saving, saveSettings, saveAiProvider, testGemini, testOllama } = useSettings()

  const [provider, setProvider] = useState<'gemini' | 'ollama' | 'none'>('none')
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3.1:8b')
  const [temperature, setTemperature] = useState(0.3)
  const [showKey, setShowKey] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [geminiModels, setGeminiModels] = useState<any[]>([])

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const [probeEpochs, setProbeEpochs] = useState(2)
  const [maxTrials, setMaxTrials] = useState(20)
  const [maxHours, setMaxHours] = useState(8)
  const [reportFormat, setReportFormat] = useState<'html' | 'json' | 'both'>('html')

  useEffect(() => {
    if (settings) {
      const ap = settings.ai_provider
      setProvider(ap.provider)
      setGeminiKey(ap.gemini_api_key || '')
      setGeminiModel(ap.gemini_model)
      setOllamaUrl(ap.ollama_base_url)
      setOllamaModel(ap.ollama_model)
      setTemperature(ap.temperature)
      setReportFormat(settings.report_format)

      if (settings.autotune_defaults) {
        setProbeEpochs(settings.autotune_defaults.probe_epochs || 2)
        setMaxTrials(settings.autotune_defaults.max_trials || 20)
        setMaxHours(settings.autotune_defaults.max_runtime_hours || 8)
      }
    }
  }, [settings])

  useEffect(() => {
    if (provider === 'ollama') {
      api.settings.getOllamaModels(ollamaUrl).then(data => {
        if (data.available) setOllamaModels(data.models)
      }).catch(() => setOllamaModels([]))
    }
  }, [provider, ollamaUrl])

  useEffect(() => {
    api.settings.getGeminiModels().then(data => {
      setGeminiModels(data.models || [])
    }).catch(() => setGeminiModels([]))
  }, [])

  const handleSaveAiProvider = async () => {
    const config: AIProviderConfig = {
      provider,
      gemini_api_key: geminiKey || null,
      gemini_model: geminiModel,
      ollama_base_url: ollamaUrl,
      ollama_model: ollamaModel,
      temperature,
      max_tokens: 2000,
    }
    await saveAiProvider(config)
  }

  const handleSaveDefaults = async () => {
    await saveSettings({
      report_format: reportFormat,
      autotune_defaults: {
        probe_epochs: probeEpochs,
        max_trials: maxTrials,
        max_runtime_hours: maxHours,
      },
    })
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      if (provider === 'gemini') {
        const result = await testGemini(geminiKey, geminiModel)
        setTestResult({
          success: result.success,
          message: result.success ? `Connected! (${result.latency_ms}ms)` : result.error,
        })
      } else if (provider === 'ollama') {
        const result = await testOllama(ollamaUrl, ollamaModel)
        setTestResult({
          success: result.success,
          message: result.success
            ? `Connected! ${result.models_available?.length || 0} models available`
            : result.error,
        })
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Settings</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Configure ArclinkTune preferences</p>
        </div>
      </div>

      <Tabs defaultValue="ai-advisor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai-advisor">
            <Brain className="w-4 h-4 mr-2" /> AI Advisor
          </TabsTrigger>
          <TabsTrigger value="autotune">
            <Sparkles className="w-4 h-4 mr-2" /> AutoTune Defaults
          </TabsTrigger>
          <TabsTrigger value="report">
            <FileText className="w-4 h-4 mr-2" /> Report
          </TabsTrigger>
        </TabsList>

        {/* ═══ AI ADVISOR TAB ═══ */}
        <TabsContent value="ai-advisor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Provider</CardTitle>
              <CardDescription>Choose the AI engine for intelligent hyperparameter suggestions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'gemini' as const, icon: <Globe className="w-6 h-6" />, title: 'Gemini API', desc: 'Cloud AI by Google. Best reasoning quality.' },
                  { id: 'ollama' as const, icon: <Brain className="w-6 h-6" />, title: 'Ollama (Local)', desc: 'Private, no API key needed. Requires Ollama.' },
                  { id: 'none' as const, icon: <Sparkles className="w-6 h-6" />, title: 'None (Rule-based)', desc: 'Latin Hypercube Sampling. No API needed.' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      provider === p.id
                        ? 'border-primary bg-primary/10 shadow-neon-glow'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className={`mb-2 ${provider === p.id ? 'text-primary' : 'text-muted-foreground'}`}>{p.icon}</div>
                    <h3 className="font-semibold text-sm">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                  </button>
                ))}
              </div>

              {/* Gemini Config */}
              {provider === 'gemini' && (
                <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">API Key</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showKey ? 'text' : 'password'}
                          value={geminiKey}
                          onChange={e => setGeminiKey(e.target.value)}
                          placeholder="AIza..."
                          className="pr-10"
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your key at{' '}
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        aistudio.google.com/app/apikey
                      </a>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Model</label>
                    <select
                      value={geminiModel}
                      onChange={e => setGeminiModel(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {geminiModels.map(m => (
                        <option key={m.id} value={m.id}>{m.id} — {m.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Temperature: <span className="text-primary">{temperature.toFixed(1)}</span>
                    </label>
                    <Slider
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      min={0} max={1} step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Lower = more deterministic (0.2-0.4 recommended)</p>
                  </div>
                </div>
              )}

              {/* Ollama Config */}
              {provider === 'ollama' && (
                <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Base URL</label>
                    <Input
                      value={ollamaUrl}
                      onChange={e => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Model</label>
                    {ollamaModels.length > 0 ? (
                      <select
                        value={ollamaModel}
                        onChange={e => setOllamaModel(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ollamaModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          value={ollamaModel}
                          onChange={e => setOllamaModel(e.target.value)}
                          placeholder="llama3.1:8b"
                        />
                        <p className="text-xs text-amber-500 flex items-center gap-1">
                          <Info className="w-3 h-3" /> No models found. Make sure Ollama is running.
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Temperature: <span className="text-primary">{temperature.toFixed(1)}</span>
                    </label>
                    <Slider
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      min={0} max={1} step={0.1}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* None explanation */}
              {provider === 'none' && (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Rule-based Latin Hypercube Sampling will systematically explore the search space.
                    Good for fast exploration without API costs. Add an AI advisor later for intelligent reasoning.
                  </p>
                </div>
              )}

              {/* Test & Save */}
              <div className="flex items-center gap-3 flex-wrap">
                {provider !== 'none' && (
                  <Button variant="outline" onClick={handleTestConnection} disabled={testing || (provider === 'gemini' && !geminiKey)}>
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Test Connection
                  </Button>
                )}
                <Button onClick={handleSaveAiProvider} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save AI Provider
                </Button>
                {testResult && (
                  <Badge variant={testResult.success ? 'default' : 'destructive'} className="gap-1">
                    {testResult.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {testResult.message}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ AUTOTUNE DEFAULTS TAB ═══ */}
        <TabsContent value="autotune" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Defaults</CardTitle>
              <CardDescription>Default values for new AutoTune sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Probe Epochs</label>
                  <Input
                    type="number"
                    value={probeEpochs}
                    onChange={e => setProbeEpochs(parseInt(e.target.value) || 2)}
                    min={1} max={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">2-3 recommended for overnight runs</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Max Trials: {maxTrials}</label>
                  <Slider
                    value={[maxTrials]}
                    onValueChange={([v]) => setMaxTrials(v)}
                    min={5} max={50} step={1}
                    className="w-full mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Max Runtime: {maxHours}h</label>
                  <Slider
                    value={[maxHours]}
                    onValueChange={([v]) => setMaxHours(v)}
                    min={1} max={12} step={0.5}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <Button onClick={handleSaveDefaults} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ REPORT TAB ═══ */}
        <TabsContent value="report" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Settings</CardTitle>
              <CardDescription>Configure how AutoTune reports are generated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Report Format</label>
                <div className="flex gap-3">
                  {(['html', 'json', 'both'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setReportFormat(fmt)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        reportFormat === fmt
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveDefaults} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Report Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
