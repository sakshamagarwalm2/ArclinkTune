import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Play, Square, Eye, LineChart, Bot, Download, ArrowRight, MessageSquare, Activity, XCircle } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { api } from '@/hooks/useApi'
import { useApp } from '@/contexts/AppContext'
import { EvalMetricsChart } from '@/components/charts/EvalMetricsChart'
import { cn } from '@/lib/utils'

import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, RefreshCw } from 'lucide-react'
import { DatasetBrowser } from '@/components/DatasetBrowser'

export function EvaluatePage() {
  const { lastTrainingResult, setLastEvalResult } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, number>>({})
  const [evalMetrics, setEvalMetrics] = useState<Record<string, any>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const [evalOutputDir, setEvalOutputDir] = useState('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showOutputStatsModal, setShowOutputStatsModal] = useState(false)
  const [outputResults, setOutputResults] = useState<any>(null)
  const [previewConfig, setPreviewConfig] = useState<any>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)

  const { data: availableDatasets = [], isLoading: loadingDatasets } = useQuery<any[]>({
    queryKey: ['models', 'datasets'],
    queryFn: async () => {
      const info = await api.datasets.getInfo()
      return (info.datasets || []).map((d: any) => ({ name: d.name, path: d.name }))
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (lastTrainingResult) {
      setModelPath(lastTrainingResult.modelPath)
      setFinetuningType(lastTrainingResult.finetuningType)
      setCheckpointPath(lastTrainingResult.checkpointPath)
      if (lastTrainingResult.dataset) {
        setDataset(lastTrainingResult.dataset)
      }
      if (lastTrainingResult.datasetDir) {
        setDatasetDir(lastTrainingResult.datasetDir)
      }
      if (lastTrainingResult.template && lastTrainingResult.template !== 'default') {
        setTemplate(lastTrainingResult.template)
      }
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Loaded training result from: ${lastTrainingResult.outputDir}`])
    }
  }, [lastTrainingResult])
  
  const [modelPath, setModelPath] = useState('')
  const [finetuningType, setFinetuningType] = useState('lora')
  const [checkpointPath, setCheckpointPath] = useState('')
  const [template, setTemplate] = useState('default')
  
  const [dataset, setDataset] = useState('')
  const [datasetDir, setDatasetDir] = useState('data')
  const [cutoffLen, setCutoffLen] = useState(1024)
  const [maxSamples, setMaxSamples] = useState(100000)
  const [batchSize, setBatchSize] = useState(2)
  const [predict, setPredict] = useState(true)
  
  const [maxNewTokens, setMaxNewTokens] = useState(512)
  const [temperature, setTemperature] = useState(0.95)
  const [topP, setTopP] = useState(0.7)
  
  const [outputDir, setOutputDir] = useState('')
  const [previewCommand, setPreviewCommand] = useState('')

  const getConfig = () => ({
    model_name_or_path: modelPath,
    template,
    finetuning_type: finetuningType,
    checkpoint_dir: checkpointPath || undefined,
    dataset,
    dataset_dir: datasetDir,
    cutoff_len: cutoffLen,
    max_samples: maxSamples,
    batch_size: batchSize,
    predict,
    max_new_tokens: maxNewTokens,
    temperature,
    top_p: topP,
    output_dir: outputDir || undefined,
  })

  const handlePreview = async () => {
    try {
      const response = await api.evaluate.preview(getConfig()) as { command: string, config: any }
      setPreviewCommand(response.command)
      setPreviewConfig(response.config)
      setShowPreviewModal(true)
    } catch (error) {
      console.error('Preview failed:', error)
    }
  }

  const fetchOutputResults = async () => {
    const evalDir = evalOutputDir || outputDir || ''
    if (!evalDir) return
    try {
      const response = await fetch(`http://localhost:8000/api/evaluate/results/${evalDir}`)
      if (response.ok) {
        const data = await response.json()
        setOutputResults(data)
        setShowOutputStatsModal(true)
      }
    } catch (error) {
      console.error('Failed to fetch results:', error)
    }
  }

  const pollStatus = useCallback(async () => {
    if (!runId || !isRunning) return
    
    try {
      const statusResponse = await api.evaluate.getStatus(runId) as any
      setProgress(statusResponse.progress)
      
      if (statusResponse.results) {
        setResults(statusResponse.results)
      }
      
      // Track the output dir for results fetching
      if (statusResponse.output_dir) {
        setEvalOutputDir(statusResponse.output_dir)
      }
      
      const logsResponse = await api.evaluate.getLogs(runId)
      if (logsResponse.logs.length > 0) {
        setLogs(prev => [...prev, ...logsResponse.logs.slice(-20)])
      }
      
      if (statusResponse.status === 'completed' || statusResponse.status === 'stopped' || statusResponse.status === 'failed') {
        setIsRunning(false)
        if (statusResponse.status === 'completed') {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Evaluation completed!`])
          setIsCompleted(true)
          setIsFailed(false)
          
          // Fetch detailed evaluation results
          fetchOutputResults()
        } else if (statusResponse.status === 'failed') {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Evaluation failed!`])
          setIsFailed(true)
          setIsCompleted(false)
        }
      }
    } catch (error) {
      console.error('Status poll failed:', error)
    }
  }, [runId, isRunning, evalOutputDir, outputDir])

  useEffect(() => {
    if (!isRunning || !runId) return
    
    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [isRunning, runId, pollStatus])

  const handleStart = async () => {
    if (!modelPath) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: Model path is required`])
      return
    }
    
    setIsRunning(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting evaluation...`])
    setProgress(0)
    setResults({})
    
    try {
      const response = await api.evaluate.start(getConfig())
      
      if (response.success && response.run_id) {
        setRunId(response.run_id)
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Evaluation started: ${response.run_id}`])
      } else {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${response.error || 'Failed to start'}`])
        setIsRunning(false)
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${error.message}`])
      setIsRunning(false)
    }
  }

  const handleStop = async () => {
    if (!runId) return
    
    try {
      await api.evaluate.stop(runId)
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Evaluation stopped`])
    } catch (error) {
      console.error('Stop failed:', error)
    }
    setIsRunning(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <LineChart className="w-6 h-6 text-primary" />
            Evaluation
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Evaluate model performance with benchmarks</p>
        </div>
        <Badge variant={isRunning ? 'default' : 'secondary'} className={cn(
          "transition-all shrink-0",
          isRunning ? 'bg-neon-amber text-white animate-pulse' : ''
        )}>
          {isRunning ? '● Running' : 'Ready'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Settings</CardTitle>
            <CardDescription>Select model to evaluate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Model Path</label>
                  <InfoTooltip content="The base model you wish to evaluate for performance." impact="Required to load the architecture and initial weights." />
                </div>
                <Link to="/models" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Browse <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <Input 
                value={modelPath} 
                onChange={(e) => setModelPath(e.target.value)}
                placeholder="meta-llama/Llama-3.1-8B-Instruct"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Checkpoint Path</label>
                <InfoTooltip content="Optional adapter checkpoint for evaluation." impact="Allows testing of your specific fine-tuned adjustments." />
              </div>
              <Input 
                value={checkpointPath} 
                onChange={(e) => setCheckpointPath(e.target.value)}
                placeholder="Path to adapter checkpoint"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Fine-tuning Type</label>
                <InfoTooltip content="Common methods like LoRA, Full Parameter, or Freeze." impact="Matches the loading strategy used during training." />
              </div>
              <Select value={finetuningType} onValueChange={setFinetuningType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lora">LoRA</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="freeze">Freeze</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Template</label>
                <InfoTooltip content="The conversation format for the specific model architecture." impact="Ensures prompts are structured correctly for the model to understand." />
              </div>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="llama3">Llama 3</SelectItem>
                  <SelectItem value="qwen">Qwen</SelectItem>
                  <SelectItem value="chatglm3">ChatGLM3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dataset Settings</CardTitle>
            <CardDescription>Configure evaluation dataset</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Dataset Directory</label>
                <InfoTooltip content="Folder containing your benchmark data files." impact="Required for the tool to locate and load evaluation samples." />
              </div>
              <Input 
                value={datasetDir} 
                onChange={(e) => setDatasetDir(e.target.value)}
                placeholder="data"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Dataset</label>
                <InfoTooltip content="Select the dataset used for training or evaluation." impact="Must match the dataset defined in dataset_info.json" />
              </div>
              <div className="flex gap-2">
                {loadingDatasets ? (
                  <div className="flex-1 flex items-center gap-2 text-muted-foreground text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading datasets...
                  </div>
                ) : (
                  <Select value={dataset} onValueChange={setDataset}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {availableDatasets.map(d => (
                        <SelectItem key={d.path} value={d.path}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" size="icon" onClick={() => setShowBrowser(true)} title="Browse & auto-configure dataset">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <Input 
                value={dataset} 
                onChange={(e) => setDataset(e.target.value)}
                placeholder="Or enter dataset name: my_dataset, alpaca"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground">Dataset name from dataset_info.json, or click Browse to add a new one</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Cutoff Length: <span className="text-primary tabular-nums">{cutoffLen}</span></label>
                <InfoTooltip content="Maximum number of tokens per evaluation example." impact="Higher values test long-context reasoning but require more VRAM." />
              </div>
              <Slider 
                value={[cutoffLen]} 
                min={4} max={16384} step={4}
                onValueChange={([v]) => setCutoffLen(v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Max Samples</label>
                <InfoTooltip content="Number of examples to evaluate from the dataset." impact="Fewer is faster; more gives a more statistically significant score." />
              </div>
              <Input 
                type="number"
                value={maxSamples} 
                onChange={(e) => setMaxSamples(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Batch Size: <span className="text-primary tabular-nums">{batchSize}</span></label>
                <InfoTooltip content="Number of samples evaluated in parallel." impact="Higher speeds up evaluation but consumes more graphics memory." />
              </div>
              <Slider 
                value={[batchSize]} 
                min={1} max={64} step={1}
                onValueChange={([v]) => setBatchSize(v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center">
                <span className="text-sm">Run Predictions</span>
                <InfoTooltip content="Generates text outputs for each evaluation sample." impact="Necessary for qualitative review of model responses alongside benchmark scores." />
              </div>
              <Switch checked={predict} onCheckedChange={setPredict} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generation Settings</CardTitle>
            <CardDescription>Parameters for generation during evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Max New Tokens: <span className="text-primary tabular-nums">{maxNewTokens}</span></label>
                <InfoTooltip content="Limit on the length of the AI's generated response." impact="Prevents infinite generation and keeps evaluation times predictable." />
              </div>
              <Slider 
                value={[maxNewTokens]} 
                min={8} max={4096} step={8}
                onValueChange={([v]) => setMaxNewTokens(v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Temperature: <span className="text-primary tabular-nums">{temperature.toFixed(2)}</span></label>
                <InfoTooltip content="Controls the randomness of the model's output." impact="Lower values (e.g. 0.1) are better for logical benchmarks; higher (0.9) for creativity." />
              </div>
              <Slider 
                value={[temperature * 100]} 
                min={1} max={150} step={1}
                onValueChange={([v]) => setTemperature(v / 100)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Top-P: <span className="text-primary tabular-nums">{topP.toFixed(2)}</span></label>
                <InfoTooltip content="Nucleus sampling threshold for token selection." impact="Filters out low-probability tokens to maintain response quality." />
              </div>
              <Slider 
                value={[topP * 100]} 
                min={1} max={100} step={1}
                onValueChange={([v]) => setTopP(v / 100)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Output Settings</CardTitle>
            <CardDescription>Configure evaluation output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Output Directory</label>
                <InfoTooltip content="Where the benchmark results (scores, logs) are saved." impact="Enables you to review and compare performance later." />
              </div>
              <Input 
                value={outputDir} 
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="output/eval_results"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Command Preview</label>
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 font-mono text-xs">
                {previewCommand || 'Click Preview to see command'}
              </div>
            </div>

            <div className="flex items-center gap-1 group">
              <Button variant="outline" className="w-full" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" /> Preview Config
              </Button>
              <InfoTooltip content="Shows the full evaluation configuration and command." impact="Allows manual verification of all flags and paths before execution." />
            </div>

            <div className="flex items-center gap-1 group mt-2">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => navigate('/export', { 
                  state: { 
                    modelPath, 
                    finetuningType, 
                    checkpointPath, 
                    template,
                    outputDir: evalOutputDir || outputDir
                  } 
                })}
              >
                <Download className="w-4 h-4" /> Export Results <ArrowRight className="w-4 h-4" />
              </Button>
              <InfoTooltip content="Proceed to the Export module to save or merge your model results." impact="Connects the evaluation workflow to final deployment steps." />
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluation Results</CardTitle>
            <CardDescription>Metrics computed during evaluation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground truncate">{key}</p>
                  <p className="text-2xl font-bold text-primary">{(value * 100).toFixed(2)}%</p>
                </div>
              ))}
            </div>
            
            {/* Additional metrics from evaluation files */}
            {Object.keys(evalMetrics).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Detailed Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(evalMetrics)
                    .filter(([k]) => !k.startsWith('total_') && !k.startsWith('epoch'))
                    .slice(0, 12)
                    .map(([key, value]) => (
                      <div key={key} className="p-2 bg-muted/20 rounded border border-border/30">
                        <p className="text-xs text-muted-foreground truncate">{key}</p>
                        <p className="text-lg font-semibold text-primary">
                          {typeof value === 'number' 
                            ? (value < 1 && value > 0 ? `${(value * 100).toFixed(1)}%` : value.toFixed(4))
                            : value}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* Evaluation metrics chart */}
            {Object.keys(evalMetrics).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Metrics Chart</h4>
                <EvalMetricsChart metrics={evalMetrics} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chat with Model button - appears immediately after evaluation completes */}
      {isCompleted && !isRunning && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Chat with Fine-tuned Model
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Load your trained model and start chatting with it.
                </p>
              </div>
              <Button 
                onClick={() => {
                  // Navigate to chat page with model info
                  navigate('/chat', { 
                    state: { 
                      modelPath: lastTrainingResult?.modelPath,
                      checkpointPath: lastTrainingResult?.checkpointPath,
                      template: lastTrainingResult?.template || template,
                      finetuningType: lastTrainingResult?.finetuningType || finetuningType,
                    }
                  })
                }}
                className="shrink-0"
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Chat with Model
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" /> Actions
            </CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
              {(isCompleted || isFailed) && (
                <Button variant="outline" size="sm" onClick={fetchOutputResults}>
                  <Activity className="w-4 h-4 mr-2" /> Output Stats
                </Button>
              )}
              {isRunning ? (
                <div className="flex items-center gap-1 group w-full sm:w-auto">
                  <Button variant="destructive" size="sm" onClick={handleStop} className="w-full sm:w-auto">
                    <Square className="w-4 h-4 mr-2" /> Stop
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group w-full sm:w-auto">
                  <Button 
                    onClick={handleStart} 
                    className="w-full sm:w-auto" 
                    disabled={!modelPath}
                    variant={isCompleted ? "success" : isFailed ? "destructive" : "default"}
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" /> {isCompleted ? 'Restart Evaluation' : isFailed ? 'Retry Evaluation' : 'Start Evaluation'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isRunning && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <div className="flex items-center">
                  <span>Progress</span>
                  <InfoTooltip content="Real-time completion percentage of the evaluation job." impact="Helps monitor status and estimate time to results." />
                </div>
                <span className="text-primary font-medium tabular-nums">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" variant="green" />
            </div>
          )}

          {/* Evaluation Metrics Chart - shown after results are available */}
          {(Object.keys(results).length > 0 || Object.keys(evalMetrics).length > 0) && (
            <div className="mb-4 p-3 bg-card rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <LineChart className="w-4 h-4 mr-2 text-neon-cyan" />
                  <span className="text-sm font-medium">Evaluation Metrics</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Object.keys({...results, ...evalMetrics}).length} metrics
                </span>
              </div>
              <EvalMetricsChart metrics={{...results, ...evalMetrics}} />
            </div>
          )}
          <div className="min-h-[192px] p-3 bg-muted/30 rounded-lg border border-border/50 font-mono text-xs max-h-[300px] overflow-y-auto shadow-inner">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Evaluation logs will appear here...</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className="whitespace-pre-wrap">{log}</p>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Evaluation Configuration Preview
            </DialogTitle>
            <DialogDescription>
              Review the parameters and command before starting the evaluation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Bot className="w-4 h-4" /> Parameters
              </h3>
              <ScrollArea className="h-[300px] rounded-md border border-primary/10 bg-muted/20 p-4">
                <div className="space-y-2">
                  {previewConfig && Object.entries(previewConfig).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4 text-xs border-b border-primary/5 pb-1">
                      <span className="text-muted-foreground font-mono">{key}</span>
                      <span className="text-foreground font-medium text-right break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <LineChart className="w-4 h-4" /> Command Preview
              </h3>
              <div className="h-[300px] rounded-md border border-primary/10 bg-black/40 p-4 font-mono text-[10px] text-green-400 overflow-y-auto whitespace-pre-wrap break-all shadow-inner">
                {previewCommand}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button onClick={() => setShowPreviewModal(false)}>Close Preview</Button>
            <Button variant="success" onClick={() => { setShowPreviewModal(false); handleStart(); }}>
              <Play className="w-4 h-4 mr-2" /> Start Evaluation Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Output Stats Modal */}
      <Dialog open={showOutputStatsModal} onOpenChange={setShowOutputStatsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-neon-green">
              <LineChart className="w-5 h-5" /> Evaluation Output Statistics
            </DialogTitle>
            <DialogDescription>
              Benchmark scores and metrics from the completed evaluation run.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[450px] mt-4 pr-4">
            {outputResults && outputResults.found ? (() => {
              // Consolidate all metrics from different files into one unique set
              const allMetrics = Object.entries(outputResults).reduce((acc, [fileName, data]) => {
                if (['found', 'metrics', 'eval_history'].includes(fileName) || typeof data !== 'object') return acc;
                return { ...acc, ...data };
              }, {} as Record<string, any>);

              // Determine groups based on metric types
              const accuracyKeys = Object.keys(allMetrics).filter(k => k.includes('bleu') || k.includes('rouge') || k.includes('accuracy') || k.includes('score'));
              const efficiencyKeys = Object.keys(allMetrics).filter(k => k.includes('runtime') || k.includes('per_second') || k.includes('flos'));
              const otherKeys = Object.keys(allMetrics).filter(k => !accuracyKeys.includes(k) && !efficiencyKeys.includes(k));

              const groups = [
                { title: 'Goal & Benchmarks', keys: accuracyKeys, color: 'text-neon-cyan' },
                { title: 'Efficiency Stats', keys: efficiencyKeys, color: 'text-primary' },
                { title: 'Configuration Details', keys: otherKeys, color: 'text-foreground' }
              ].filter(g => g.keys.length > 0);

              return (
                <div className="space-y-6">
                  {groups.map((group, idx) => (
                    <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-1 w-6 bg-primary/30 rounded-full" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                          {group.title}
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {group.keys.map((key) => {
                          const value = allMetrics[key];
                          return (
                            <Card key={key} className="bg-muted/10 border-primary/5 hover:border-primary/20 transition-colors overflow-hidden group">
                              <CardContent className="p-3 relative">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:bg-primary/10 transition-colors" />
                                <p className="text-[10px] text-muted-foreground font-mono uppercase truncate relative z-10" title={key}>{key.replace('predict_', '').replace('eval_', '').replace(/_/g, ' ')}</p>
                                <p className={cn(
                                  "text-lg font-black tabular-nums relative z-10",
                                  group.color
                                )}>
                                  {typeof value === 'number' 
                                    ? (value > 1000 ? new Intl.NumberFormat().format(Math.round(value)) : value.toFixed(4))
                                    : String(value)}
                                </p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <XCircle className="w-12 h-12 text-destructive mb-4 opacity-20" />
                <p className="text-muted-foreground">No evaluation results found in the directory.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{evalOutputDir || outputDir}</p>
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setShowOutputStatsModal(false)}>Close</Button>
            <Button 
              variant="outline" 
              className="border-primary/40 hover:bg-primary/10"
              onClick={() => {
                setShowOutputStatsModal(false);
                navigate('/export', { 
                  state: { 
                    modelPath, 
                    finetuningType, 
                    checkpointPath, 
                    template,
                    outputDir: evalOutputDir || outputDir
                  } 
                });
              }}
            >
              <Download className="w-4 h-4 mr-2 text-primary" /> Export Result
            </Button>
            <Button variant="default" onClick={() => navigate('/chat', {
              state: {
                modelPath,
                checkpointPath,
                template,
                finetuningType
              }
            })}>
              <MessageSquare className="w-4 h-4 mr-2" /> Go to Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showBrowser && (
        <DatasetBrowser
          onSelect={(name, dir) => {
            setDataset(name)
            if (dir) setDatasetDir(dir)
            setShowBrowser(false)
            queryClient.invalidateQueries({ queryKey: ['models', 'datasets'] })
          }}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  )
}

