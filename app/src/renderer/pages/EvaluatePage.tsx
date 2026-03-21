import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { api } from '@/hooks/useApi'
import { Play, Square, Eye, CheckSquare } from 'lucide-react'

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Evaluation</h2>
          <p className="text-sm text-muted-foreground">Evaluate model performance with benchmarks</p>
        </div>
        <Badge variant={isRunning ? 'warning' : 'secondary'}>
          {isRunning ? 'Running' : 'Ready'}
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
              <label className="text-sm font-medium">Model Path</label>
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
              <label className="text-sm font-medium">Cutoff Length: {cutoffLen}</label>
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
              <label className="text-sm font-medium">Batch Size: {batchSize}</label>
              <Slider 
                value={[batchSize]} 
                min={1} max={64} step={1}
                onValueChange={([v]) => setBatchSize(v)}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={predict}
                onChange={(e) => setPredict(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Run Predictions</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generation Settings</CardTitle>
            <CardDescription>Parameters for generation during evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max New Tokens: {maxNewTokens}</label>
              <Slider 
                value={[maxNewTokens]} 
                min={8} max={4096} step={8}
                onValueChange={([v]) => setMaxNewTokens(v)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature: {temperature.toFixed(2)}</label>
              <Slider 
                value={[temperature * 100]} 
                min={1} max={150} step={1}
                onValueChange={([v]) => setTemperature(v / 100)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Top-P: {topP.toFixed(2)}</label>
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
              <div className="p-3 bg-muted rounded-lg font-mono text-xs">
                {commandPreview || 'Click Preview to see command'}
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-2" /> Preview Command
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Actions</CardTitle>
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
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          <div className="h-48 overflow-auto p-3 bg-muted/50 rounded-lg font-mono text-xs">
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
