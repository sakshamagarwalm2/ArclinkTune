import React from 'react'
import { Brain, Dumbbell, BarChart3, Lightbulb, Settings, CheckCircle2 } from 'lucide-react'

interface LiveLoopMonitorProps {
  currentStep: 'think' | 'train' | 'evaluate' | 'feedback' | 'system' | null
  trialNumber: number
  maxTrials: number
  status: string
}

const steps = [
  { key: 'think', label: 'Think', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { key: 'train', label: 'Train', icon: Dumbbell, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { key: 'evaluate', label: 'Evaluate', icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { key: 'feedback', label: 'Feedback', icon: Lightbulb, color: 'text-green-400', bg: 'bg-green-500/20' },
] as const

export function LiveLoopMonitor({ currentStep, trialNumber, maxTrials, status }: LiveLoopMonitorProps) {
  const getStepState = (stepKey: string) => {
    if (status === 'completed') return 'completed'
    if (status === 'paused') return 'paused'
    if (currentStep === stepKey) return 'active'
    return 'idle'
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-card border border-border/50">
      <div className="text-center">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          AutoTune Loop
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Trial {trialNumber} of {maxTrials}
        </p>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {steps.map((step, idx) => {
          const state = getStepState(step.key)
          const Icon = step.icon
          const isActive = state === 'active'
          const isCompleted = state === 'completed'

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-500 ${
                    isActive
                      ? `${step.bg} ${step.color} border-current shadow-lg`
                      : isCompleted
                      ? 'bg-green-500/20 text-green-400 border-green-400'
                      : 'bg-muted/30 text-muted-foreground border-border'
                  }`}
                >
                  {isActive && (
                    <div className={`absolute inset-0 rounded-full ${step.bg} animate-ping opacity-30`} />
                  )}
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isActive ? step.color : isCompleted ? 'text-green-400' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-6 md:w-10 h-0.5 rounded-full transition-colors duration-500 ${
                    isCompleted ? 'bg-green-500/50' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {status === 'paused' && (
        <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
          <Settings className="w-3 h-3" /> Session Paused
        </div>
      )}
    </div>
  )
}
