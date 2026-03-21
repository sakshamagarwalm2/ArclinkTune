import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Bot,
  GraduationCap,
  MessageSquare,
  LineChart,
  Download,
  Monitor,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import logoUrl from '../../../assets/Logo.png'

const navItems = [
  { path: '/models', icon: Bot, label: 'Models', description: 'Browse & download LLMs' },
  { path: '/train', icon: GraduationCap, label: 'Train', description: 'Fine-tune models' },
  { path: '/evaluate', icon: LineChart, label: 'Evaluate', description: 'Benchmark performance' },
  { path: '/chat', icon: MessageSquare, label: 'Chat', description: 'Test your models' },
  { path: '/export', icon: Download, label: 'Export', description: 'Save trained models' },
  { path: '/monitor', icon: Monitor, label: 'Monitor', description: 'System resources' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'h-full flex flex-col transition-all duration-300 ease-out',
        'bg-card/90 dark:bg-card/60 backdrop-blur-xl',
        'border-r border-border/50 dark:border-primary/5',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center justify-center border-b border-border/50 dark:border-primary/5">
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-neon">
            <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover bg-white/10" />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-neon">
              <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover bg-white/10" />
            </div>
            <div>
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-neon-violet bg-clip-text text-transparent">
                ArclinkTune
              </span>
              <p className="text-[10px] text-muted-foreground -mt-0.5">LLM Fine-tuning Studio</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group',
                isActive
                  ? 'bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground shadow-neon'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40 dark:hover:bg-accent/20'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
                isActive ? 'text-primary-foreground' : ''
              )} />
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    'font-medium text-sm',
                    isActive ? 'text-primary-foreground' : ''
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-primary-foreground/70 truncate">
                      {item.description}
                    </span>
                  )}
                </div>
              )}
              {isActive && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary-foreground/80" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border/50 dark:border-primary/5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-muted-foreground',
            'hover:bg-accent/40 dark:hover:bg-accent/20 hover:text-foreground transition-all duration-200',
            !collapsed && 'justify-start'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
