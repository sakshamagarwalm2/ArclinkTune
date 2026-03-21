import { useLocation } from 'react-router-dom'
import { Sun, Moon, Sparkles, Menu } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/models': { title: 'Models', subtitle: 'Browse and download LLMs' },
  '/train': { title: 'Training', subtitle: 'Configure and run fine-tuning' },
  '/evaluate': { title: 'Evaluate', subtitle: 'Benchmark model performance' },
  '/chat': { title: 'Chat', subtitle: 'Test your models interactively' },
  '/export': { title: 'Export', subtitle: 'Save and deploy trained models' },
  '/monitor': { title: 'System Monitor', subtitle: 'Real-time hardware stats' },
}

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const page = pageTitles[location.pathname] || { title: 'ArclinkTune', subtitle: 'LLM Fine-tuning Studio' }

  return (
    <header className="h-14 border-b border-border/50 dark:border-primary/5 bg-card/50 dark:bg-card/30 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-muted-foreground hover:text-primary -ml-2"
          onClick={onMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-sm md:text-lg font-bold bg-gradient-to-r from-primary to-neon-violet bg-clip-text text-transparent truncate">
            {page.title}
          </h1>
          <p className="hidden md:block text-xs text-muted-foreground -mt-0.5">{page.subtitle}</p>
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
          <InfoTooltip content="Toggles between Light and Dark visual themes." impact="Instantly updates the interface look while preserving your settings." />
        </div>

        <div className="h-5 w-px bg-border/50 mx-1" />

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 group cursor-help">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Powered by LlamaFactory</span>
          <InfoTooltip content="ArclinkTune is built on the powerful LlamaFactory fine-tuning framework." impact="Ensures compatibility with hundreds of state-of-the-art models." />
        </div>
      </div>
    </header>
  )
}
