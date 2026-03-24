import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface LossEntry {
  loss?: number
  eval_loss?: number
  eval_accuracy?: number
  current_steps: number
  epoch?: number
  lr?: number
  [key: string]: any
}

interface LossChartProps {
  data: LossEntry[]
  title?: string
  showEval?: boolean
}

// Exponential moving average for smoothing
function smoothArray(data: number[], weight: number = 0.6): number[] {
  if (data.length === 0) return []
  
  let last = data[0]
  const smoothed: number[] = [last]
  
  for (let i = 1; i < data.length; i++) {
    last = last * weight + (1 - weight) * data[i]
    smoothed.push(last)
  }
  
  return smoothed
}

export function LossChart({ data, title, showEval = true }: LossChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Extract loss values and compute smoothed values
    const rawLoss: number[] = []
    const rawEvalLoss: number[] = []
    const steps: number[] = []
    
    for (const entry of data) {
      if (entry.loss !== undefined && entry.loss !== null) {
        rawLoss.push(entry.loss)
        steps.push(entry.current_steps || steps.length + 1)
      }
      if (entry.eval_loss !== undefined && entry.eval_loss !== null) {
        rawEvalLoss.push(entry.eval_loss)
      }
    }
    
    const smoothedLoss = smoothArray(rawLoss, 0.6)
    const smoothedEvalLoss = showEval ? smoothArray(rawEvalLoss, 0.6) : []
    
    // Build chart data
    return steps.map((step, i) => ({
      step,
      loss: rawLoss[i],
      smoothedLoss: smoothedLoss[i],
      eval_loss: rawEvalLoss[i] ?? null,
      smoothedEvalLoss: smoothedEvalLoss[i] ?? null,
    }))
  }, [data, showEval])
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No loss data yet...
      </div>
    )
  }
  
  return (
    <div className="w-full h-64">
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="step" 
            label={{ value: 'Step', position: 'insideBottom', offset: -5 }}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          {/* Raw loss (transparent) */}
          <Line 
            type="monotone" 
            dataKey="loss" 
            stroke="hsl(var(--primary))" 
            strokeOpacity={0.3}
            strokeWidth={1}
            dot={false}
            name="Loss (raw)"
            isAnimationActive={false}
          />
          {/* Smoothed loss */}
          <Line 
            type="monotone" 
            dataKey="smoothedLoss" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={false}
            name="Loss"
            isAnimationActive={false}
          />
          {/* Eval loss (if available) */}
          {showEval && (
            <>
              <Line 
                type="monotone" 
                dataKey="eval_loss" 
                stroke="hsl(var(--chart-2))" 
                strokeOpacity={0.3}
                strokeWidth={1}
                dot={false}
                name="Eval Loss (raw)"
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="smoothedEvalLoss" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={false}
                name="Eval Loss"
                isAnimationActive={false}
                connectNulls={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
