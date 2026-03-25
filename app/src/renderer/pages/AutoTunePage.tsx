import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Sparkles, Construction, Clock, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function AutoTunePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Auto Tune
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Automated hyperparameter optimization for your models</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          Coming Soon
        </Badge>
      </div>

      <Card className="border-dashed border-2 bg-muted/5">
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative mb-6">
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <div className="relative bg-background rounded-full p-6 border border-primary/20 shadow-neon-glow">
              <Brain className="w-16 h-12 text-primary" />
            </div>
            <Construction className="absolute -bottom-2 -right-2 w-8 h-8 text-amber-500 bg-background rounded-lg border p-1" />
          </div>
          
          <CardTitle className="text-3xl font-bold tracking-tight mb-2">Automated Optimization</CardTitle>
          <CardDescription className="text-lg max-w-md mx-auto">
            We're building an advanced engine to automatically find the best learning rate, batch size, and architectural parameters for your hardware.
          </CardDescription>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 w-full max-w-2xl">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50">
              <div className="p-2 rounded-lg bg-neon-cyan/10">
                <Clock className="w-5 h-5 text-neon-cyan" />
              </div>
              <h3 className="font-semibold text-sm">Hyper-Optimization</h3>
              <p className="text-[10px] text-muted-foreground">Grid and random search for optimal weights.</p>
            </div>
            
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50">
              <div className="p-2 rounded-lg bg-neon-green/10">
                <Sparkles className="w-5 h-5 text-neon-green" />
              </div>
              <h3 className="font-semibold text-sm">VRAM Scaling</h3>
              <p className="text-[10px] text-muted-foreground">Automatic configuration based on available GPU memory.</p>
            </div>
            
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">AI Suggestions</h3>
              <p className="text-[10px] text-muted-foreground">Model-aware parameter tuning using intelligent heuristics.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
