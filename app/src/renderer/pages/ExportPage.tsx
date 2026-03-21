import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Download, FolderOpen, Eye } from 'lucide-react'

const QUANT_BITS = ['none', '8', '4', '3', '2']
const EXPORT_DEVICES = [
  { value: 'cpu', label: 'CPU' },
  { value: 'auto', label: 'Auto (CUDA if available)' },
]

export function ExportPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  
  const [modelPath, setModelPath] = useState('')
  const [finetuningType, setFinetuningType] = useState('lora')
  const [checkpointPath, setCheckpointPath] = useState('')
  
  const [exportDir, setExportDir] = useState('')
  const [exportSize, setExportSize] = useState(5)
  const [exportQuantBit, setExportQuantBit] = useState('none')
  const [exportQuantDataset, setExportQuantDataset] = useState('data/c4_demo.jsonl')
  const [exportDevice, setExportDevice] = useState('auto')
  const [exportLegacyFormat, setExportLegacyFormat] = useState(false)
  
  const [exportHubModelId, setExportHubModelId] = useState('')
  const [hubPrivateRepo, setHubPrivateRepo] = useState(false)
  const [extraArgs, setExtraArgs] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting export...`])
    
    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 15
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setIsExporting(false)
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Export completed!`])
      }
      setProgress(p)
    }, 300)
  }

  const commandPreview = `llamafactory-cli export ${modelPath ? `--model_name_or_path ${modelPath}` : ''} ${checkpointPath ? `--checkpoint_dir ${checkpointPath}` : ''} ${exportDir ? `--export_dir ${exportDir}` : ''}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Export Model</h2>
          <p className="text-sm text-muted-foreground">Export trained models for deployment</p>
        </div>
        <Badge variant={isExporting ? 'warning' : 'secondary'}>
          {isExporting ? 'Exporting' : 'Ready'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Model</CardTitle>
            <CardDescription>Select model to export</CardDescription>
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
                placeholder="output/my_model"
              />
              <p className="text-xs text-muted-foreground">Path to trained adapter checkpoint</p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export Settings</CardTitle>
            <CardDescription>Configure export parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Directory</label>
              <Input 
                value={exportDir} 
                onChange={(e) => setExportDir(e.target.value)}
                placeholder="exported_model"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Shard Size: {exportSize}GB</label>
              <Slider 
                value={[exportSize]} 
                min={1} max={20} step={1}
                onValueChange={([v]) => setExportSize(v)}
              />
              <p className="text-xs text-muted-foreground">Maximum size per shard</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Export Device</label>
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

            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={exportLegacyFormat}
                onChange={(e) => setExportLegacyFormat(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Use Legacy Format (.bin)</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quantization Settings</CardTitle>
            <CardDescription>Export with quantization for smaller models</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantization Bit</label>
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
                <label className="text-sm font-medium">Calibration Dataset</label>
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
              <label className="text-sm font-medium">Hub Model ID</label>
              <Input 
                value={exportHubModelId} 
                onChange={(e) => setExportHubModelId(e.target.value)}
                placeholder="username/my-model"
              />
              <p className="text-xs text-muted-foreground">Leave empty to only export locally</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={hubPrivateRepo}
                onChange={(e) => setHubPrivateRepo(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Make Repository Private</span>
            </label>

            <div className="space-y-2">
              <label className="text-sm font-medium">Extra Arguments (JSON)</label>
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
            <Download className="w-4 h-4" /> Export Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs font-medium mb-1">Command Preview:</p>
            <code className="text-xs break-all text-muted-foreground">{commandPreview}</code>
          </div>

          {isExporting && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Export Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLogs([])}>
              Clear Logs
            </Button>
            <Button className="flex-1" onClick={handleExport} disabled={isExporting || !exportDir}>
              <Download className="w-4 h-4 mr-2" /> 
              {isExporting ? 'Exporting...' : 'Start Export'}
            </Button>
          </div>

          <div className="h-32 overflow-auto p-3 bg-muted/50 rounded-lg font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Export logs will appear here...</p>
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
