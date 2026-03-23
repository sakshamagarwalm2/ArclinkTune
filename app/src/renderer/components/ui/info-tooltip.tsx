import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  content: string
  impact: string
  asSpan?: boolean
}

export function InfoTooltip({ content, impact, asSpan = false }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {asSpan ? (
            <span className={cn(
              "text-muted-foreground hover:text-neon-cyan transition-colors ml-1.5 cursor-help inline-flex items-center",
              "focus:outline-none"
            )}>
              <Info className="w-3 h-3" />
            </span>
          ) : (
            <button type="button" className="text-muted-foreground hover:text-neon-cyan transition-colors ml-1.5 focus:outline-none">
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] p-3 space-y-2 border-primary/20 bg-card/95 z-[20000]">
          <div>
            <p className="font-semibold text-neon-cyan mb-0.5 text-[11px] uppercase tracking-wider">What is it?</p>
            <p className="text-muted-foreground leading-relaxed text-xs">{content}</p>
          </div>
          <div className="h-px w-full bg-border/40 my-2" />
          <div>
            <p className="font-semibold text-neon-violet mb-0.5 text-[11px] uppercase tracking-wider">Impact</p>
            <p className="text-muted-foreground leading-relaxed text-xs">{impact}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
