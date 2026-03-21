import { useLocation } from 'react-router-dom'
import { RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSystemStats } from '@/hooks/useSystemStats'

const pageTitles: Record<string, { title: string; subtitle: string; icon: string }> = {
  '/models': { title: 'Model Selection', subtitle: 'Browse and download LLMs', icon: 'bot' },
  '/train': { title: 'Training', subtitle: 'Configure and run fine-tuning', icon: 'graduation' },
  '/chat': { title: 'Chat', subtitle: 'Test your models', icon: 'chat' },
  '/evaluate': { title: 'Evaluate', subtitle: 'Benchmark performance', icon: 'chart' },
  '/export': { title: 'Export', subtitle: 'Save trained models', icon: 'download' },
  '/monitor': { title: 'System Monitor', subtitle: 'Real-time hardware stats', icon: 'monitor' },
}

export function Header() {
  const location = useLocation()
  const { refresh } = useSystemStats(5000)

  const page = pageTitles[location.pathname] || { title: 'ArclinkTune', subtitle: 'LLM Fine-tuning Studio', icon: 'sparkles' }

  return (
    <header className="h-16 border-b border-border/50 bg-gradient-to-r from-card via-card/80 to-card flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            {page.title}
          </h1>
          <p className="text-xs text-muted-foreground -mt-0.5">{page.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refresh()} 
          className="h-9 w-9 p-0 hover:bg-accent/50"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        <div className="h-6 w-px bg-border/50 mx-1" />
        <div className="ml-2 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span className="text-xs font-medium text-muted-foreground">Powered by LlamaFactory</span>
        </div>
      </div>
    </header>
  )
}
