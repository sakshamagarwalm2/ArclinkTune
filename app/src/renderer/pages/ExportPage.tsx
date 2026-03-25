import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Download, Bot, ArrowRight, RefreshCw, Square, FolderOpen, Search, Eye, Rocket, CheckCircle2, XCircle } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { api, Model } from '@/hooks/useApi'
import { useApp } from '@/contexts/AppContext'
import { FolderBrowser } from '@/components/FolderBrowser'

import { cn } from '@/lib/utils'

const QUANT_BITS = ['none', '8', '4', '3', '2']
const EXPORT_DEVICES = [
  { value: 'cpu', label: 'CPU' },
  { value: 'auto', label: 'Auto (CUDA if available)' },
]

export function ExportPage() {
  const { selectedModel, setSelectedModel } = useApp()
  const location = useLocation()
  const queryClient = useQueryClient()
  
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [stage, setStage] = useState('')
  
  const [modelPath, setModelPath] = useState('')
  const [finetuningType, setFinetuningType] = useState('lora')
  const [checkpointPath, setCheckpointPath] = useState('')
  const [template, setTemplate] = useState('default')
  
  const [exportDir, setExportDir] = useState('')
  const [exportSize, setExportSize] = useState(5)
  const [exportQuantBit, setExportQuantBit] = useState('none')
  const [exportQuantDataset, setExportQuantDataset] = useState('data/c4_demo.jsonl')
  const [exportDevice, setExportDevice] = useState('auto')
  const [exportLegacyFormat, setExportLegacyFormat] = useState(false)
  
  const [exportHubModelId, setExportHubModelId] = useState('')
  const [hubPrivateRepo, setHubPrivateRepo] = useState(false)
  const [extraArgs, setExtraArgs] = useState('')
  const [commandPreview, setCommandPreview] = useState('')
  const [showBrowser, setShowBrowser] = useState(false)
  const [browserTarget, setBrowserTarget] = useState<'export' | 'checkpoint'>('export')

  const { data: models = [], isLoading: loadingModels } = useQuery<Model[]>({
    queryKey: ['models', 'export'],
    queryFn: () => api.models.getFlat(),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (location.state) {
      const state = location.state as any
      if (state.modelPath) setModelPath(state.modelPath)
      if (state.finetuningType) setFinetuningType(state.finetuningType)
      if (state.checkpointPath) setCheckpointPath(state.checkpointPath)
      if (state.template) setTemplate(state.template)
      if (state.outputDir && !exportDir) {
        // If coming from training, suggest an export dir
        setExportDir(`${state.outputDir}_exported`)
      }
    } else if (selectedModel && selectedModel.path) {
      setModelPath(selectedModel.path)
      if (selectedModel.template) setTemplate(selectedModel.template)
    }
  }, [location.state, selectedModel])

  const handleModelSelect = (path: string) => {
    const model = models.find(m => m.path === path)
    if (model) {
      setModelPath(path)
      setTemplate(model.template || 'default')
      setSelectedModel({
        name: model.name,
        path: model.path,
        template: model.template,
      })
    }
  }

  const getConfig = () => ({
    model_name_or_path: modelPath,
    adapter_name_or_path: checkpointPath || undefined,
    export_dir: exportDir,
    finetuning_type: finetuningType,
    template: template,
    export_size: exportSize,
    export_quant_bit: exportQuantBit !== 'none' ? parseInt(exportQuantBit) : undefined,
    export_quantization_dataset: exportQuantBit !== 'none' ? exportQuantDataset : undefined,
    export_device: exportDevice,
    export_legacy_format: exportLegacyFormat,
    export_hub_model_id: exportHubModelId || undefined,
    extra_args: extraArgs ? JSON.parse(extraArgs) : undefined,
  })

  const handlePreview = async () => {
    try {
      const response = await api.export.preview(getConfig())
      setCommandPreview(response.command)
    } catch (error) {
      console.error('Preview failed:', error)
    }
  }

  const pollStatus = useCallback(async () => {
    if (!runId || !isExporting) return
    
    try {
      const status = await api.export.getStatus(runId)
      setProgress(status.progress)
      setStage(status.stage || '')
      
      const logsResponse = await api.export.getLogs(runId)
      if (logsResponse.logs.length > 0) {
        setLogs(prev => [...prev, ...logsResponse.logs.slice(-20)])
      }
      
      if (status.status === 'completed' || status.status === 'stopped') {
        setIsExporting(false)
        if (status.status === 'completed') {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Export completed!`])
        }
      }
    } catch (error) {
      console.error('Status poll failed:', error)
    }
  }, [runId, isExporting])

  useEffect(() => {
    if (!isExporting || !runId) return
    
    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [isExporting, runId, pollStatus])

  const handleExport = async () => {
    if (!modelPath) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: Model path is required`])
      return
    }
    if (!exportDir) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: Export directory is required`])
      return
    }
    
    setIsExporting(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting export...`])
    setProgress(0)
    setStage('')
    
    try {
      const response = await api.export.start(getConfig())
      
      if (response.success && response.run_id) {
        setRunId(response.run_id)
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Export started: ${response.run_id}`])
      } else {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${response.error || 'Failed to start'}`])
        setIsExporting(false)
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${error.message}`])
      setIsExporting(false)
    }
  }

  const handleStop = async () => {
    if (!runId) return
    
    try {
      await api.export.stop(runId)
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Export stopped`])
    } catch (error) {
      console.error('Stop failed:', error)
    }
    setIsExporting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Download className="w-6 h-6 text-primary" />
            Export Model
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Export trained models for deployment</p>
        </div>
        <Badge variant={isExporting ? 'default' : 'secondary'} className={cn(
          "transition-all shrink-0",
          isExporting ? 'bg-neon-amber text-white animate-pulse' : ''
        )}>
          {isExporting ? '● Exporting' : 'Ready'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Model</CardTitle>
            <CardDescription>Select model to export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Model</label>
                  <InfoTooltip content="The base model that you wish to export or merge." impact="Loads the baseline weights before applying any checkpoints." />
                </div>
                <Link to="/models" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Browse <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {loadingModels ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading models...
                </div>
              ) : (
                <Select value={modelPath} onValueChange={handleModelSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {models.slice(0, 100).map(model => (
                      <SelectItem key={model.path} value={model.path}>
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <span>{model.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input 
                value={modelPath} 
                onChange={(e) => setModelPath(e.target.value)}
                placeholder="Or enter custom path: meta-llama/Llama-3.1-8B-Instruct"
                className="mt-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Checkpoint Path</label>
                  <InfoTooltip content="The adapter checkpoint to merge into the base model." impact="Fuses your training results into a single, deployable model file." />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] gap-1 hover:text-primary"
                  onClick={() => {
                    setBrowserTarget('checkpoint')
                    setShowBrowser(true)
                  }}
                >
                  <Search className="w-3 h-3" /> Browse
                </Button>
              </div>
              <Input 
                value={checkpointPath} 
                onChange={(e) => setCheckpointPath(e.target.value)}
                placeholder="output/my_model"
              />
              <p className="text-xs text-muted-foreground">Path to trained adapter checkpoint</p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export Settings</CardTitle>
            <CardDescription>Configure export parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Export Directory</label>
                  <InfoTooltip content="Destination folder for the final exported model." impact="Creates a new directory with merged weights and configuration." />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] gap-1 hover:text-primary"
                  onClick={() => {
                    setBrowserTarget('export')
                    setShowBrowser(true)
                  }}
                >
                  <Search className="w-3 h-3" /> Browse
                </Button>
              </div>
              <Input 
                value={exportDir} 
                onChange={(e) => setExportDir(e.target.value)}
                placeholder="exported_model"
              />
              <p className="text-[10px] text-muted-foreground">Select or enter destination path</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Shard Size: <span className="text-primary tabular-nums">{exportSize}GB</span></label>
                <InfoTooltip content="Maximum size per individual weight shard file." impact="Splits large models into smaller parts for easier storage/loading." />
              </div>
              <Slider 
                value={[exportSize]} 
                min={1} max={20} step={1}
                onValueChange={([v]) => setExportSize(v)}
              />
              <p className="text-xs text-muted-foreground">Maximum size per shard</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Export Device</label>
                <InfoTooltip content="The hardware used to perform the model merge/quantization." impact="'Auto' will use CUDA if available, which is significantly faster than CPU." />
              </div>
              <Select value={exportDevice} onValueChange={setExportDevice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_DEVICES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center">
                <span className="text-sm">Use Legacy Format (.bin)</span>
                <InfoTooltip content="Exports weights in the older torch .bin format instead of safetensors." impact="Only necessary for compatibility with older inference engines." />
              </div>
              <Switch
                checked={exportLegacyFormat}
                onCheckedChange={setExportLegacyFormat}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quantization Settings</CardTitle>
            <CardDescription>Export with quantization for smaller models</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Quantization Bit</label>
                <InfoTooltip content="Target bit-depth for model weights (e.g. 8-bit, 4-bit)." impact="Dramatically reduces model size and VRAM usage on deploy." />
              </div>
              <Select value={exportQuantBit} onValueChange={setExportQuantBit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUANT_BITS.map(b => (
                    <SelectItem key={b} value={b}>{b === 'none' ? 'None' : `${b}-bit`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {exportQuantBit !== 'none' && (
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Calibration Dataset</label>
                  <InfoTooltip content="Small dataset used to optimize weights during quantization." impact="Helps maintain model accuracy when compressing to 4-bit or 8-bit." />
                </div>
                <Input 
                  value={exportQuantDataset} 
                  onChange={(e) => setExportQuantDataset(e.target.value)}
                  placeholder="data/c4_demo.jsonl"
                />
                <p className="text-xs text-muted-foreground">Dataset for quantization calibration</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">HuggingFace Hub</CardTitle>
            <CardDescription>Upload to HuggingFace Hub (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Hub Model ID</label>
                <InfoTooltip content="Your HuggingFace repository name (e.g. 'username/my-model')." impact="Required to push your trained model to the community or private cloud storage." />
              </div>
              <Input 
                value={exportHubModelId} 
                onChange={(e) => setExportHubModelId(e.target.value)}
                placeholder="username/my-model"
              />
              <p className="text-xs text-muted-foreground">Leave empty to only export locally</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center">
                <span className="text-sm">Make Repository Private</span>
                <InfoTooltip content="Toggles the visibility restricted mode on HuggingFace." impact="Prevents public access to your fine-tuned weights." />
              </div>
              <Switch
                checked={hubPrivateRepo}
                onCheckedChange={setHubPrivateRepo}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="text-sm font-medium">Extra Arguments (JSON)</label>
                <InfoTooltip content="Additional advanced CLI parameters in JSON format." impact="Allows for fine-grained control over the export process for power users." />
              </div>
              <Input 
                value={extraArgs} 
                onChange={(e) => setExtraArgs(e.target.value)}
                placeholder='{"use_fast": false}'
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Export Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-xs font-medium mb-1 text-muted-foreground">Command Preview:</p>
            <code className="text-xs break-all font-mono">{commandPreview || 'Click Preview to see command'}</code>
          </div>

          {isExporting && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <div className="flex items-center">
                  <span>Export Progress {stage && `(${stage})`}</span>
                  <InfoTooltip content="Status of the merging and file writing process." impact="Provides feedback during high-disk-activity operations." />
                </div>
                <span className="text-primary font-medium tabular-nums">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" variant="cyan" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
              Preview Command
            </Button>
            
            {isExporting ? (
              <Button variant="destructive" onClick={handleStop} className="w-full sm:w-auto">
                <Square className="w-4 h-4 mr-2" /> Stop Export
              </Button>
            ) : (
              <Button 
                onClick={handleExport} 
                className="w-full sm:w-auto" 
                disabled={!modelPath || !exportDir}
                variant={progress === 100 ? "success" : "default"}
              >
                <Download className="w-4 h-4 mr-2" /> {progress === 100 ? 'Restart Export' : 'Start Export'}
              </Button>
            )}
          </div>

          <div className="min-h-[128px] p-3 bg-muted/30 rounded-lg border border-border/50 font-mono text-xs max-h-[200px] overflow-y-auto shadow-inner">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Export logs will appear here...</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className="whitespace-pre-wrap">{log}</p>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {showBrowser && (
        <FolderBrowser
          title={browserTarget === 'export' ? "Select Export Directory" : "Select Checkpoint Folder"}
          onSelect={(path) => {
            if (browserTarget === 'export') {
              setExportDir(path)
            } else {
              setCheckpointPath(path)
            }
            setShowBrowser(false)
          }}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  )
}


