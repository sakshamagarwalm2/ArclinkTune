import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useSystemStats } from '@/hooks/useSystemStats'
import { Monitor, Cpu, MemoryStick, Activity, Thermometer, Pause, Play, Download, Zap, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { GPUStats, GPUHealthResult } from '@/hooks/useApi'
import { api } from '@/hooks/useApi'

// Mock historical data for charts
const generateMockHistory = (baseValue: number, variance: number, length = 30) => {
  return Array.from({ length }, (_, i) => ({
    time: i,
    value: Math.max(0, Math.min(100, baseValue + (Math.random() * variance * 2 - variance)))
  }))
}

function GPUCard({ gpu, isPaused, healthStatus, healthResult }: { gpu: GPUStats; isPaused: boolean; healthStatus: 'idle' | 'testing' | 'success' | 'error'; healthResult: GPUHealthResult | null }) {
  const gpuHistory = useMemo(() => generateMockHistory(gpu.utilization_percent || 10, 5), [gpu.utilization_percent, isPaused])

  return (
    <Card className={`glass-card hover:shadow-neon transition-shadow flex-col md:col-span-2 lg:col-span-1 ${
      healthStatus === 'success' ? 'border-neon-green border-2' :
      healthStatus === 'error' ? 'border-destructive border-2' : 'border-neon-green/30'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-neon-green" />
            </div>
            Graphics (GPU)
            <InfoTooltip content="Graphics Processing Unit utilization." impact="High usage during training or inference indicates GPU is working at capacity." />
          </CardTitle>
          <div className="flex items-center gap-2">
            {healthStatus !== 'idle' && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                healthStatus === 'success' ? 'bg-neon-green/20 text-neon-green' :
                healthStatus === 'error' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'
              }`}>
                {healthStatus === 'success' && <CheckCircle2 className="w-3 h-3" />}
                {healthStatus === 'error' && <XCircle className="w-3 h-3" />}
                {healthStatus === 'testing' && <Activity className="w-3 h-3 animate-pulse" />}
                <span>{healthStatus === 'success' ? 'CUDA Ready' : healthStatus === 'error' ? 'Error' : 'Testing'}</span>
              </div>
            )}
            <span className="text-2xl font-bold tabular-nums text-neon-green">
              {gpu.utilization_percent?.toFixed(1) || 0}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[120px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gpuHistory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <YAxis domain={[0, 100]} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(142, 60%, 45%)' }}
                labelStyle={{ display: 'none' }}
                formatter={(val: number) => [`${val.toFixed(1)}%`, 'Usage']}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(142, 60%, 45%)" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {healthResult && (
          <div className={`p-3 rounded-lg ${
            healthResult.cuda_available ? 'bg-neon-green/10' : 'bg-destructive/10'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {healthResult.cuda_available ? (
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span className={`text-sm font-medium ${
                healthResult.cuda_available ? 'text-neon-green' : 'text-destructive'
              }`}>
                {healthResult.cuda_available ? 'CUDA Available' : 'CUDA Not Available'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {healthResult.gpu_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GPU:</span>
                  <span className="font-medium truncate max-w-[120px]" title={healthResult.gpu_name}>{healthResult.gpu_name}</span>
                </div>
              )}
              {healthResult.cuda_version && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CUDA:</span>
                  <span className="font-medium">{healthResult.cuda_version}</span>
                </div>
              )}
              {healthResult.gpu_compute_capability && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compute:</span>
                  <span className="font-medium">{healthResult.gpu_compute_capability}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tensor Test:</span>
                <span className={healthResult.tensor_test_passed ? 'text-neon-green' : 'text-destructive'}>
                  {healthResult.tensor_test_passed ? 'Passed' : 'Failed'}
                </span>
              </div>
              {healthResult.details.total_memory_gb && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VRAM:</span>
                  <span className="font-medium">{typeof healthResult.details.total_memory_gb === 'number' ? healthResult.details.total_memory_gb.toFixed(1) : healthResult.details.total_memory_gb} GB</span>
                </div>
              )}
            </div>
            
            {(healthResult.venv_pytorch_version || healthResult.venv_cuda_available !== undefined) && (
              <div className="mt-3 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-1.5">LLaMAFactory Environment:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {healthResult.venv_pytorch_version && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PyTorch:</span>
                      <span className="font-medium">{healthResult.venv_pytorch_version}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VEnv CUDA:</span>
                    <span className={healthResult.venv_cuda_available ? 'text-neon-green font-medium' : 'text-destructive font-medium'}>
                      {healthResult.venv_cuda_available ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  {healthResult.venv_cuda_version && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VEnv CUDA Ver:</span>
                      <span className="font-medium">{healthResult.venv_cuda_version}</span>
                    </div>
                  )}
                  {healthResult.details.venv_gpu_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VEnv GPU:</span>
                      <span className="font-medium truncate max-w-[100px]" title={String(healthResult.details.venv_gpu_name)}>
                        {String(healthResult.details.venv_gpu_name)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {healthResult.error && (
              <div className="mt-2 text-xs text-destructive flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{healthResult.error}</span>
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-3 mt-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <div className="flex items-center">
                <span className="text-muted-foreground mr-1">VRAM Usage</span>
                <InfoTooltip content="Video RAM currently in use by the GPU." impact="Running out of VRAM will cause 'Out of Memory' errors during training." />
              </div>
              <span className="font-medium tabular-nums text-neon-green">
                {gpu.memory_used_gb?.toFixed(1) || 0} / {gpu.memory_total_gb?.toFixed(1) || 0} GB
              </span>
            </div>
            <Progress 
              value={(gpu.memory_used_gb / gpu.memory_total_gb) * 100 || 0} 
              className="h-1.5" 
              variant="green"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm pt-1">
            <div>
              <p className="text-muted-foreground text-xs">Model</p>
              <p className="font-medium truncate" title={gpu.name}>{gpu.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-neon-amber" /> Temperature
                <InfoTooltip content="Current core temperature of the GPU." impact="High temperatures can lead to thermal throttling and reduced performance." />
              </p>
              <p className="font-medium tabular-nums">{gpu.temperature_celsius || 0}°C</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function MonitorPage() {
  const [isPaused, setIsPaused] = useState(false)
  const [gpuHealthStatus, setGpuHealthStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [gpuHealthResult, setGpuHealthResult] = useState<GPUHealthResult | null>(null)
  const { stats, error, refresh } = useSystemStats(isPaused ? undefined : 2000)

  const testGpuHealth = async () => {
    setGpuHealthStatus('testing')
    setGpuHealthResult(null)
    try {
      const result = await api.system.getGpuHealth()
      setGpuHealthResult(result)
      setGpuHealthStatus(result.cuda_available && result.tensor_test_passed ? 'success' : 'error')
    } catch (err) {
      setGpuHealthStatus('error')
      setGpuHealthResult({ 
        cuda_available: false, 
        cuda_version: null, 
        gpu_name: null, 
        gpu_count: 0, 
        gpu_compute_capability: null, 
        tensor_test_passed: false, 
        memory_test_passed: false, 
        error: err instanceof Error ? err.message : 'Unknown error', 
        details: {} 
      })
    }
  }

  // Memoize history data to prevent excessive re-renders (in a real app, this would be accumulated state)
  const cpuHistory = useMemo(() => generateMockHistory(stats?.cpu?.utilization_percent || 30, 15), [stats?.cpu?.utilization_percent])
  const ramHistory = useMemo(() => generateMockHistory(stats?.memory?.ram_percent || 45, 2), [stats?.memory?.ram_percent])

  const cpuData = stats?.cpu
  const memData = stats?.memory

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Monitor className="w-6 h-6 text-primary" />
            System Monitor
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Real-time hardware utilization</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPaused(!isPaused)}
            className="flex-1 sm:w-24"
          >
            {isPaused ? <><Play className="w-4 h-4 mr-1" /> Resume</> : <><Pause className="w-4 h-4 mr-1" /> Pause</>}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refresh()}
            className="flex-1 sm:w-auto text-xs md:text-sm"
          >
            <Activity className="w-4 h-4 mr-1 md:mr-2" /> Force Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={testGpuHealth}
            disabled={gpuHealthStatus === 'testing'}
            className={`flex-1 sm:w-auto text-xs md:text-sm ${
              gpuHealthStatus === 'success' ? 'border-neon-green text-neon-green hover:bg-neon-green/10' :
              gpuHealthStatus === 'error' ? 'border-destructive text-destructive hover:bg-destructive/10' : ''
            }`}
          >
            <Zap className={`w-4 h-4 mr-1 md:mr-2 ${gpuHealthStatus === 'testing' ? 'animate-pulse' : ''}`} /> 
            {gpuHealthStatus === 'testing' ? 'Testing...' : 'Test GPU'}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center text-destructive">
            <p className="font-medium">Failed to load system stats</p>
            <p className="text-sm opacity-80 mt-1">{error.message}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* CPU Card */}
          <Card className="glass-card hover:shadow-neon transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-primary" />
                  </div>
                  Processor (CPU)
                  <InfoTooltip content="Central Processing Unit usage across all cores." impact="High CPU usage is normal during data loading or preprocessing." />
                </CardTitle>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {cpuData?.utilization_percent?.toFixed(1) || 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[120px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cpuHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(173, 80%, 48%)' }}
                      labelStyle={{ display: 'none' }}
                      formatter={(val: number) => [`${val.toFixed(1)}%`, 'Usage']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(173, 80%, 48%)" 
                      strokeWidth={2} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <p className="text-muted-foreground text-xs">Model</p>
                  <p className="font-medium truncate" title={cpuData?.name}>{cpuData?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cores (Logical)</p>
                  <p className="font-medium">{cpuData?.cores_logical || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Memory Card */}
          <Card className="glass-card hover:shadow-neon-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neon-violet/10 flex items-center justify-center">
                    <MemoryStick className="w-4 h-4 text-neon-violet" />
                  </div>
                  System Memory (RAM)
                  <InfoTooltip content="Overall system memory utilization." impact="Essential for loading datasets and keeping the application responsive." />
                </CardTitle>
                <span className="text-2xl font-bold tabular-nums text-neon-violet">
                  {memData?.ram_percent?.toFixed(1) || 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[120px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ramHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(265, 60%, 55%)' }}
                      labelStyle={{ display: 'none' }}
                      formatter={(val: number) => [`${val.toFixed(1)}%`, 'Usage']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(265, 60%, 55%)" 
                      strokeWidth={2} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <p className="text-muted-foreground text-xs">Used / Total</p>
                  <p className="font-medium tabular-nums">
                    {memData?.ram_used_gb?.toFixed(1) || 0} / {memData?.ram_total_gb?.toFixed(1) || 0} GB
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Swap Usage</p>
                  <p className="font-medium tabular-nums">{memData?.swap_percent?.toFixed(1) || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {stats?.gpu?.filter(gpu => gpu.name !== 'No GPU Detected').length ? (
            stats.gpu.filter(gpu => gpu.name !== 'No GPU Detected').map((gpu, idx) => (
              <GPUCard key={idx} gpu={gpu} isPaused={isPaused} healthStatus={gpuHealthStatus} healthResult={gpuHealthResult} />
            ))
          ) : (
            <Card className="glass-card flex-col md:col-span-2 lg:col-span-1 border-neon-green/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-neon-green" />
                    </div>
                    Graphics (GPU)
                  </CardTitle>
                  <span className="text-sm font-medium text-muted-foreground">Not Detected</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No NVIDIA GPU detected</p>
                    <p className="text-xs mt-1">Make sure drivers are installed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Disk Usage */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Storage
            <InfoTooltip content="Total and used space on your local storage drives." impact="Ensure you have enough space for model weights and training checkpoints." />
          </CardTitle>
          <CardDescription>Disk space utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {stats?.disk?.map((disk, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      Drive {disk.device}
                    </p>
                    <p className="text-xs text-muted-foreground">Mount: {disk.mount_point}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">
                      {disk.used_gb.toFixed(1)} / {disk.total_gb.toFixed(1)} GB
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">{disk.percent.toFixed(1)}% Used</p>
                  </div>
                </div>
                <Progress 
                  value={disk.percent} 
                  className="h-2" 
                  variant={disk.percent > 90 ? 'destructive' : disk.percent > 75 ? 'amber' : 'cyan'} 
                />
              </div>
            ))}
            {!stats?.disk?.length && (
              <p className="text-sm text-muted-foreground">Loading disk information...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
