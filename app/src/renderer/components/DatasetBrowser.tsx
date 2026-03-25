import React, { useState, useCallback, useEffect } from 'react'
import { 
  FolderOpen, FileText, ArrowLeft, ChevronRight, ChevronDown, ChevronUp, X, Loader2, 
  AlertCircle, Search, Download, Database, Globe, File, Upload, Sparkles,
  Info, AlertTriangle, XCircle
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { cn } from '@/lib/utils'
import { InfoTooltip } from './ui/info-tooltip'

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

interface HFDataset {
  id: string
  name: string
  author: string
  downloads: number
  likes: number
  tags: string[]
  task: string[]
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

function formatDownloads(downloads: number): string {
  if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`
  if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`
  return downloads.toString()
}

export function DatasetBrowser({ onSelect, onClose }: DatasetBrowserProps) {
  const [activeTab, setActiveTab] = useState('samples')

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative z-[10000] w-full max-w-4xl max-h-[90vh] bg-background rounded-xl border shadow-2xl flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Select Dataset
              </CardTitle>
              <InfoTooltip 
                content="Choose a training dataset for fine-tuning your model."
                impact="The quality and relevance of this data is the most important factor in model performance."
              />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-hidden p-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid grid-cols-3 mx-4 mt-4 flex-shrink-0 bg-muted/50">
              <TabsTrigger value="samples" className="flex gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Samples
              </TabsTrigger>
              <TabsTrigger value="huggingface" className="flex gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                HuggingFace
              </TabsTrigger>
              <TabsTrigger value="local" className="flex gap-1.5">
                <File className="w-3.5 h-3.5" />
                Local Files
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              <TabsContent value="samples" className="mt-0 p-4">
                <SampleDatasetsTab onSelect={onSelect} />
              </TabsContent>

              <TabsContent value="huggingface" className="mt-0 p-4">
                <HuggingFaceTab onSelect={onSelect} />
              </TabsContent>

              <TabsContent value="local" className="mt-0 p-4">
                <LocalFilesTab onSelect={onSelect} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </div>
    </div>
  )
}

function SampleDatasetsTab({ onSelect }: { onSelect: (name: string, dir: string) => void }) {
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dataDir, setDataDir] = useState('data')

  useEffect(() => {
    fetch(`${API_BASE}/info`)
      .then(res => res.json())
      .then(data => {
        setDatasets(data.datasets || [])
        if (data.config_path) {
          // Extract directory from config_path (e.g. "C:\...\data\dataset_info.json" -> "C:\...\data")
          const dir = data.config_path.replace(/[\\/]dataset_info\.json$/, '')
          setDataDir(dir)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading datasets...</span>
      </div>
    )
  }

  const sampleDatasets = datasets.filter(d => 
    d.name.includes('sample') || 
    d.name === 'alpaca' || 
    d.name === 'identity'
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <span>Pre-configured sample datasets ready to use for training.</span>
        <InfoTooltip 
          content="Sample datasets are bundled with the application and work out of the box."
          impact="Great for testing your training pipeline before using your own data."
        />
      </div>

      {sampleDatasets.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">
            No sample datasets configured.
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Go to Local Files tab to add datasets.
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {sampleDatasets.map((dataset) => (
            <div
              key={dataset.name}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => onSelect(dataset.name, dataDir)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {dataset.name}
                    <InfoTooltip 
                      content={`${dataset.formatting || 'alpaca'} format dataset`}
                      impact="Click to select this dataset for training"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dataset.formatting || 'alpaca'} format • {dataset.file_name || 'N/A'}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground">
                Select
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-muted">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-sm font-medium">Supported Formats</h4>
          <InfoTooltip 
            content="Dataset format determines how training examples are structured."
            impact="Alpaca is simpler; ShareGPT supports multi-turn conversations."
          />
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Alpaca:</strong> instruction, input (optional), output</p>
          <p><strong>ShareGPT:</strong> conversations with from/value pairs</p>
          <p><strong>Files:</strong> {SUPPORTED_EXTENSIONS.join(', ')}</p>
        </div>
      </div>
    </div>
  )
}

function HuggingFaceTab({ onSelect }: { onSelect: (name: string, dir: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [datasets, setDatasets] = useState<HFDataset[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<HFDataset | null>(null)
  const [formatInfo, setFormatInfo] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  const searchDatasets = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/hf/search?query=${encodeURIComponent(query)}&limit=20`)
      const data = await res.json()
      setDatasets(data.datasets || [])
    } catch (e) {
      console.error('Search failed:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    searchDatasets('instruction')
  }, [searchDatasets])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchDatasets(searchQuery)
  }

  const selectDataset = async (dataset: HFDataset) => {
    setSelectedDataset(dataset)
    setLoadingPreview(true)
    setFormatInfo(null)
    setConfigError(null)
    
    try {
      const res = await fetch(`${API_BASE}/hf/validate-format?repo_id=${dataset.id}`)
      const formatData = await res.json()
      setFormatInfo(formatData)
    } catch (e) {
      console.error('Format validation failed:', e)
    }
    setLoadingPreview(false)
  }

  const configureDataset = async () => {
    if (!selectedDataset) return
    setConfiguring(true)
    setConfigError(null)
    
    try {
      const res = await fetch(`${API_BASE}/hf/${selectedDataset.id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formatting: formatInfo?.suggested_format || 'alpaca',
          columns: formatInfo?.suggested_columns || {}
        })
      })
      const data = await res.json()
      
      if (data.success) {
        onSelect(data.dataset_name, data.data_dir || 'data')
      } else {
        setConfigError(data.detail || data.error || 'Failed to configure dataset')
      }
    } catch (e: any) {
      console.error('Configure failed:', e)
      setConfigError(e.message || 'Network error occurred. Please try again.')
    }
    setConfiguring(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Search and download datasets from HuggingFace Hub.</span>
        <InfoTooltip 
          content="HuggingFace hosts thousands of pre-processed datasets."
          impact="Downloads are cached locally for faster access."
        />
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search datasets (e.g., alpaca, code, math, sft)..."
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {!selectedDataset ? (
        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
          {datasets.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {loading ? 'Searching...' : 'No datasets found. Try a different search term.'}
            </div>
          ) : (
            datasets.map((dataset) => (
              <div
                key={dataset.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 hover:border-primary/30 cursor-pointer transition-all"
                onClick={() => selectDataset(dataset)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      {dataset.name}
                      <InfoTooltip 
                        content={`By ${dataset.author}`}
                        impact="Click to view dataset details and configure"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{dataset.id}</div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-xs text-muted-foreground">
                    {formatDownloads(dataset.downloads)} downloads
                  </div>
                  {dataset.task?.[0] && (
                    <div className="text-xs text-primary">{dataset.task[0]}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedDataset(null)}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to results
          </Button>

          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">{selectedDataset.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedDataset.id}</div>
                </div>
              </div>
              <InfoTooltip 
                content={`HuggingFace dataset ID: ${selectedDataset.id}`}
                impact="This identifier is used to download the dataset"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <div className="text-muted-foreground flex items-center gap-1">
                  Downloads
                  <InfoTooltip content="Number of times this dataset has been downloaded" impact="Popular datasets are generally well-maintained" />
                </div>
                <div className="font-medium">{formatDownloads(selectedDataset.downloads)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Likes</div>
                <div className="font-medium">{formatDownloads(selectedDataset.likes)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Author</div>
                <div className="font-medium">{selectedDataset.author}</div>
              </div>
            </div>

            {loadingPreview ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing format...</span>
              </div>
            ) : formatInfo ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Detected Format:</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                    {formatInfo.format}
                  </span>
                  <InfoTooltip 
                    content="Auto-detected dataset format for LLaMA Factory"
                    impact="Format determines how training examples are parsed"
                  />
                </div>
                {formatInfo.available_columns && (
                  <div className="text-sm text-muted-foreground">
                    Columns: {formatInfo.available_columns.join(', ')}
                  </div>
                )}
              </div>
            ) : null}

            {configError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-destructive text-sm animate-in fade-in slide-in-from-top-1">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Setup Failed</p>
                  <p className="text-xs opacity-90">{configError}</p>
                </div>
              </div>
            )}

            <Button 
              className="w-full mt-4" 
              onClick={configureDataset}
              disabled={configuring}
            >
              {configuring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Configure for Training
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5" />
        <span>Datasets will be downloaded and cached when training starts.</span>
        <InfoTooltip 
          content="First-time downloads may take a while depending on dataset size"
          impact="Subsequent uses will use the cached version"
        />
      </div>
    </div>
  )
}

function LocalFilesTab({ onSelect }: { onSelect: (name: string, dir: string) => void }) {
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dataDir, setDataDir] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('directory')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [datasetName, setDatasetName] = useState('')
  const [formatting, setFormatting] = useState('')
  const [columns, setColumns] = useState<Record<string, string>>({})
  const [configuring, setConfiguring] = useState(false)
  const [validatingPath, setValidatingPath] = useState(false)
  const [colMappingOpen, setColMappingOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)

  const browse = useCallback(async (path: string | null = null) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/browse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
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
      const data: AnalyzeResponse = await res.json()
      setAnalysis(data)
      setDatasetName(data.suggested_name)
      setFormatting(data.format)
      setColumns(data.columns)
      setViewMode('file')
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
      const data = await res.json()
      if (data.success) {
        onSelect(datasetName.trim(), data.data_dir || currentPath || 'data')
      }
    } catch (e: any) {
      setError(e.message || 'Failed to configure dataset')
    } finally {
      setConfiguring(false)
    }
  }

  const handleBrowseFiles = async () => {
    if (!window.electronAPI?.dialog) {
      setError('File dialog not available')
      return
    }

    try {
      const result = await window.electronAPI.dialog.openFile({
        title: 'Select Dataset File',
        filters: [
          { name: 'Dataset Files', extensions: ['json', 'jsonl', 'csv'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0]
        setValidatingPath(true)
        
        try {
          const res = await fetch(`${API_BASE}/copy-to-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath }),
          })
          const data = await res.json()
          
          if (data.success) {
            onSelect(data.dataset_name, data.data_dir || 'data')
          } else {
            setError(data.detail || 'Failed to copy file')
          }
        } catch (e: any) {
          setError(e.message || 'Failed to process file')
        }
        
        setValidatingPath(false)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to open file dialog')
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
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Browse your computer for dataset files.</span>
        <InfoTooltip 
          content="Use the file browser to select dataset files from your computer."
          impact="Files will be copied to the app's data directory"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleBrowseFiles} className="flex-1">
          <Upload className="w-4 h-4 mr-2" />
          Browse Your Files
        </Button>
        <InfoTooltip 
          content="Open file dialog to select dataset files"
          impact="Supports JSON, JSONL, and CSV formats"
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>Supported: {SUPPORTED_EXTENSIONS.join(', ')} • Alpaca or ShareGPT format</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading || analyzing || validatingPath ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">
            {validatingPath ? 'Processing file...' : 'Loading...'}
          </span>
        </div>
      ) : viewMode === 'directory' ? (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
            <span className="truncate">{dataDir}/{currentPath}</span>
            <InfoTooltip 
              content="Current directory path for dataset files"
              impact="Click folder names to navigate, click files to analyze"
            />
          </div>

          {parentPath !== null && (
            <button
              onClick={parentDir}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/50 text-sm text-muted-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Parent Directory</span>
            </button>
          )}

          {entries.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">
                No files found in this directory.
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Click "Browse Your Files" to add datasets.
              </div>
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
                  <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <FileText className={cn(
                    "w-4 h-4 shrink-0",
                    entry.is_supported ? "text-blue-500" : "text-muted-foreground"
                  )} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate flex items-center gap-1.5">
                    {entry.name}
                    {entry.is_supported && (
                      <InfoTooltip 
                        content={`${entry.is_directory ? 'Folder' : 'Click to analyze'} • ${entry.is_supported ? 'Supported format' : 'Unsupported'}`}
                        impact={entry.is_supported ? 'Click to configure this file' : 'This file type is not supported'}
                        asSpan={true}
                      />
                    )}
                  </div>
                  {!entry.is_directory && entry.size != null && (
                    <div className="text-[10px] text-muted-foreground">
                      {formatBytes(entry.size)}
                      {entry.extension && ` · ${entry.extension}`}
                    </div>
                  )}
                </div>
                {!entry.is_directory && entry.is_supported && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
            ))
          )}
        </>
      ) : (
        analysis && (
          <div className="space-y-4 pb-2">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Files
            </Button>

            <div className="bg-primary/5 rounded-lg p-3 space-y-2 border border-primary/10">
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
                <InfoTooltip 
                  content="Select the format that matches your dataset structure"
                  impact="Alpaca uses instruction/input/output; ShareGPT uses conversations"
                />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{analysis.sample_count.toLocaleString()} samples</span>
                <span>•</span>
                <span>{formatBytes(analysis.file_size_bytes)}</span>
                <InfoTooltip 
                  content="Number of training examples in this dataset"
                  impact="More samples = better training, but longer training time"
                />
              </div>
            </div>

            {/* Column Mapping — collapsible */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setColMappingOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span>Column Mapping</span>
                  <InfoTooltip
                    content="Detected columns in your dataset file"
                    impact="Maps your data fields to training fields"
                    asSpan
                  />
                </div>
                {colMappingOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {colMappingOpen && (
                <div className="divide-y divide-border/30">
                  {analysis.detected_columns.map((col, i) => (
                    <div key={i} className="px-3 py-2 text-[11px] bg-card/50">
                      <div className="font-mono text-primary flex items-center gap-1.5">
                        {col.name}
                        <InfoTooltip
                          content={`Sample value: ${col.sample_values[0] || 'N/A'}`}
                          impact="Example value from the dataset"
                        />
                      </div>
                      {col.sample_values.length > 0 && (
                        <div className="text-muted-foreground mt-0.5 break-words whitespace-pre-wrap">
                          e.g., {col.sample_values[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview — collapsible */}
            {analysis.preview.length > 0 && (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span>Preview</span>
                    <InfoTooltip
                      content="First 3 examples from your dataset"
                      impact="Verify your data looks correct before training"
                      asSpan
                    />
                  </div>
                  {previewOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {previewOpen && (
                  <div className="divide-y divide-border/30">
                    {analysis.preview.slice(0, 3).map((sample, i) => (
                      <div key={i} className="text-[10px] bg-card/50 px-3 py-2 font-mono break-all whitespace-pre-wrap">
                        {JSON.stringify(sample, null, 2).slice(0, 400)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span>Dataset Name</span>
                <InfoTooltip 
                  content="A unique name for this dataset"
                  impact="Used to reference this dataset in training configs"
                />
              </div>
              <Input
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="my_dataset"
                className="h-8 text-sm"
              />
            </div>

            <Button
              onClick={configureDataset}
              disabled={configuring || !datasetName.trim()}
              className="w-full"
            >
              {configuring && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Apply & Select Dataset
            </Button>
          </div>
        )
      )}
    </div>
  )
}
