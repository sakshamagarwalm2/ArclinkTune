import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    variant?: 'default' | 'cyan' | 'green' | 'amber' | 'destructive'
  }
>(({ className, value, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: 'bg-gradient-to-r from-primary to-neon-violet shadow-[0_0_8px_hsl(var(--primary)/0.3)]',
    cyan: 'bg-gradient-to-r from-neon-cyan to-neon-teal shadow-[0_0_8px_hsl(173,80%,48%/0.3)]',
    green: 'bg-gradient-to-r from-neon-green to-emerald-400 shadow-[0_0_8px_hsl(142,71%,45%/0.3)]',
    amber: 'bg-gradient-to-r from-neon-amber to-orange-400 shadow-[0_0_8px_hsl(38,92%,55%/0.3)]',
    destructive: 'bg-gradient-to-r from-destructive to-red-400 shadow-[0_0_8px_hsl(0,84%,60%/0.3)]',
  }

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary/50",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
          variantClasses[variant]
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
