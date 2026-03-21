import { useLocation } from 'react-router-dom'
import { Sun, Moon, Sparkles } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/hooks/useTheme'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/models': { title: 'Models', subtitle: 'Browse and download LLMs' },
  '/train': { title: 'Training', subtitle: 'Configure and run fine-tuning' },
  '/evaluate': { title: 'Evaluate', subtitle: 'Benchmark model performance' },
  '/chat': { title: 'Chat', subtitle: 'Test your models interactively' },
  '/export': { title: 'Export', subtitle: 'Save and deploy trained models' },
  '/monitor': { title: 'System Monitor', subtitle: 'Real-time hardware stats' },
}

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const page = pageTitles[location.pathname] || { title: 'ArclinkTune', subtitle: 'LLM Fine-tuning Studio' }

  return (
    <header className="h-14 border-b border-border/50 dark:border-primary/5 bg-card/50 dark:bg-card/30 backdrop-blur-xl flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-neon-violet bg-clip-text text-transparent">
            {page.title}
          </h1>
          <p className="text-xs text-muted-foreground -mt-0.5">{page.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-neon-amber" />
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
          />
          <Moon className="w-4 h-4 text-neon-violet" />
        </div>

        <div className="h-5 w-px bg-border/50 mx-1" />

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Powered by LlamaFactory</span>
        </div>
      </div>
    </header>
  )
}
