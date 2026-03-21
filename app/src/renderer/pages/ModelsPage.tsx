import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/hooks/useApi'
import { 
  Search, Download, Bot, HardDrive, RefreshCw,
  Grid3x3, List, GraduationCap, MessageSquare, ArrowRight, Sparkles
} from 'lucide-react'

const POPULAR_MODELS = [
  { id: 1, name: 'Llama-3.1-8B-Instruct', provider: 'Meta', downloads: '45M', size: '4.7GB', template: 'llama3' },
  { id: 2, name: 'Qwen2.5-7B-Instruct', provider: 'Alibaba', downloads: '32M', size: '14GB', template: 'qwen' },
  { id: 3, name: 'Qwen2.5-Coder-7B-Instruct', provider: 'Alibaba', downloads: '18M', size: '14GB', template: 'qwen' },
  { id: 4, name: 'DeepSeek-R1-Distill-Qwen-7B', provider: 'DeepSeek', downloads: '12M', size: '14GB', template: 'qwen' },
  { id: 5, name: 'Gemma-3-4B-It', provider: 'Google', downloads: '8M', size: '8GB', template: 'gemma' },
  { id: 6, name: 'Mistral-7B-Instruct-v0.3', provider: 'Mistral', downloads: '25M', size: '14GB', template: 'mistral' },
  { id: 7, name: 'Phi-3.5-mini-instruct', provider: 'Microsoft', downloads: '15M', size: '7.7GB', template: 'phi' },
  { id: 8, name: 'Yi-1.5-6B-Chat', provider: '01.AI', downloads: '5M', size: '12GB', template: 'yi' },
]

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

  const filteredModels = POPULAR_MODELS.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDownload = async (modelName: string) => {
    setDownloading(modelName)
    try {
      await api.models.download({ model_name: modelName, hub: selectedHub })
      setTimeout(() => {
        setDownloading(null)
      }, 3000)
    } catch (error) {
      console.error('Download failed:', error)
      setDownloading(null)
    }
  }

  const handleCustomDownload = async () => {
    if (!customModelPath.trim()) return
    setDownloading(customModelPath)
    try {
      await api.models.download({ model_name: customModelPath, hub: selectedHub })
      setTimeout(() => {
        setDownloading(null)
        setCustomModelPath('')
      }, 3000)
    } catch (error) {
      console.error('Download failed:', error)
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Model Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Browse, download and manage language models</p>
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

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models by name or provider..."
                className="pl-10"
              />
            </div>
            <Select value={selectedHub} onValueChange={setSelectedHub}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HUB_OPTIONS.map(hub => (
                  <SelectItem key={hub.value} value={hub.value}>{hub.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="popular">
        <TabsList className="mb-4">
          <TabsTrigger value="popular" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Popular
          </TabsTrigger>
          <TabsTrigger value="local" className="gap-1.5">
            <HardDrive className="w-3.5 h-3.5" /> Local
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="popular">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredModels.map(model => (
                <Card key={model.id} className="group card-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-sm group-hover:shadow-neon transition-shadow">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{model.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{model.provider}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {model.downloads}
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {model.size}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{model.template}</Badge>
                      <Badge variant="outline" className="text-xs">{selectedHub}</Badge>
                    </div>
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => handleDownload(model.name)}
                      disabled={downloading === model.name}
                    >
                      {downloading === model.name ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                    {/* Interlink CTAs */}
                    <div className="flex gap-2 pt-1">
                      <Link to="/train" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                          <GraduationCap className="w-3 h-3" /> Train <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                      <Link to="/chat" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                          <MessageSquare className="w-3 h-3" /> Chat <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredModels.map(model => (
                <Card key={model.id} className="card-hover">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center shadow-sm">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium">{model.name}</h3>
                        <p className="text-sm text-muted-foreground">{model.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">{model.size}</p>
                        <p className="text-xs text-muted-foreground">Size</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{model.downloads}</p>
                        <p className="text-xs text-muted-foreground">Downloads</p>
                      </div>
                      <Badge variant="secondary">{model.template}</Badge>
                      <div className="flex gap-1">
                        <Button 
                          size="sm"
                          onClick={() => handleDownload(model.name)}
                          disabled={downloading === model.name}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Link to="/train">
                          <Button variant="outline" size="sm">
                            <GraduationCap className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to="/chat">
                          <Button variant="outline" size="sm">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="local">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary opacity-60" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Local Models</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Downloaded models will appear here
              </p>
              <p className="text-xs text-muted-foreground">
                Models are saved to: C:\Users\SAKSHAM\.cache\huggingface
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Model URL</CardTitle>
                <CardDescription>
                  Enter a custom model URL from HuggingFace or ModelScope
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model URL</label>
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
                    <label className="text-sm font-medium">Quantization</label>
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
                    <label className="text-sm font-medium">Template</label>
                    <Select defaultValue="default">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="llama3">Llama 3</SelectItem>
                        <SelectItem value="qwen">Qwen</SelectItem>
                        <SelectItem value="chatglm3">ChatGLM3</SelectItem>
                        <SelectItem value="mistral">Mistral</SelectItem>
                        <SelectItem value="yi">Yi</SelectItem>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Memory (GB)</label>
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
