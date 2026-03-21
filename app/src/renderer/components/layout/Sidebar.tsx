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
  Sparkles,
} from 'lucide-react'

const navItems = [
  { path: '/models', icon: Bot, label: 'Models', color: 'hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300' },
  { path: '/train', icon: GraduationCap, label: 'Train', color: 'hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300' },
  { path: '/chat', icon: MessageSquare, label: 'Chat', color: 'hover:bg-pink-100 hover:text-pink-700 dark:hover:bg-pink-900/30 dark:hover:text-pink-300' },
  { path: '/evaluate', icon: LineChart, label: 'Evaluate', color: 'hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-300' },
  { path: '/export', icon: Download, label: 'Export', color: 'hover:bg-cyan-100 hover:text-cyan-700 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-300' },
  { path: '/monitor', icon: Monitor, label: 'Monitor', color: 'hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'h-full bg-gradient-to-b from-card to-background border-r border-border/50 flex flex-col transition-all duration-300 shadow-sm',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="h-16 flex items-center justify-center border-b border-border/50 bg-card/50">
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                ArclinkTune
              </span>
              <p className="text-[10px] text-muted-foreground -mt-0.5">LLM Fine-tuning</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                  : cn('text-muted-foreground', item.color)
              )}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-90" />
              )}
              <item.icon className={cn('w-5 h-5 flex-shrink-0 relative z-10', isActive ? 'text-white' : '')} />
              {!collapsed && (
                <span className={cn('font-medium relative z-10', isActive ? 'text-white' : '')}>
                  {item.label}
                </span>
              )}
              {isActive && (
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-sm" />
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border/50 bg-card/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200',
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
