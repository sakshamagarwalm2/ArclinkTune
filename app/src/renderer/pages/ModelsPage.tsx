import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { api } from '@/hooks/useApi'
import { 
  Search, Download, Trash2, RefreshCw, Bot, HardDrive, Check, 
  Star, Clock, ExternalLink, Filter, Grid3x3, List
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Model Selection</h2>
          <p className="text-sm text-muted-foreground">Browse and download language models</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode('grid')}>
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('list')}>
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" /> Search Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models by name or provider..."
                className="pl-10"
              />
            </div>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-background"
            >
              {HUB_OPTIONS.map(hub => (
                <option key={hub.value} value={hub.value}>{hub.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="popular">
        <TabsList className="mb-4">
          <TabsTrigger value="popular">Popular Models</TabsTrigger>
          <TabsTrigger value="local">Local Models</TabsTrigger>
          <TabsTrigger value="custom">Custom Model</TabsTrigger>
        </TabsList>

        <TabsContent value="popular">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredModels.map(model => (
                <Card key={model.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{model.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{model.provider}</p>
                        </div>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredModels.map(model => (
                <Card key={model.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
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
                      <Button 
                        size="sm"
                        onClick={() => handleDownload(model.name)}
                        disabled={downloading === model.name}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="local">
          <Card>
            <CardContent className="p-8 text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Local Models</h3>
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

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantization</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-background">
                    <option value="none">None (FP16/BF16)</option>
                    <option value="4">4-bit (Q4_K_M)</option>
                    <option value="8">8-bit (Q8_0)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-background">
                    <option value="default">Default</option>
                    <option value="llama3">Llama 3</option>
                    <option value="qwen">Qwen</option>
                    <option value="chatglm3">ChatGLM3</option>
                    <option value="mistral">Mistral</option>
                    <option value="yi">Yi</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Memory (GB)</label>
                <Slider defaultValue={[24]} min={1} max={80} step={1} />
                <p className="text-xs text-muted-foreground">Maximum GPU memory to allocate</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
