import React, { useState, useCallback, useEffect } from 'react'
import { FolderOpen, FileText, ArrowLeft, ChevronRight, Check, X, Loader2, AlertCircle, Search } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { cn } from '@/lib/utils'

const API_BASE = 'http://localhost:8000/api/datasets'

const SUPPORTED_EXTENSIONS = ['.json', '.jsonl', '.csv', '.parquet', '.arrow', '.txt']

interface FileEntry {
  name: string
  path: string
  is_directory: boolean
  size?: number
  extension?: string
  is_supported: boolean
}

interface BrowseResponse {
  current_path: string
  parent_path: string | null
  entries: FileEntry[]
  data_dir: string
}

interface AnalyzeResponse {
  file_path: string
  format: string
  columns: Record<string, string>
  detected_columns: { name: string; sample_values: string[] }[]
  sample_count: number
  file_size_bytes: number
  preview: Record<string, any>[]
  suggested_name: string
}

interface DatasetBrowserProps {
  onSelect: (datasetName: string, datasetDir: string) => void
  onClose: () => void
}

type ViewMode = 'directory' | 'file'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DatasetBrowser({ onSelect, onClose }: DatasetBrowserProps) {
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dataDir, setDataDir] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // File analysis state
  const [viewMode, setViewMode] = useState<ViewMode>('directory')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [datasetName, setDatasetName] = useState('')
  const [formatting, setFormatting] = useState('')
  const [columns, setColumns] = useState<Record<string, string>>({})
  const [configuring, setConfiguring] = useState(false)
  const [configured, setConfigured] = useState(false)

  const browse = useCallback(async (path: string | null = null) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/browse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data: BrowseResponse = await res.json()
      setCurrentPath(data.current_path)
      setParentPath(data.parent_path)
      setEntries(data.entries)
      setDataDir(data.data_dir)
      setViewMode('directory')
    } catch (e: any) {
      setError(e.message || 'Failed to browse')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    browse(null)
  }, [browse])

  const navigateTo = (entry: FileEntry) => {
    if (entry.is_directory) {
      browse(entry.path)
    } else if (entry.is_supported) {
      analyzeFile(entry.path)
    }
  }

  const analyzeFile = async (filePath: string) => {
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data: AnalyzeResponse = await res.json()
      setAnalysis(data)
      setDatasetName(data.suggested_name)
      setFormatting(data.format)
      setColumns(data.columns)
      setViewMode('file')
      setConfigured(false)
    } catch (e: any) {
      setError(e.message || 'Failed to analyze file')
    } finally {
      setAnalyzing(false)
    }
  }

  const configureDataset = async () => {
    if (!analysis || !datasetName.trim()) return
    setConfiguring(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: analysis.file_path,
          dataset_name: datasetName.trim(),
          formatting,
          columns,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setConfigured(true)
      // Auto-close after short delay
      setTimeout(() => {
        onSelect(datasetName.trim(), currentPath || 'data')
      }, 800)
    } catch (e: any) {
      setError(e.message || 'Failed to configure dataset')
    } finally {
      setConfiguring(false)
    }
  }

  const goBack = () => {
    if (viewMode === 'file') {
      setViewMode('directory')
      setAnalysis(null)
    } else if (parentPath !== null) {
      browse(parentPath)
    }
  }

  const parentDir = () => {
    if (parentPath !== null) {
      browse(parentPath)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              {viewMode === 'file' ? 'Dataset Analysis' : 'Browse Datasets'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Path breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => browse(null)}>
              data/
            </Button>
            {currentPath && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="truncate">{currentPath}</span>
              </>
            )}
          </div>

          {/* Supported formats info */}
          <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
            Supported: {SUPPORTED_EXTENSIONS.join(', ')} | Format: Alpaca (instruction/input/output) or ShareGpt (conversations)
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-3">
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading || analyzing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">
                {analyzing ? 'Analyzing file...' : 'Loading...'}
              </span>
            </div>
          ) : viewMode === 'directory' ? (
            <>
              {/* Navigate up */}
              {parentPath !== null && (
                <button
                  onClick={parentDir}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/50 text-sm text-muted-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>..</span>
                </button>
              )}

              {/* Directory entries */}
              {entries.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No files found in this directory
                </div>
              ) : (
                entries.map((entry) => (
                  <button
                    key={entry.path}
                    onClick={() => navigateTo(entry)}
                    disabled={!entry.is_directory && !entry.is_supported}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                      entry.is_directory
                        ? "hover:bg-primary/5 cursor-pointer"
                        : entry.is_supported
                          ? "hover:bg-primary/5 cursor-pointer"
                          : "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {entry.is_directory ? (
                      <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    ) : (
                      <FileText className={cn(
                        "w-4 h-4 flex-shrink-0",
                        entry.is_supported ? "text-blue-500" : "text-muted-foreground"
                      )} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{entry.name}</div>
                      {!entry.is_directory && entry.size != null && (
                        <div className="text-[10px] text-muted-foreground">
                          {formatBytes(entry.size)}
                          {entry.extension && ` · ${entry.extension}`}
                        </div>
                      )}
                    </div>
                    {!entry.is_directory && entry.is_supported && (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                ))
              )}
            </>
          ) : (
            /* File Analysis View */
            analysis && (
              <div className="space-y-4">
                {/* Detected format */}
                <div className="bg-primary/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">Detected Format:</span>
                    <select
                      value={formatting}
                      onChange={(e) => setFormatting(e.target.value)}
                      className="text-xs bg-background border border-input rounded px-2 py-1"
                    >
                      <option value="alpaca">Alpaca</option>
                      <option value="sharegpt">ShareGpt</option>
                    </select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {analysis.sample_count.toLocaleString()} samples · {formatBytes(analysis.file_size_bytes)}
                  </div>
                </div>

                {/* Column mapping */}
                <div className="space-y-1">
                  <div className="text-xs font-medium">Column Mapping</div>
                  {analysis.detected_columns.map((col, i) => (
                    <div key={i} className="text-[11px] bg-muted/50 rounded px-2 py-1.5">
                      <div className="font-mono text-primary">{col.name}</div>
                      {col.sample_values.length > 0 && (
                        <div className="text-muted-foreground truncate mt-0.5">
                          e.g., {col.sample_values[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Preview */}
                {analysis.preview.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium">Preview (first {Math.min(3, analysis.preview.length)} samples)</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {analysis.preview.slice(0, 3).map((sample, i) => (
                        <div key={i} className="text-[10px] bg-muted/30 rounded px-2 py-1.5 font-mono truncate">
                          {JSON.stringify(sample).slice(0, 200)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dataset name input */}
                <div className="space-y-1">
                  <div className="text-xs font-medium">Dataset Name</div>
                  <Input
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="my_dataset"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={goBack}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={configureDataset}
                    disabled={configuring || configured || !datasetName.trim()}
                    className="flex-1"
                  >
                    {configuring ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : configured ? (
                      <Check className="w-3.5 h-3.5 mr-1" />
                    ) : null}
                    {configured ? 'Configured!' : 'Apply & Select'}
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
