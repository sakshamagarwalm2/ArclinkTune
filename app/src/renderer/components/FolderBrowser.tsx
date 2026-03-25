import React, { useState, useCallback, useEffect } from 'react'
import { 
  FolderOpen, ArrowLeft, X, Loader2, 
  AlertCircle, Search, Folder, ChevronRight, Home, ExternalLink
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { CardContent, CardHeader, CardTitle } from './ui/card'
import { cn } from '@/lib/utils'
import { InfoTooltip } from './ui/info-tooltip'

const API_BASE = 'http://localhost:8000/api/datasets'

interface FileEntry {
  name: string
  path: string
  is_directory: boolean
}

interface BrowseResponse {
  current_path: string
  parent_path: string | null
  entries: FileEntry[]
  data_dir: string
}

interface FolderBrowserProps {
  onSelect: (path: string) => void
  onClose: () => void
  title?: string
}

export function FolderBrowser({ onSelect, onClose, title = "Select Export Directory" }: FolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const browse = useCallback(async (path: string | null = null) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/browse-directory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      
      if (!res.ok) throw new Error('Failed to browse directory')
      
      const data: BrowseResponse = await res.json()
      setCurrentPath(data.current_path)
      setParentPath(data.parent_path)
      setEntries(data.entries)
    } catch (e: any) {
      setError(e.message || 'Failed to browse')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    browse(null)
  }, [browse])

  const handleSelect = (path: string) => {
    onSelect(path)
  }

  const filteredEntries = entries.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative z-[10000] w-full max-w-2xl max-h-[80vh] bg-background rounded-xl border shadow-2xl flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                {title}
              </CardTitle>
              <InfoTooltip 
                content="Choose a destination folder on your system."
                impact="The model files will be saved into this directory."
              />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-hidden p-4 flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => browse(null)} className="shrink-0 h-9">
              <Home className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-[10px] bg-muted/50 p-2 rounded border border-border/50 overflow-hidden">
            <span className="text-muted-foreground shrink-0 uppercase font-bold tracking-wider">Current:</span>
            <span className="truncate font-mono text-primary flex-1">{currentPath}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 border rounded-lg bg-muted/10">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-medium animate-pulse">Scanning directories...</span>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {parentPath !== null && (
                  <button
                    onClick={() => browse(parentPath)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-primary/5 text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10">
                      <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <span className="text-sm font-medium">.. (Parent Directory)</span>
                  </button>
                )}

                {filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Folder className="w-12 h-12 text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground">No folders found</p>
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <div key={entry.path} className="flex items-center justify-between px-2 py-1.5 hover:bg-primary/5 transition-colors group">
                      <button
                        onClick={() => browse(entry.path)}
                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20">
                          <Folder className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-sm font-medium truncate">{entry.name}</span>
                      </button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => handleSelect(entry.path)}
                      >
                        Select
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t mt-auto">
            <p className="text-[10px] text-muted-foreground italic">
              Click a folder to navigate, or "Select" to use it as destination.
            </p>
            <Button 
              variant="default" 
              size="sm" 
              className="gap-2 px-6"
              onClick={() => handleSelect(currentPath)}
            >
              <ExternalLink className="w-4 h-4" />
              Use Current Folder
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  )
}
