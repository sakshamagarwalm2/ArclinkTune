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

// EMA smoothing matching LlamaFactory's TensorBoard-style implementation
// Uses a sigmoid function to dynamically adjust the smoothing weight based on data length
function smooth(scalars: number[]): number[] {
  if (scalars.length === 0) return []

  // Sigmoid-based weight calculation matching LlamaFactory's ploting.py
  const weight = 1.8 * (1 / (1 + Math.exp(-0.05 * scalars.length)) - 0.5)
  
  let last = scalars[0]
  const smoothed: number[] = []
  
  for (const nextVal of scalars) {
    const smoothedVal = last * weight + (1 - weight) * nextVal
    smoothed.push(smoothedVal)
    last = smoothedVal
  }
  
  return smoothed
}

export function LossChart({ data, title, showEval = true }: LossChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Filter entries that have loss data (matching LlamaFactory's gen_loss_plot)
    const trainEntries: { step: number; loss: number }[] = []
    const evalEntries: { step: number; evalLoss: number }[] = []
    
    for (const entry of data) {
      if (entry.loss !== undefined && entry.loss !== null) {
        trainEntries.push({
          step: entry.current_steps,
          loss: entry.loss,
        })
      }
      if (entry.eval_loss !== undefined && entry.eval_loss !== null) {
        evalEntries.push({
          step: entry.current_steps,
          evalLoss: entry.eval_loss,
        })
      }
    }
    
    if (trainEntries.length === 0) return []
    
    // Compute smoothed values
    const rawLoss = trainEntries.map(e => e.loss)
    const smoothedLoss = smooth(rawLoss)
    
    // Build main chart data from training entries
    const chartMap = new Map<number, any>()
    
    for (let i = 0; i < trainEntries.length; i++) {
      const step = trainEntries[i].step
      chartMap.set(step, {
        step,
        loss: trainEntries[i].loss,
        smoothedLoss: smoothedLoss[i],
        eval_loss: null,
        smoothedEvalLoss: null,
      })
    }
    
    // Merge eval data
    if (showEval && evalEntries.length > 0) {
      const rawEvalLoss = evalEntries.map(e => e.evalLoss)
      const smoothedEvalLoss = smooth(rawEvalLoss)
      
      for (let i = 0; i < evalEntries.length; i++) {
        const step = evalEntries[i].step
        if (chartMap.has(step)) {
          chartMap.get(step)!.eval_loss = evalEntries[i].evalLoss
          chartMap.get(step)!.smoothedEvalLoss = smoothedEvalLoss[i]
        } else {
          chartMap.set(step, {
            step,
            loss: null,
            smoothedLoss: null,
            eval_loss: evalEntries[i].evalLoss,
            smoothedEvalLoss: smoothedEvalLoss[i],
          })
        }
      }
    }
    
    // Sort by step and return
    return Array.from(chartMap.values()).sort((a, b) => a.step - b.step)
  }, [data, showEval])
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No loss data yet...
      </div>
    )
  }
  
  // Calculate Y axis domain with padding
  const allLossValues = chartData
    .flatMap(d => [d.loss, d.smoothedLoss, d.eval_loss, d.smoothedEvalLoss])
    .filter((v): v is number => v !== null && v !== undefined && !isNaN(v))
  
  const minVal = Math.min(...allLossValues)
  const maxVal = Math.max(...allLossValues)
  // For single points or very close values, create a reasonable Y range
  const range = maxVal - minVal
  const padding = range > 0 ? range * 0.1 : Math.max(minVal * 0.1, 0.1)
  const yMin = Math.max(0, minVal - padding)
  const yMax = maxVal + padding
  
  // Show dots when there are few data points so they're visible
  const showDots = chartData.length <= 5
  
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
            domain={[yMin, yMax]}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => value?.toFixed(4)}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          {/* Raw loss (transparent) - matches LlamaFactory's alpha=0.4 */}
          <Line 
            type="monotone" 
            dataKey="loss" 
            stroke="#1f77b4" 
            strokeOpacity={0.4}
            strokeWidth={1}
            dot={showDots ? { r: 4, fill: '#1f77b4', strokeWidth: 0, fillOpacity: 0.6 } : false}
            name="Loss (original)"
            isAnimationActive={false}
            connectNulls={false}
          />
          {/* Smoothed loss - matches LlamaFactory's solid line */}
          <Line 
            type="monotone" 
            dataKey="smoothedLoss" 
            stroke="#1f77b4" 
            strokeWidth={2}
            dot={showDots ? { r: 5, fill: '#1f77b4', strokeWidth: 2, stroke: '#fff' } : false}
            name="Loss (smoothed)"
            isAnimationActive={false}
            connectNulls={false}
          />
          {/* Eval loss (if available) */}
          {showEval && (
            <>
              <Line 
                type="monotone" 
                dataKey="eval_loss" 
                stroke="#ff7f0e" 
                strokeOpacity={0.4}
                strokeWidth={1}
                dot={showDots ? { r: 4, fill: '#ff7f0e', strokeWidth: 0, fillOpacity: 0.6 } : false}
                name="Eval Loss (original)"
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="smoothedEvalLoss" 
                stroke="#ff7f0e" 
                strokeWidth={2}
                dot={showDots ? { r: 5, fill: '#ff7f0e', strokeWidth: 2, stroke: '#fff' } : false}
                name="Eval Loss (smoothed)"
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
