import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface EvalMetricsChartProps {
  metrics: Record<string, number>
  title?: string
}

// Curated color palette for the bars
const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f']

export function EvalMetricsChart({ metrics, title }: EvalMetricsChartProps) {
  const chartData = useMemo(() => {
    if (!metrics || Object.keys(metrics).length === 0) return []

    return Object.entries(metrics)
      .filter(([key, value]) => {
        // Only show meaningful score metrics, not timing/internal ones
        if (key.includes('runtime') || key.includes('per_second') || key.includes('preparation')) return false
        if (key.includes('samples') || key.includes('steps')) return false
        return typeof value === 'number' && !isNaN(value)
      })
      .map(([key, value]) => ({
        name: key
          .replace('eval_', '')
          .replace('predict_', '')
          .replace(/_/g, ' ')
          .replace(/-/g, '-')
          .toUpperCase(),
        value: Number(value.toFixed(2)),
        rawKey: key,
      }))
  }, [metrics])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No evaluation metrics yet...
      </div>
    )
  }

  const maxVal = Math.max(...chartData.map(d => d.value))

  return (
    <div className="w-full h-72">
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 40, left: 10 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            angle={-25}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            domain={[0, Math.ceil(maxVal * 1.15)]}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            formatter={(value: number) => [value.toFixed(4), 'Score']}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          <Bar 
            dataKey="value" 
            radius={[6, 6, 0, 0]}
            isAnimationActive={true}
            animationDuration={600}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
