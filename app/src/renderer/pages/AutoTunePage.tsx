import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LiveLoopMonitor } from '@/components/autotune/LiveLoopMonitor'
import { LossChart } from '@/components/charts/LossChart'
import { api } from '@/hooks/useApi'
import { useAutoTune } from '@/hooks/useAutoTune'
import { useSettings } from '@/hooks/useSettings'
import {
  Sparkles, Play, Pause, Square, Clock, Brain,
  Settings, Trophy, Crown, ChevronDown, ChevronUp,
  ExternalLink, History, Loader2, Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'setup' | 'live' | 'report'

export function AutoTunePage() {
  const [view, setView] = useState<ViewMode>('setup')
  const {
    activeSession, setActiveSession, sessions, loading,
    fetchSessions, fetchSession, startSession, pauseSession, resumeSession,
    stopSession, connectSSE, disconnectSSE,
  } = useAutoTune()
  const { settings } = useSettings()

  const { data: localModels } = useQuery({ queryKey: ['models', 'local'], queryFn: () => api.models.getLocal() })
  const { data: templates } = useQuery({ queryKey: ['models', 'templates'], queryFn: () => api.models.getTemplates() })
  const { data: datasets } = useQuery({ queryKey: ['training', 'datasets'], queryFn: () => api.training.getDatasets() })

  // Setup form state
  const [sessionName, setSessionName] = useState('')
  const [modelName, setModelName] = useState('')
  const [modelPath, setModelPath] = useState('')
  const [datasetName, setDatasetName] = useState('')
  const [template, setTemplate] = useState('default')
  const [finetuningType, setFinetuningType] = useState('lora')
  const [probeEpochs, setProbeEpochs] = useState(2)
  const [maxTrials, setMaxTrials] = useState(20)
  const [maxHours, setMaxHours] = useState(8)
  const [earlyStopPatience, setEarlyStopPatience] = useState(3)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Search space
  const [lrMin, setLrMin] = useState(1e-5)
  const [lrMax, setLrMax] = useState(1e-3)
  const [loraRanks, setLoraRanks] = useState<number[]>([4, 8, 16, 32])
  const [loraAlphas, setLoraAlphas] = useState<number[]>([8, 16, 32, 64])
  const [batchSizes, setBatchSizes] = useState<number[]>([1, 2, 4, 8])
  const [schedulers] = useState<string[]>(['cosine', 'linear', 'constant_with_warmup'])

  // Session history drawer
  const [showHistory, setShowHistory] = useState(false)

  // Expanded trial in report
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null)

  // Log auto-scroll ref
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (settings?.autotune_defaults) {
      const d = settings.autotune_defaults
      if (d.probe_epochs) setProbeEpochs(d.probe_epochs)
      if (d.max_trials) setMaxTrials(d.max_trials)
      if (d.max_runtime_hours) setMaxHours(d.max_runtime_hours)
    }
  }, [settings])

  useEffect(() => {
    if (activeSession?.status === 'running' || activeSession?.status === 'paused') {
      setView('live')
    } else if (activeSession?.status === 'completed') {
      setView('report')
    }
  }, [activeSession?.status])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.loop_log?.length])

  // Auto-generate session name
  useEffect(() => {
    if (!sessionName && modelName) {
      const date = new Date().toISOString().slice(0, 10)
      setSessionName(`${modelName.split('/').pop()}-autotune-${date}`)
    }
  }, [modelName])

  const handleStart = async () => {
    if (!modelName || !datasetName) return

    const aiProvider = settings?.ai_provider || { provider: 'none' }

    const config = {
      session_name: sessionName,
      base_model: modelPath || modelName,
      dataset: datasetName,
      template,
      finetuning_type: finetuningType,
      probe_epochs: probeEpochs,
      max_trials: maxTrials,
      max_runtime_hours: maxHours,
      early_stopping_patience: earlyStopPatience,
      ai_provider: aiProvider,
      optimization_goal: 'minimize_val_loss',
      compute_device: 'auto',
      dataset_dir: 'data',
      search_space: {
        learning_rate_min: lrMin,
        learning_rate_max: lrMax,
        lora_rank_options: loraRanks,
        lora_alpha_options: loraAlphas,
        lora_dropout_min: 0.0,
        lora_dropout_max: 0.15,
        batch_size_options: batchSizes,
        gradient_accumulation_options: [4, 8, 16, 32],
        lr_scheduler_options: schedulers,
        warmup_ratio_min: 0.0,
        warmup_ratio_max: 0.1,
        cutoff_len_options: [512, 1024, 2048],
        weight_decay_min: 0.0,
        weight_decay_max: 0.1,
      },
      base_training_config: {},
    }

    const sessionId = await startSession(config)
    if (sessionId) {
      const session = await fetchSession(sessionId)
      if (session) {
        connectSSE(sessionId)
        setView('live')
      }
    }
  }

  const handleViewSession = async (sessionId: string) => {
    disconnectSSE()
    const session = await fetchSession(sessionId)
    if (session) {
      if (session.status === 'running' || session.status === 'paused') {
        connectSSE(sessionId)
        setView('live')
      } else {
        setView('report')
      }
    }
    setShowHistory(false)
  }

  const handleBackToSetup = () => {
    disconnectSSE()
    setActiveSession(null)
    setView('setup')
  }

  const getLoopStep = (): 'think' | 'train' | 'evaluate' | 'feedback' | null => {
    if (!activeSession?.loop_log?.length) return null
    const lastEntry = activeSession.loop_log[activeSession.loop_log.length - 1]
    if (lastEntry.step === 'system') return null
    return lastEntry.step
  }

  const currentTrial = activeSession?.trials?.find(
    t => t.trial_number === activeSession.current_trial
  )

  const completedTrials = activeSession?.trials?.filter(t => t.status === 'completed') || []
  const rankedTrials = [...completedTrials].sort((a, b) => b.ai_score - a.ai_score)

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const getProviderBadge = () => {
    const provider = settings?.ai_provider?.provider || 'none'
    if (provider === 'gemini') return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1"><Globe className="w-3 h-3" /> Gemini</Badge>
    if (provider === 'ollama') return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 gap-1"><Brain className="w-3 h-3" /> Ollama</Badge>
    return <Badge variant="secondary" className="gap-1"><Sparkles className="w-3 h-3" /> Rule-based</Badge>
  }

  // ══════════════════════════════════════════════════
  // SETUP VIEW
  // ══════════════════════════════════════════════════
  const renderSetup = () => (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AutoTune
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">AI-powered overnight hyperparameter search</p>
        </div>
        <div className="flex items-center gap-3">
          {getProviderBadge()}
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-1.5">
            <History className="w-3.5 h-3.5" /> Past Sessions
          </Button>
        </div>
      </div>

      {/* Step 1: Base Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Base Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Model</label>
              <Select value={modelName} onValueChange={(v) => {
                setModelName(v)
                const m = (localModels as any[])?.find((m: any) => (m.path || m.name) === v)
                if (m) setModelPath(m.path || m.name)
              }}>
                <SelectTrigger><SelectValue placeholder="Select model..." /></SelectTrigger>
                <SelectContent>
                  {(localModels as any[])?.map((m: any) => (
                    <SelectItem key={m.path || m.name} value={m.path || m.name}>
                      {m.name || m.path?.split('/').pop()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Dataset</label>
              <Select value={datasetName} onValueChange={setDatasetName}>
                <SelectTrigger><SelectValue placeholder="Select dataset..." /></SelectTrigger>
                <SelectContent>
                  {(datasets as any[])?.map((d: any) => (
                    <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Template</label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(templates as string[])?.map((t: string) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Fine-tuning Type</label>
              <Select value={finetuningType} onValueChange={setFinetuningType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lora">LoRA</SelectItem>
                  <SelectItem value="qlora">QLoRA</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Session Name</label>
            <Input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="my-autotune-session" />
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Search Strategy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Probe Epochs</label>
              <Input type="number" value={probeEpochs} onChange={e => setProbeEpochs(parseInt(e.target.value) || 2)} min={1} max={5} />
              <p className="text-xs text-muted-foreground mt-1">2-3 recommended</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Max Trials: {maxTrials}</label>
              <Slider value={[maxTrials]} onValueChange={([v]) => setMaxTrials(v)} min={5} max={50} step={1} className="mt-3" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Runtime Limit: {maxHours}h</label>
              <Slider value={[maxHours]} onValueChange={([v]) => setMaxHours(v)} min={1} max={12} step={0.5} className="mt-3" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Early Stopping Patience: {earlyStopPatience}</label>
            <Slider value={[earlyStopPatience]} onValueChange={([v]) => setEarlyStopPatience(v)} min={1} max={10} step={1} className="w-64 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Stop trial if loss not improving for N checkpoints</p>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Advanced Search Space */}
      <Card>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" /> Search Space (Advanced)
            </CardTitle>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Learning Rate Range</label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={lrMin} onChange={e => setLrMin(parseFloat(e.target.value) || 1e-5)} step={1e-5} className="flex-1" />
                  <span className="text-muted-foreground">to</span>
                  <Input type="number" value={lrMax} onChange={e => setLrMax(parseFloat(e.target.value) || 1e-3)} step={1e-4} className="flex-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">LoRA Ranks</label>
                <div className="flex flex-wrap gap-2">
                  {[4, 8, 16, 32, 64].map(r => (
                    <button
                      key={r}
                      onClick={() => setLoraRanks(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                        loraRanks.includes(r) ? 'bg-primary/20 border-primary text-primary' : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">LoRA Alphas</label>
                <div className="flex flex-wrap gap-2">
                  {[8, 16, 32, 64, 128].map(a => (
                    <button
                      key={a}
                      onClick={() => setLoraAlphas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                        loraAlphas.includes(a) ? 'bg-primary/20 border-primary text-primary' : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Batch Sizes</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 4, 8].map(b => (
                    <button
                      key={b}
                      onClick={() => setBatchSizes(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                        batchSizes.includes(b) ? 'bg-primary/20 border-primary text-primary' : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >{b}</button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* AI Advisor Preview */}
      <Card className="border-primary/20">
        <CardContent className="py-4 flex items-center gap-3">
          <Brain className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium flex items-center gap-2">AI Advisor: {getProviderBadge()}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {settings?.ai_provider?.provider === 'none'
                ? 'Running in rule-based mode. Add Gemini/Ollama in Settings for intelligent optimization.'
                : `The AI will analyze each trial and suggest next configurations based on results.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Launch */}
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          onClick={handleStart}
          disabled={!modelName || !datasetName || loading}
          className="gap-2 shadow-neon"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Start AutoTune
        </Button>
        {(!modelName || !datasetName) && (
          <p className="text-xs text-muted-foreground">Select a model and dataset to begin</p>
        )}
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════
  // LIVE VIEW
  // ══════════════════════════════════════════════════
  const renderLive = () => {
    if (!activeSession) return null

    const elapsedSeconds = activeSession.start_time
      ? (Date.now() - new Date(activeSession.start_time).getTime()) / 1000
      : 0

    return (
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBackToSetup}>&larr; Back</Button>
            <h2 className="text-lg font-bold">{activeSession.config.session_name}</h2>
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-2 h-2 rounded-full",
                activeSession.status === 'running' ? 'bg-green-500 animate-pulse' :
                activeSession.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'
              )} />
              <span className="text-xs text-muted-foreground capitalize">{activeSession.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDuration(elapsedSeconds)}
            </span>
            {activeSession.status === 'running' && (
              <Button variant="outline" size="sm" onClick={() => pauseSession(activeSession.session_id)} className="gap-1">
                <Pause className="w-3 h-3" /> Pause
              </Button>
            )}
            {activeSession.status === 'paused' && (
              <Button variant="outline" size="sm" onClick={() => resumeSession(activeSession.session_id)} className="gap-1">
                <Play className="w-3 h-3" /> Resume
              </Button>
            )}
            {(activeSession.status === 'running' || activeSession.status === 'paused') && (
              <Button variant="destructive" size="sm" onClick={() => stopSession(activeSession.session_id)} className="gap-1">
                <Square className="w-3 h-3" /> Stop
              </Button>
            )}
          </div>
        </div>

        {/* Loop Animation */}
        <LiveLoopMonitor
          currentStep={getLoopStep()}
          trialNumber={activeSession.current_trial || 0}
          maxTrials={activeSession.config.max_trials}
          status={activeSession.status}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Current Trial Panel */}
          <div className="lg:col-span-2 space-y-4">
            {currentTrial && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Trial {currentTrial.trial_number} of {activeSession.config.max_trials}</span>
                    <Badge variant={currentTrial.status === 'running' ? 'default' : 'secondary'}>{currentTrial.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">LR</div>
                      <div className="text-sm font-mono font-bold">{currentTrial.config.learning_rate?.toExponential(1)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Rank</div>
                      <div className="text-sm font-mono font-bold">{currentTrial.config.lora_rank}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Alpha</div>
                      <div className="text-sm font-mono font-bold">{currentTrial.config.lora_alpha}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Batch</div>
                      <div className="text-sm font-mono font-bold">{currentTrial.config.per_device_train_batch_size}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Scheduler</div>
                      <div className="text-sm font-mono font-bold text-xs">{currentTrial.config.lr_scheduler_type}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Loss</div>
                      <div className="text-sm font-mono font-bold text-primary">
                        {currentTrial.final_train_loss?.toFixed(4) || '...'}
                      </div>
                    </div>
                  </div>

                  {currentTrial.config.ai_reasoning && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">AI Reasoning</summary>
                      <p className="mt-2 p-3 rounded-lg bg-muted/20 text-muted-foreground leading-relaxed">
                        {currentTrial.config.ai_reasoning}
                      </p>
                    </details>
                  )}

                  {/* Live Loss Chart */}
                  {currentTrial.loss_curve && currentTrial.loss_curve.length > 0 && (
                    <div className="h-48">
                      <LossChart
                        data={currentTrial.loss_curve.map((p: any) => ({
                          current_steps: p.step,
                          loss: p.loss,
                        }))}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Trial History Sidebar */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Completed Trials</h3>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {rankedTrials.map((trial, i) => (
                  <Card key={trial.trial_id} className={cn(
                    "p-3 cursor-pointer transition-all",
                    trial.trial_id === activeSession.best_trial_id && "border-amber-500/50 bg-amber-500/5"
                  )} onClick={() => setExpandedTrial(expandedTrial === trial.trial_id ? null : trial.trial_id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="text-xs font-semibold">Trial #{trial.trial_number}</span>
                      </div>
                      <Badge variant="secondary" className={cn(
                        "text-xs",
                        trial.ai_score >= 7 ? "bg-green-500/20 text-green-400" :
                        trial.ai_score >= 4 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      )}>
                        {trial.ai_score.toFixed(1)}/10
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      loss={trial.final_train_loss?.toFixed(4) || 'N/A'} | lr={trial.config.learning_rate?.toExponential(1)}
                    </div>
                    {expandedTrial === trial.trial_id && trial.ai_evaluation && (
                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t leading-relaxed">
                        {trial.ai_evaluation}
                      </p>
                    )}
                  </Card>
                ))}
                {rankedTrials.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No completed trials yet...</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Live AI Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" /> AI Thought Stream
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-1 font-mono text-xs">
                {activeSession.loop_log.map((entry, i) => {
                  const colorMap: Record<string, string> = {
                    think: 'text-blue-400', train: 'text-yellow-400',
                    evaluate: 'text-purple-400', feedback: 'text-green-400', system: 'text-slate-400',
                  }
                  return (
                    <div key={i} className="flex gap-2 py-0.5">
                      <span className="text-slate-600 flex-shrink-0">{entry.timestamp?.slice(11, 19)}</span>
                      <span className={cn('font-semibold uppercase w-16 flex-shrink-0', colorMap[entry.step])}>{entry.step}</span>
                      <span className="text-slate-300">{entry.message}</span>
                    </div>
                  )
                })}
                <div ref={logEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ══════════════════════════════════════════════════
  // REPORT VIEW
  // ══════════════════════════════════════════════════
  const renderReport = () => {
    if (!activeSession) return null

    const best = rankedTrials[0]
    const elapsed = activeSession.start_time && activeSession.end_time
      ? (new Date(activeSession.end_time).getTime() - new Date(activeSession.start_time).getTime()) / 1000
      : 0

    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={handleBackToSetup} className="mb-2">&larr; Back to Setup</Button>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" /> AutoTune Report
            </h2>
            <p className="text-sm text-muted-foreground">{activeSession.config.session_name}</p>
          </div>
          <div className="flex gap-2">
            <a href={`http://localhost:8000/api/autotune/sessions/${activeSession.session_id}/report?format=html`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1"><ExternalLink className="w-3 h-3" /> Open Report</Button>
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Trials', value: completedTrials.length },
            { label: 'Best Score', value: best ? `${best.ai_score.toFixed(1)}/10` : 'N/A' },
            { label: 'Best Loss', value: best?.final_train_loss?.toFixed(4) || 'N/A' },
            { label: 'Duration', value: formatDuration(elapsed) },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <div className="text-xs text-muted-foreground uppercase">{s.label}</div>
              <div className="text-2xl font-bold text-primary mt-1">{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Best Config */}
        {best && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" /> Best Configuration — Trial #{best.trial_number}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center mb-4">
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground">LR</div>
                  <div className="text-sm font-mono font-bold">{best.config.learning_rate?.toExponential(1)}</div>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground">Rank</div>
                  <div className="text-sm font-mono font-bold">{best.config.lora_rank}</div>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground">Alpha</div>
                  <div className="text-sm font-mono font-bold">{best.config.lora_alpha}</div>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground">Batch</div>
                  <div className="text-sm font-mono font-bold">{best.config.per_device_train_batch_size}</div>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground">Scheduler</div>
                  <div className="text-sm font-mono font-bold">{best.config.lr_scheduler_type}</div>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-xs text-muted-foreground">Dropout</div>
                  <div className="text-sm font-mono font-bold">{best.config.lora_dropout}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{best.config.ai_reasoning}</p>
            </CardContent>
          </Card>
        )}

        {/* All Trials Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trial Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="py-2 px-2">Rank</th>
                    <th className="py-2 px-2">Trial</th>
                    <th className="py-2 px-2">LR</th>
                    <th className="py-2 px-2">Rank/Alpha</th>
                    <th className="py-2 px-2">Batch</th>
                    <th className="py-2 px-2">Loss</th>
                    <th className="py-2 px-2">Score</th>
                    <th className="py-2 px-2">Time</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {rankedTrials.map((t, i) => (
                    <tr key={t.trial_id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-2 font-bold" style={{ color: i < 3 ? '#22c55e' : i < 6 ? '#eab308' : '#ef4444' }}>#{i + 1}</td>
                      <td className="py-2 px-2">{t.trial_number}</td>
                      <td className="py-2 px-2">{t.config.learning_rate?.toExponential(1)}</td>
                      <td className="py-2 px-2">{t.config.lora_rank}/{t.config.lora_alpha}</td>
                      <td className="py-2 px-2">{t.config.per_device_train_batch_size}</td>
                      <td className="py-2 px-2">{t.final_train_loss?.toFixed(4) || 'N/A'}</td>
                      <td className="py-2 px-2 font-bold" style={{ color: i < 3 ? '#22c55e' : i < 6 ? '#eab308' : '#ef4444' }}>{t.ai_score.toFixed(1)}</td>
                      <td className="py-2 px-2">{formatDuration(t.training_time_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI Summary */}
        {activeSession.ai_session_summary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AI Session Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{activeSession.ai_session_summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Embedded Report */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Full Report</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-xl">
            <iframe
              src={`http://localhost:8000/api/autotune/sessions/${activeSession.session_id}/report?format=html`}
              className="w-full h-[600px] border-0"
              title="AutoTune Report"
            />
          </CardContent>
        </Card>

        {/* Past Sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Session History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map(s => (
                <button
                  key={s.session_id}
                  onClick={() => handleViewSession(s.session_id)}
                  className="w-full text-left p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.config.session_name}</span>
                    <Badge variant={s.status === 'completed' ? 'default' : 'secondary'}>{s.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.total_trials_completed} trials | {s.start_time?.slice(0, 10)}
                  </div>
                </button>
              ))}
              {sessions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No sessions yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ══════════════════════════════════════════════════
  // SESSION HISTORY DRAWER (overlay)
  // ══════════════════════════════════════════════════
  useEffect(() => {
    if (showHistory) {
      fetchSessions()
    }
  }, [showHistory, fetchSessions])

  const renderHistoryDrawer = () => {
    if (!showHistory) return null

    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
        <div className="relative ml-auto w-full max-w-md bg-background border-l border-border p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2"><History className="w-5 h-5" /> Session History</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>&times;</Button>
          </div>
          <div className="space-y-2">
            {sessions.map(s => (
              <button
                key={s.session_id}
                onClick={() => handleViewSession(s.session_id)}
                className="w-full text-left p-4 rounded-lg border border-border/50 hover:bg-muted/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{s.config.session_name}</span>
                  <Badge variant={s.status === 'completed' ? 'default' : s.status === 'running' ? 'default' : 'secondary'}>{s.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.config.base_model?.split('/').pop()} | {s.total_trials_completed} trials
                </div>
                <div className="text-xs text-muted-foreground">{s.start_time?.slice(0, 16)?.replace('T', ' ')}</div>
              </button>
            ))}
            {sessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No sessions yet</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {renderHistoryDrawer()}
      {view === 'setup' && renderSetup()}
      {view === 'live' && renderLive()}
      {view === 'report' && renderReport()}
    </>
  )
}
