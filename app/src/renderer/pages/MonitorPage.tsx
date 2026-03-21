import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useSystemStats } from '@/hooks/useSystemStats'
import { Monitor, Cpu, MemoryStick, Activity, Thermometer, Pause, Play, Download } from 'lucide-react'

// Mock historical data for charts
const generateMockHistory = (baseValue: number, variance: number, length = 30) => {
  return Array.from({ length }, (_, i) => ({
    time: i,
    value: Math.max(0, Math.min(100, baseValue + (Math.random() * variance * 2 - variance)))
  }))
}

export function MonitorPage() {
  const [isPaused, setIsPaused] = useState(false)
  const { stats, error, refresh } = useSystemStats(isPaused ? undefined : 2000)

  // Memoize history data to prevent excessive re-renders (in a real app, this would be accumulated state)
  const cpuHistory = useMemo(() => generateMockHistory(stats?.cpu?.utilization_percent || 30, 15), [stats?.cpu?.utilization_percent])
  const gpuHistory = useMemo(() => generateMockHistory(stats?.gpu?.[0]?.utilization_percent || 10, 5), [stats?.gpu?.[0]?.utilization_percent])
  const ramHistory = useMemo(() => generateMockHistory(stats?.memory?.ram_percent || 45, 2), [stats?.memory?.ram_percent])

  const cpuData = stats?.cpu
  const memData = stats?.memory
  const gpuData = stats?.gpu?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="w-6 h-6 text-primary" />
            System Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time hardware utilization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPaused(!isPaused)}
            className="w-24"
          >
            {isPaused ? <><Play className="w-4 h-4 mr-1" /> Resume</> : <><Pause className="w-4 h-4 mr-1" /> Pause</>}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refresh()}
          >
            <Activity className="w-4 h-4 mr-1" /> Force Refresh
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CPU Card */}
          <Card className="glass-card hover:shadow-neon transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-primary" />
                  </div>
                  Processor (CPU)
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

          {/* GPU Card */}
          <Card className="glass-card hover:shadow-neon transition-shadow flex-col md:col-span-2 lg:col-span-1 border-neon-green/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-neon-green" />
                  </div>
                  Graphics (GPU)
                </CardTitle>
                {gpuData ? (
                  <span className="text-2xl font-bold tabular-nums text-neon-green">
                    {gpuData.utilization_percent?.toFixed(1) || 0}%
                  </span>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">Not Detected</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {gpuData ? (
                <>
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
                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">VRAM Usage</span>
                        <span className="font-medium tabular-nums text-neon-green">
                          {gpuData.memory_used_gb?.toFixed(1) || 0} / {gpuData.memory_total_gb?.toFixed(1) || 0} GB
                        </span>
                      </div>
                      <Progress 
                        value={(gpuData.memory_used_gb / gpuData.memory_total_gb) * 100 || 0} 
                        className="h-1.5" 
                        variant="green"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm pt-1">
                      <div>
                        <p className="text-muted-foreground text-xs">Model</p>
                        <p className="font-medium truncate" title={gpuData.name}>{gpuData.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-neon-amber" /> Temperature
                        </p>
                        <p className="font-medium tabular-nums">{gpuData.temperature_celsius || 0}°C</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No NVIDIA GPU detected</p>
                    <p className="text-xs mt-1">Make sure drivers are installed</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Disk Usage */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Storage
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
