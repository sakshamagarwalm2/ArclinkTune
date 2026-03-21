import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { api, Model, DownloadTask, LocalModel, ModelGroup } from '@/hooks/useApi'
import { useApp } from '@/contexts/AppContext'
import { 
  Search, Download, Bot, HardDrive, RefreshCw,
  Grid3x3, List, GraduationCap, MessageSquare,
  AlertCircle, Loader2, Sparkles, X,
  Trash2, FolderOpen, Zap, CheckCircle
} from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'

const HUB_OPTIONS = [
  { value: 'huggingface', label: 'HuggingFace' },
  { value: 'modelscope', label: 'ModelScope' },
  { value: 'openmind', label: 'OpenMind' },
]

export function ModelsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHub, setSelectedHub] = useState('huggingface')
  const [customModelPath, setCustomModelPath] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [hfToken, setHfToken] = useState('')
  const [savingToken, setSavingToken] = useState(false)

  useEffect(() => {
    const loadHfToken = async () => {
      if (window.electronAPI?.config) {
        const token = await window.electronAPI.config.get('hfToken')
        if (token) setHfToken(token)
      }
    }
    loadHfToken()
  }, [])

  const saveHfToken = async () => {
    if (window.electronAPI?.config) {
      setSavingToken(true)
      await window.electronAPI.config.set('hfToken', hfToken)
      setSavingToken(false)
    }
  }
  
  const { 
    downloadTasks, 
    addDownloadTask, 
    updateDownloadTask, 
    addDownloadedModel,
    setSelectedModel,
    templates,
    setTemplates
  } = useApp()

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: modelGroups, isLoading, error, refetch } = useQuery<ModelGroup>({
    queryKey: ['models', 'all'],
    queryFn: () => api.models.getAll(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: hubs = [] } = useQuery<{ id: string; name: string; icon: string }[]>({
    queryKey: ['models', 'hubs'],
    queryFn: () => api.models.getHubs(),
    staleTime: 60000,
  })

  const { data: localModels = [] } = useQuery<LocalModel[]>({
    queryKey: ['models', 'local'],
    queryFn: () => api.models.getLocal(),
    staleTime: 30000,
  })

  const { data: modelsDir } = useQuery<{ path: string }>({
    queryKey: ['models', 'dir'],
    queryFn: () => api.models.getModelsDir(),
    staleTime: 60000,
  })

  const { data: apiTemplates = [] } = useQuery<string[]>({
    queryKey: ['models', 'templates'],
    queryFn: () => api.models.getTemplates(),
    staleTime: 5 * 60 * 1000,
    enabled: templates.length === 0,
  })

  useEffect(() => {
    if (apiTemplates.length > 0 && templates.length === 0) {
      setTemplates(apiTemplates)
    }
  }, [apiTemplates, templates.length, setTemplates])

  const activeTasks = downloadTasks.filter(t => t.status === 'downloading' || t.status === 'pending')

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const allDownloads = await api.models.getAllDownloads()
        allDownloads.forEach((task) => {
          const existing = downloadTasks.find(t => t.task_id === task.task_id)
          if (existing) {
            updateDownloadTask(task.task_id, {
              status: task.status as any,
              progress: task.progress,
              downloaded: task.downloaded,
              total: task.total,
              speed: task.speed,
              eta: task.eta,
              error: task.error,
              local_path: task.local_path,
            })
          }
        })
      } catch (e) {
        // Silently fail polling
      }
    }, 2000)
    
    return () => clearInterval(pollInterval)
  }, [downloadTasks])

  const getFilteredModelsInGroup = (groupModels: Model[]) => {
    if (!searchQuery) return groupModels
    return groupModels.filter(model =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.path.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const downloadedCount = localModels.length

  const handleDownload = async (modelPath: string, modelName?: string) => {
    setDownloading(modelPath)
    
    try {
      const result = await api.models.download({ model_name: modelPath, hub: selectedHub })
      
      if (result.error || !result.task_id) {
        console.error('Download error:', result.error)
        setDownloading(null)
        return
      }
      
      const taskId = result.task_id
      
      const newTask: DownloadTask = {
        task_id: taskId,
        model_path: modelPath,
        model_name: modelName || modelPath.split('/').pop() || modelPath,
        status: 'downloading',
        progress: 0,
        downloaded: '0 B',
        total: 'Calculating...',
        speed: '-',
        eta: '-',
      }
      addDownloadTask(newTask)
      
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.models.getDownloadStatus(taskId)
          updateDownloadTask(taskId, {
            status: status.status as DownloadTask['status'],
            progress: status.progress,
            downloaded: status.downloaded,
            total: status.total,
            speed: status.speed,
            eta: status.eta,
            error: status.error,
            local_path: status.local_path,
          })
          
          if (status.status === 'completed') {
            clearInterval(pollInterval)
            setDownloading(null)
            addDownloadedModel(status.local_path || modelPath)
          } else if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'not_found') {
            clearInterval(pollInterval)
            setDownloading(null)
          }
        } catch (e) {
          console.error('Poll error:', e)
        }
      }, 1000)

      setDownloading(null)
    } catch (error: any) {
      console.error('Download failed:', error)
      setDownloading(null)
    }
  }

  const handleCancelDownload = async (taskId: string) => {
    try {
      await api.models.cancelDownload(taskId)
      updateDownloadTask(taskId, { status: 'cancelled' })
    } catch (error) {
      console.error('Cancel failed:', error)
    }
  }

  const handleDeleteLocalModel = async (localPath: string) => {
    try {
      await api.models.deleteLocalModel(localPath)
      queryClient.invalidateQueries({ queryKey: ['models', 'local'] })
    } catch (error) {
      console.error('Delete local model failed:', error)
    }
  }

  const handleCustomDownload = async () => {
    if (!customModelPath.trim()) return
    await handleDownload(customModelPath, customModelPath.split('/').pop())
    setCustomModelPath('')
  }

  const getDownloadTask = (modelPath: string) => {
    return downloadTasks.find(t => t.model_path === modelPath && (t.status === 'downloading' || t.status === 'pending'))
  }

  const goToTrain = (model: Model) => {
    setSelectedModel({
      name: model.name,
      path: model.path,
      template: model.template,
      downloaded: model.downloaded,
    })
    navigate('/train')
  }

  const goToChat = (model: Model) => {
    setSelectedModel({
      name: model.name,
      path: model.path,
      template: model.template,
      downloaded: model.downloaded,
    })
    navigate('/chat')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Model Hub
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Browse, download and manage language models</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setViewMode('list')}
            className="h-8 w-8 p-0"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* HF Token Settings */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">HuggingFace Token</h3>
                <Badge variant="secondary" className="text-xs bg-amber-200 text-amber-900 border-amber-300">Recommended</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Faster downloads & higher rate limits. Get token from{' '}
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault()
                    window.electronAPI?.shell.openExternal('https://huggingface.co/settings/tokens')
                  }}
                  className="text-primary hover:underline"
                >
                  huggingface.co/settings/tokens
                </a>
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                type="password"
                placeholder="hf_xxxxxxxxxxxx"
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                className="w-full sm:w-64"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={saveHfToken}
                disabled={savingToken}
              >
                {savingToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
          {hfToken && (
            <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              Token configured - downloads will be faster
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Downloads Panel - Always Visible When Downloading */}
      {activeTasks.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary animate-pulse" />
                Active Downloads ({activeTasks.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                Saving to: {modelsDir?.path || 'Loading...'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTasks.map(task => (
              <div key={task.task_id} className="p-3 rounded-lg bg-background/80 border border-primary/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm truncate">{task.model_name}</span>
                      <Badge variant="default" className="text-xs animate-pulse">
                        Downloading
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Progress value={task.progress} className="h-2.5" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {task.downloaded} / {task.total}
                        </span>
                        <span className="font-medium text-primary">{task.progress.toFixed(1)}%</span>
                        <span className="text-muted-foreground">
                          {task.speed} • ETA: {task.eta}
                        </span>
                      </div>
                    </div>
                    {task.error && (
                      <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {task.error}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleCancelDownload(task.task_id)}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="pl-10 text-sm"
              />
              <InfoTooltip content="Search through various LLM architectures." impact="Helps you find specific models like Llama, Qwen, or Mistral." />
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedHub} onValueChange={setSelectedHub}>
                <SelectTrigger className="w-full md:w-32 lg:w-40 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hubs.length > 0 ? hubs.map(hub => (
                    <SelectItem key={hub.id} value={hub.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{hub.icon}</span>
                        {hub.name}
                      </div>
                    </SelectItem>
                  )) : HUB_OPTIONS.map(hub => (
                    <SelectItem key={hub.value} value={hub.value}>{hub.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InfoTooltip content="Choose between HuggingFace, ModelScope, or OpenMind." impact="Changes the search source and download server for models." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="popular">
        <TabsList className="mb-4">
          <TabsTrigger value="popular" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Popular
          </TabsTrigger>
          <TabsTrigger value="downloaded" className="gap-1.5">
            <HardDrive className="w-3.5 h-3.5" /> Downloaded
            {localModels.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{localModels.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="popular">
          {isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading models from HuggingFace...</p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Failed to load models</p>
                    <p className="text-sm text-muted-foreground">Make sure the backend is running</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && modelGroups && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {modelGroups.total} models from HuggingFace
                  {downloadedCount > 0 && (
                    <span className="ml-2 text-green-600 font-medium">({downloadedCount} downloaded)</span>
                  )}
                </p>
                {searchQuery && (
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-xs">
                    Clear search
                  </Button>
                )}
              </div>
              
              <div className="space-y-6">
                {Object.entries(modelGroups.groups).map(([groupName, groupModels]) => {
                  const filteredGroup = getFilteredModelsInGroup(groupModels)
                  if (filteredGroup.length === 0) return null
                  
                  return (
                    <div key={groupName}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-base font-semibold">{groupName}</h3>
                        <Badge variant="secondary" className="text-xs">{filteredGroup.length}</Badge>
                        {groupName === 'Meta Llama' && (
                          <Badge variant="secondary" className="text-xs bg-amber-200 text-amber-900 border-amber-300">Popular</Badge>
                        )}
                      </div>
                      
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {filteredGroup.map((model, idx) => (
                            <Card 
                              key={idx} 
                              className={`group card-hover ${model.downloaded ? 'border-green-500/50 bg-green-500/5' : ''}`}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                                    model.downloaded ? 'bg-green-500' : 'brand-gradient'
                                  } group-hover:shadow-neon transition-shadow`}>
                                    <Bot className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <CardTitle className="text-sm truncate">{model.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground truncate" title={model.path}>{model.path}</p>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-xs">{model.template || 'default'}</Badge>
                                  {model.downloaded ? (
                                    <Badge variant="default" className="text-xs bg-green-600">Downloaded</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">{selectedHub}</Badge>
                                  )}
                                </div>
                                {(() => {
                                  const task = getDownloadTask(model.path)
                                  return (
                                    <>
                                      <Button 
                                        className="w-full" 
                                        size="sm"
                                        variant={model.downloaded ? "outline" : "default"}
                                        onClick={() => handleDownload(model.path, model.name)}
                                        disabled={!!task}
                                      >
                                        {task ? (
                                          <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Downloading...
                                          </>
                                        ) : model.downloaded ? (
                                          <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Re-download
                                          </>
                                        ) : (
                                          <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                          </>
                                        )}
                                      </Button>
                                      {task && (
                                        <div className="space-y-1">
                                          <Progress value={task.progress} className="h-1.5" />
                                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{task.downloaded} / {task.total}</span>
                                            <span>{task.progress.toFixed(1)}%</span>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )
                                })()}
                                <div className="flex gap-2 pt-1">
                                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => goToTrain(model)}>
                                    <GraduationCap className="w-3 h-3" /> Train
                                  </Button>
                                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => goToChat(model)}>
                                    <MessageSquare className="w-3 h-3" /> Chat
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredGroup.map((model, idx) => (
                            <Card 
                              key={idx} 
                              className={`card-hover ${model.downloaded ? 'border-green-500/50 bg-green-500/5' : ''}`}
                            >
                              <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                                    model.downloaded ? 'bg-green-500' : 'brand-gradient'
                                  }`}>
                                    <Bot className="w-6 h-6 text-white" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-medium">{model.name}</h3>
                                      {model.downloaded && (
                                        <Badge variant="default" className="bg-green-600 text-xs">Downloaded</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate max-w-md" title={model.path}>{model.path}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge variant="secondary">{model.template || 'default'}</Badge>
                                  <div className="flex gap-1 items-center">
                                    {(() => {
                                      const task = getDownloadTask(model.path)
                                      if (task) {
                                        return (
                                          <div className="flex items-center gap-2">
                                            <Progress value={task.progress} className="w-20 h-1.5" />
                                            <span className="text-xs text-primary font-medium">{task.progress.toFixed(0)}%</span>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="h-6 w-6 p-0 text-destructive"
                                              onClick={() => handleCancelDownload(task.task_id)}
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        )
                                      }
                                      return (
                                        <>
                                          <Button 
                                            size="sm"
                                            variant={model.downloaded ? "outline" : "default"}
                                            onClick={() => handleDownload(model.path, model.name)}
                                          >
                                            <Download className="w-4 h-4" />
                                          </Button>
                                          <Button variant="outline" size="sm" onClick={() => goToTrain(model)}>
                                            <GraduationCap className="w-4 h-4" />
                                          </Button>
                                          <Button variant="outline" size="sm" onClick={() => goToChat(model)}>
                                            <MessageSquare className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )
                                    })()}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {!isLoading && !error && modelGroups && Object.keys(modelGroups.groups || {}).length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No models found</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="downloaded">
          <div className="space-y-6">
            {/* Download Directory Info */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Download Directory</p>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[300px]" title={modelsDir?.path}>
                        {modelsDir?.path || 'Loading...'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      const dirPath = modelsDir?.path || ''
                      if (dirPath && window.electronAPI) {
                        await window.electronAPI.shell.openPath(dirPath)
                      }
                    }}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Open Folder
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Downloaded Models List */}
            {localModels.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-primary opacity-60" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Downloaded Models</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Downloaded models from HuggingFace will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="w-4 h-4" /> Downloaded Models ({localModels.length})
                </h3>
                {localModels.map((model, idx) => (
                  <Card key={idx} className="border-green-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{model.name}</p>
                              <Badge variant="default" className="bg-green-600 text-xs shrink-0">Downloaded</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate" title={model.local_path}>
                              <FolderOpen className="w-3 h-3 shrink-0" />
                              {model.local_path}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Size: {model.size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedModel({
                              name: model.name,
                              path: model.local_path,
                              downloaded: true,
                            })
                            navigate('/train')
                          }}>
                            <GraduationCap className="w-4 h-4 mr-1" /> Train
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedModel({
                              name: model.name,
                              path: model.local_path,
                              downloaded: true,
                            })
                            navigate('/chat')
                          }}>
                            <MessageSquare className="w-4 h-4 mr-1" /> Chat
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete "${model.name}" permanently? This cannot be undone.`)) {
                                handleDeleteLocalModel(model.local_path)
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Active Downloads Section */}
            {activeTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary animate-pulse" /> Active Downloads
                </h3>
                {activeTasks.map(task => (
                  <Card key={task.task_id} className="border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="w-4 h-4 text-primary" />
                            <span className="font-medium truncate">{task.model_name}</span>
                            <Badge variant="default" className="text-xs animate-pulse">
                              Downloading
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <Progress value={task.progress} className="h-2" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{task.downloaded} / {task.total}</span>
                              <span className="font-medium text-primary">{task.progress.toFixed(1)}%</span>
                              <span>{task.speed} • ETA: {task.eta}</span>
                            </div>
                          </div>
                          {task.error && (
                            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {task.error}
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleCancelDownload(task.task_id)}
                        >
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Model URL</CardTitle>
                <CardDescription>
                  Enter a custom model URL from HuggingFace or ModelScope
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">Model URL</label>
                    <InfoTooltip content="Full repository ID (e.g. 'meta-llama/Llama-2-7b-hf')." impact="Required to fetch models that aren't in the preset popular list." />
                  </div>
                  <Input 
                    value={customModelPath}
                    onChange={(e) => setCustomModelPath(e.target.value)}
                    placeholder="e.g., meta-llama/Llama-3.1-8B-Instruct"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model Hub</label>
                  <div className="flex gap-2">
                    {HUB_OPTIONS.map(hub => (
                      <Button
                        key={hub.value}
                        variant={selectedHub === hub.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedHub(hub.value)}
                      >
                        {hub.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCustomDownload}
                  disabled={!customModelPath.trim() || downloading === customModelPath}
                >
                  {downloading === customModelPath ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Custom Model
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Model Configuration</CardTitle>
                <CardDescription>Optional settings for custom downloads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Quantization</label>
                      <InfoTooltip content="Download model with pre-applied compression." impact="Significantly reduces disk and VRAM requirements for the model." />
                    </div>
                    <Select defaultValue="none">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (FP16/BF16)</SelectItem>
                        <SelectItem value="4">4-bit (Q4_K_M)</SelectItem>
                        <SelectItem value="8">8-bit (Q8_0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Template</label>
                      <InfoTooltip content="The format used for prompts and conversations." impact="Must match the model's architecture (e.g. use 'llama3' for Llama-3)." />
                    </div>
                    <Select defaultValue="default">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        {templates.slice(0, 50).map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">Max Memory (GB)</label>
                    <InfoTooltip content="Safety limit for the total VRAM usage of this model." impact="Prevents 'Out of Memory' crashes by capping resource allocation." />
                  </div>
                  <Slider defaultValue={[24]} min={1} max={80} step={1} />
                  <p className="text-xs text-muted-foreground">Maximum GPU memory to allocate</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
