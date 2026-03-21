import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Play, Square, Eye, LineChart, Bot, Download, ArrowRight } from 'lucide-react'

export function EvaluatePage() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  
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
  const [commandPreview, setCommandPreview] = useState('')

  const handlePreview = async () => {
    setCommandPreview(`llamafactory-cli eval --model_name_or_path ${modelPath || '<model>'} --template ${template}`)
  }

  const handleStart = async () => {
    setIsRunning(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting evaluation...`])
    
    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 10
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setIsRunning(false)
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Evaluation completed!`])
      }
      setProgress(p)
    }, 500)
  }

  const handleStop = () => {
    setIsRunning(false)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Evaluation stopped`])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LineChart className="w-6 h-6 text-primary" />
            Evaluation
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Evaluate model performance with benchmarks</p>
        </div>
        <Badge variant={isRunning ? 'default' : 'secondary'} className={isRunning ? 'bg-neon-amber text-white animate-pulse' : ''}>
          {isRunning ? '● Running' : 'Ready'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Settings</CardTitle>
            <CardDescription>Select model to evaluate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Model Path</label>
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
              <label className="text-sm font-medium">Checkpoint Path</label>
              <Input 
                value={checkpointPath} 
                onChange={(e) => setCheckpointPath(e.target.value)}
                placeholder="Path to adapter checkpoint"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fine-tuning Type</label>
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
              <label className="text-sm font-medium">Template</label>
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
              <label className="text-sm font-medium">Dataset Directory</label>
              <Input 
                value={datasetDir} 
                onChange={(e) => setDatasetDir(e.target.value)}
                placeholder="data"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dataset</label>
              <Input 
                value={dataset} 
                onChange={(e) => setDataset(e.target.value)}
                placeholder="mmlu, ceval, math"
              />
              <p className="text-xs text-muted-foreground">Comma-separated benchmark names</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cutoff Length: <span className="text-primary tabular-nums">{cutoffLen}</span></label>
              <Slider 
                value={[cutoffLen]} 
                min={4} max={16384} step={4}
                onValueChange={([v]) => setCutoffLen(v)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Samples</label>
              <Input 
                type="number"
                value={maxSamples} 
                onChange={(e) => setMaxSamples(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Batch Size: <span className="text-primary tabular-nums">{batchSize}</span></label>
              <Slider 
                value={[batchSize]} 
                min={1} max={64} step={1}
                onValueChange={([v]) => setBatchSize(v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <span className="text-sm">Run Predictions</span>
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
              <label className="text-sm font-medium">Max New Tokens: <span className="text-primary tabular-nums">{maxNewTokens}</span></label>
              <Slider 
                value={[maxNewTokens]} 
                min={8} max={4096} step={8}
                onValueChange={([v]) => setMaxNewTokens(v)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature: <span className="text-primary tabular-nums">{temperature.toFixed(2)}</span></label>
              <Slider 
                value={[temperature * 100]} 
                min={1} max={150} step={1}
                onValueChange={([v]) => setTemperature(v / 100)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Top-P: <span className="text-primary tabular-nums">{topP.toFixed(2)}</span></label>
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
              <label className="text-sm font-medium">Output Directory</label>
              <Input 
                value={outputDir} 
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="output/eval_results"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Command Preview</label>
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 font-mono text-xs">
                {commandPreview || 'Click Preview to see command'}
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-2" /> Preview Command
            </Button>

            {/* Interlink */}
            <Link to="/export">
              <Button variant="outline" className="w-full gap-2 mt-2">
                <Download className="w-4 h-4" /> Export Results <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" /> Actions
            </CardTitle>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Button variant="destructive" onClick={handleStop}>
                  <Square className="w-4 h-4 mr-2" /> Stop
                </Button>
              ) : (
                <Button onClick={handleStart}>
                  <Play className="w-4 h-4 mr-2" /> Start Evaluation
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isRunning && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span className="text-primary font-medium tabular-nums">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" variant="green" />
            </div>
          )}
          <div className="h-48 overflow-auto p-3 bg-muted/30 rounded-lg border border-border/50 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Evaluation logs will appear here...</p>
            ) : (
              logs.map((log, i) => (
                <p key={i}>{log}</p>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
