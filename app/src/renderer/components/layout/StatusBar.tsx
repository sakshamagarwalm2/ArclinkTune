import { useSystemStats } from '@/hooks/useSystemStats'
import { cn } from '@/lib/utils'

function MiniRing({ value, color, size = 20 }: { value: number; color: string; size?: number }) {
  const circumference = 2 * Math.PI * 7
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className="progress-ring">
      <circle
        cx="10" cy="10" r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-muted/40"
      />
      <circle
        cx="10" cy="10" r="7"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="progress-ring__circle"
      />
    </svg>
  )
}

export function StatusBar() {
  const { stats } = useSystemStats(5000)

  const cpuVal = stats?.cpu?.utilization_percent || 0
  const ramVal = stats?.memory?.ram_percent || 0
  const gpuVal = stats?.gpu?.[0]?.utilization_percent || 0
  const hasGpu = stats?.gpu?.[0] != null

  return (
    <footer className="h-8 border-t border-border/50 dark:border-primary/5 bg-card/50 dark:bg-card/30 backdrop-blur-xl flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-4">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-neon-green font-medium">Online</span>
        </div>

        <div className="h-3 w-px bg-border/50" />

        {/* CPU */}
        <div className="flex items-center gap-1.5">
          <MiniRing value={cpuVal} color="hsl(173, 80%, 48%)" />
          <span className="text-muted-foreground">CPU</span>
          <span className={cn(
            "font-medium tabular-nums",
            cpuVal > 80 ? "text-destructive" : "text-primary"
          )}>
            {cpuVal.toFixed(0)}%
          </span>
        </div>

        {/* RAM */}
        <div className="flex items-center gap-1.5">
          <MiniRing value={ramVal} color="hsl(265, 60%, 55%)" />
          <span className="text-muted-foreground">RAM</span>
          <span className={cn(
            "font-medium tabular-nums",
            ramVal > 80 ? "text-destructive" : "text-neon-violet"
          )}>
            {ramVal.toFixed(0)}%
          </span>
        </div>

        {/* GPU */}
        <div className="flex items-center gap-1.5">
          <MiniRing value={hasGpu ? gpuVal : 0} color="hsl(142, 71%, 45%)" />
          <span className="text-muted-foreground">GPU</span>
          <span className="font-medium tabular-nums text-neon-green">
            {hasGpu ? `${gpuVal.toFixed(0)}%` : 'N/A'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">
          Backend: <span className="text-neon-green font-medium">Connected</span>
        </span>
        <span className="text-muted-foreground/40 tabular-nums">v1.0.0</span>
      </div>
    </footer>
  )
}
