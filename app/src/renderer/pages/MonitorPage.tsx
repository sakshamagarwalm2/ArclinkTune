import { useState, useEffect, useCallback } from 'react'
import { useSystemStats } from '@/hooks/useSystemStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Cpu, MemoryStick, HardDrive, Activity, Thermometer, Zap, Gauge, Wind, TrendingUp, Clock
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'

interface DataPoint {
  time: string
  cpu: number
  gpu: number
  memory: number
  gpuTemp: number
  gpuMem: number
}

export function MonitorPage() {
  const { stats, isLoading, refresh } = useSystemStats(5000)
  const [history, setHistory] = useState<DataPoint[]>([])
  const [maxPoints] = useState(15)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (stats && !isPaused) {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      
      setHistory(prev => {
        const newPoint: DataPoint = {
          time: timeStr,
          cpu: stats.cpu?.utilization_percent || 0,
          gpu: stats.gpu?.[0]?.utilization_percent || 0,
          memory: stats.memory?.ram_percent || 0,
          gpuTemp: stats.gpu?.[0]?.temperature_celsius || 0,
          gpuMem: stats.gpu?.[0]?.memory_percent || 0,
        }
        const updated = [...prev, newPoint]
        if (updated.length > maxPoints) {
          return updated.slice(-maxPoints)
        }
        return updated
      })
    }
  }, [stats, isPaused])

  const gpu = stats?.gpu?.[0]
  const cpu = stats?.cpu
  const memory = stats?.memory
  const disk = stats?.disk?.[0]

  const getUtilizationColor = (percent: number) => {
    if (percent < 50) return 'text-green-500'
    if (percent < 80) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getTempColor = (temp: number) => {
    if (temp < 50) return 'text-green-500'
    if (temp < 80) return 'text-yellow-500'
    return 'text-red-500'
  }

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading system stats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              System Performance
              <Badge variant="success" className="ml-2">Live</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => refresh()}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.info?.hostname || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">Hostname</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-emerald-500" />
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatUptime(stats?.info?.uptime_seconds || 0)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Uptime</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl border border-orange-100 dark:border-orange-900/50">
              <p className={`text-2xl font-bold ${getTempColor(gpu?.temperature_celsius || 0)}`}>
                {gpu?.temperature_celsius || 0}°C
              </p>
              <p className="text-xs text-muted-foreground">GPU Temp</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-xl border border-violet-100 dark:border-violet-900/50">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{gpu?.name?.split(' ').slice(0, 2).join(' ') || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">GPU</p>
            </div>
          </div>
          
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#6366f1" fill="url(#cpuGradient)" name="CPU %" />
                <Area type="monotone" dataKey="gpu" stroke="#22c55e" fill="url(#gpuGradient)" name="GPU %" />
                <Area type="monotone" dataKey="memory" stroke="#f59e0b" fill="url(#memGradient)" name="RAM %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" /> GPU Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Area type="monotone" dataKey="gpuTemp" stroke="#ef4444" fill="url(#tempGradient)" name="°C" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-purple-500" /> GPU Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="gpuMemGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Area type="monotone" dataKey="gpuMem" stroke="#8b5cf6" fill="url(#gpuMemGradient)" name="VRAM %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-indigo-500" /> GPU Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><MemoryStick className="h-3 w-3" /> VRAM</span>
                <span className="font-medium">{gpu?.memory_used_gb?.toFixed(1) || 0}GB / {gpu?.memory_total_gb?.toFixed(1) || 0}GB</span>
              </div>
              <Progress value={gpu?.memory_percent || 0} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{gpu?.memory_percent?.toFixed(1) || 0}%</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                <p className="text-sm font-bold">{gpu?.temperature_celsius || 0}°C</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                <p className="text-sm font-bold">{gpu?.power_watts?.toFixed(0) || 0}W</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <Wind className="h-4 w-4 mx-auto mb-1 text-green-500" />
                <p className="text-sm font-bold">{gpu?.fan_speed_percent?.toFixed(0) || 0}%</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                <p className="text-sm font-bold">{gpu?.clock_gpu_mhz || 0}MHz</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500" /> CPU Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CPU Usage</span>
                <span className={`font-medium ${getUtilizationColor(cpu?.utilization_percent || 0)}`}>{cpu?.utilization_percent?.toFixed(1) || 0}%</span>
              </div>
              <Progress value={cpu?.utilization_percent || 0} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <p className="text-sm font-bold">{cpu?.cores_physical || 0}</p>
                <p className="text-xs text-muted-foreground">Cores</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <p className="text-sm font-bold">{cpu?.cores_logical || 0}</p>
                <p className="text-xs text-muted-foreground">Threads</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <p className="text-sm font-bold">{cpu?.frequency_mhz?.toFixed(0) || 0}</p>
                <p className="text-xs text-muted-foreground">MHz</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-pink-500" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>RAM</span>
                <span className="font-medium">{memory?.ram_used_gb?.toFixed(1) || 0}GB / {memory?.ram_total_gb?.toFixed(1) || 0}GB</span>
              </div>
              <Progress value={memory?.ram_percent || 0} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{memory?.ram_percent?.toFixed(1) || 0}%</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Swap</span>
                <span className="font-medium">{memory?.swap_used_gb?.toFixed(1) || 0}GB / {memory?.swap_total_gb?.toFixed(1) || 0}GB</span>
              </div>
              <Progress value={memory?.swap_percent || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {disk && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-teal-500" /> Disk - {disk.mount_point}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{disk.used_gb.toFixed(1)}GB / {disk.total_gb.toFixed(1)}GB</span>
                <span className="font-medium">{disk.percent.toFixed(1)}%</span>
              </div>
              <Progress value={disk.percent} className="h-3" />
              <p className="text-xs text-muted-foreground">Free: {disk.free_gb.toFixed(1)}GB available</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
