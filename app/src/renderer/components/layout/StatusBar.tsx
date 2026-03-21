import { Cpu, MemoryStick, Activity } from 'lucide-react'
import { useSystemStats } from '@/hooks/useSystemStats'
import { cn } from '@/lib/utils'

export function StatusBar() {
  const { stats } = useSystemStats(5000)

  const cpu = stats?.cpu?.utilization_percent?.toFixed(0) || '0'
  const ram = stats?.memory?.ram_percent?.toFixed(0) || '0'
  const gpu = stats?.gpu?.[0]?.utilization_percent?.toFixed(0) || 'N/A'

  return (
    <footer className="h-8 border-t border-border/50 bg-gradient-to-r from-card via-card/80 to-card flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-green-500" />
          <span className="text-muted-foreground">Status:</span>
          <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </div>
        
        <div className="h-3 w-px bg-border/50" />
        
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-blue-500" />
          <span className="text-muted-foreground">CPU:</span>
          <span className={cn(
            "font-medium",
            parseInt(cpu) > 80 ? "text-red-500" : "text-blue-600 dark:text-blue-400"
          )}>
            {cpu}%
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <MemoryStick className="w-3 h-3 text-purple-500" />
          <span className="text-muted-foreground">RAM:</span>
          <span className={cn(
            "font-medium",
            parseInt(ram) > 80 ? "text-red-500" : "text-purple-600 dark:text-purple-400"
          )}>
            {ram}%
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 12h4M14 12h4" />
          </svg>
          <span className="text-muted-foreground">GPU:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {gpu !== 'N/A' ? `${gpu}%` : gpu}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground">
          Backend: <span className="text-green-600 dark:text-green-400">Connected</span>
        </span>
        <span className="text-muted-foreground/50">
          v1.0.0
        </span>
      </div>
    </footer>
  )
}
