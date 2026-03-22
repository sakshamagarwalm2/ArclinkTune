import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { api, Model, LocalModel } from '@/hooks/useApi'
import { useApp } from '@/contexts/AppContext'
import { Send, Bot, User, Trash2, Image, Video, Mic, Settings, Play, Square, ArrowRight, RefreshCw } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const INFER_BACKENDS = [
  { value: 'huggingface', label: 'HuggingFace' },
  { value: 'vllm', label: 'vLLM' },
  { value: 'sglang', label: 'SGLang' },
]

const INFER_DTYPES = [
  { value: 'auto', label: 'Auto' },
  { value: 'float16', label: 'Float16' },
  { value: 'bfloat16', label: 'BFloat16' },
  { value: 'float32', label: 'Float32' },
]

export function ChatPage() {
  const { selectedModel, setSelectedModel, templates, setTemplates } = useApp()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [loadError, setLoadError] = useState<{summary: string; details: string} | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  
  const [modelPath, setModelPath] = useState('')
  const [finetuningType, setFinetuningType] = useState('lora')
  const [inferBackend, setInferBackend] = useState('huggingface')
  const [inferDtype, setInferDtype] = useState('auto')
  const [checkpointPath, setCheckpointPath] = useState('')
  const [template, setTemplate] = useState('default')
  
  const [maxTokens, setMaxTokens] = useState(1024)
  const [temperature, setTemperature] = useState(0.95)
  const [topP, setTopP] = useState(0.7)
  const [topK, setTopK] = useState(20)
  const [repetitionPenalty, setRepetitionPenalty] = useState(1.1)
  
  const [skipSpecialTokens, setSkipSpecialTokens] = useState(true)
  const [escapeHtml, setEscapeHtml] = useState(true)
  const [enableThinking, setEnableThinking] = useState(true)
  
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.')
  const [extraArgs, setExtraArgs] = useState('')

  const { data: models = [], isLoading: loadingModels } = useQuery<Model[]>({
    queryKey: ['models', 'chat'],
    queryFn: () => api.models.getFlat(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: localModels = [] } = useQuery<LocalModel[]>({
    queryKey: ['models', 'local'],
    queryFn: () => api.models.getLocal(),
    staleTime: 30000,
  })

  const { data: apiTemplates = [], isLoading: loadingTemplates } = useQuery<string[]>({
    queryKey: ['models', 'templates'],
    queryFn: () => api.models.getTemplates(),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (apiTemplates.length > 0 && templates.length === 0) {
      setTemplates(apiTemplates)
    }
  }, [apiTemplates, templates.length, setTemplates])

  useEffect(() => {
    if (selectedModel && selectedModel.path) {
      setModelPath(selectedModel.path)
      if (selectedModel.template) {
        setTemplate(selectedModel.template)
      }
    }
  }, [selectedModel])

  const handleModelSelect = (path: string) => {
    // Check hub models first
    const hubModel = models.find(m => m.path === path)
    if (hubModel) {
      setModelPath(path)
      setTemplate(hubModel.template || 'default')
      setSelectedModel({
        name: hubModel.name,
        path: hubModel.path,
        template: hubModel.template,
      })
      setLoadError(null)
      return
    }
    // Check local downloaded models
    const localModel = localModels.find(m => m.local_path === path)
    if (localModel) {
      setModelPath(path)
      setSelectedModel({
        name: localModel.name,
        path: localModel.local_path,
        downloaded: true,
      })
      setLoadError(null)
      return
    }
    // Custom / unknown path typed directly
    setModelPath(path)
    setLoadError(null)
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isModelLoaded) return

    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.chat.chat({
        messages: [...messages, userMessage],
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
      }) as { content?: string; error?: string }
      
      console.log('Chat response:', response)
      
      if (response.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${response.error}` }])
      } else if (response.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.content! }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: Unexpected response format: ${JSON.stringify(response)}` }])
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error?.message || 'Failed to get response'}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const loadModel = async () => {
    if (!modelPath) {
      setLoadError({ summary: 'No model path specified', details: 'Please enter or select a model path to continue.' })
      return
    }
    
    setLoadError(null)
    setShowErrorDetails(false)
    setIsLoading(true)
    try {
      const result = await api.chat.load({ 
        model_path: modelPath,
        template: template,
        finetuning_type: finetuningType,
      }) as { success: boolean; error?: string; details?: string }
      console.log('Load result:', result)
      
      if (result.success) {
        setIsModelLoaded(true)
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `Model "${modelPath}" loaded successfully. You can now start chatting.` 
        }])
        setLoadError(null)
      } else {
        const errorSummary = result.error || 'Failed to load model'
        const errorDetails = result.details || result.error || 'Unknown error'
        setLoadError({ summary: errorSummary, details: errorDetails })
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: `Error: ${errorSummary}` 
        }])
      }
    } catch (error: any) {
      console.error('Failed to load model:', error)
      const errorMsg = error?.message || String(error)
      setLoadError({ summary: 'API request failed', details: errorMsg })
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `Error: ${errorMsg}` 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const unloadModel = async () => {
    await api.chat.unload()
    setIsModelLoaded(false)
    setMessages([])
    setLoadError(null)
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="min-h-full flex flex-col gap-4">
      {/* Settings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" /> Model Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Model</label>
                  <InfoTooltip content="Path to the base model on your disk or HuggingFace." impact="Required for the chat interface to load and process requests." />
                </div>
                <Link to="/models" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Browse <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {loadingModels ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading models...
                </div>
              ) : (
                <Select value={modelPath} onValueChange={handleModelSelect} disabled={isModelLoaded}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {/* Local downloaded models appear first */}
                    {localModels.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Downloaded</div>
                        {localModels.map(model => (
                          <SelectItem key={model.local_path} value={model.local_path}>
                            <div className="flex items-center gap-2">
                              <Bot className="w-4 h-4 text-primary" />
                              <span>{model.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Hub Models</div>
                      </>
                    )}
                    {models.slice(0, 100).map(model => (
                      <SelectItem key={model.path} value={model.path}>
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <span>{model.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {/* If current modelPath isn't in either list, show it as a custom entry */}
                    {modelPath &&
                      !models.find(m => m.path === modelPath) &&
                      !localModels.find(m => m.local_path === modelPath) && (
                        <SelectItem key="__custom__" value={modelPath}>
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            <span className="truncate max-w-[200px]">{modelPath}</span>
                          </div>
                        </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              <Input 
                value={modelPath} 
                onChange={(e) => { setModelPath(e.target.value); setLoadError(null) }}
                placeholder="Or enter custom path: meta-llama/Llama-3.1-8B-Instruct"
                className="mt-2"
                disabled={isModelLoaded}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-sm font-medium">Checkpoint Path</label>
                <InfoTooltip content="Optional path to a fine-tuned LoRA adapter." impact="Applies your specific training weights on top of the base model." />
              </div>
              <Input 
                value={checkpointPath} 
                onChange={(e) => setCheckpointPath(e.target.value)}
                placeholder="Path to LoRA adapter (optional)"
                disabled={isModelLoaded}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <div className="flex items-center">
                  <label className="text-xs font-medium">Fine-tuning</label>
                  <InfoTooltip content="The type of model weights to load (LoRA, Full, etc.)." impact="Determines whether to load just adapters or the entire model parameters." />
                </div>
                <Select value={finetuningType} onValueChange={setFinetuningType} disabled={isModelLoaded}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lora">LoRA</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="freeze">Freeze</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center">
                  <label className="text-xs font-medium">Template</label>
                  <InfoTooltip content="The conversation format for the specific model architecture." impact="Matches the prompt structure to the way the model was trained (e.g. Llama 3 v Qwen)." />
                </div>
                <Select value={template} onValueChange={setTemplate} disabled={isModelLoaded}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="default">Default</SelectItem>
                    {loadingTemplates && templates.length === 0 ? (
                      <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground text-xs">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
                      </div>
                    ) : (
                      templates.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="relative group">
              {isModelLoaded ? (
                <Button variant="outline" className="w-full" onClick={unloadModel}>
                  <Square className="w-4 h-4 mr-2" /> Unload Model
                </Button>
              ) : (
                <Button className="w-full" onClick={loadModel} disabled={isLoading || !modelPath}>
                  <Play className="w-4 h-4 mr-2" /> 
                  {isLoading ? 'Loading...' : 'Load Model'}
                </Button>
              )}
              <InfoTooltip content="Initiates or terminates the model inference engine." impact="Loading takes VRAM; unloading frees it for other tasks like training." />
            </div>
            
            {loadError && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{loadError.summary}</p>
                    {showErrorDetails && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                        {loadError.details}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs shrink-0"
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                  >
                    {showErrorDetails ? 'Hide' : 'Details'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-neon-violet" /> Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-xs font-medium">Max Tokens: <span className="text-primary tabular-nums">{maxTokens}</span></label>
                <InfoTooltip content="Upper limit on the number of tokens the model can generate." impact="Prevents overly long responses and controls generation cost/time." />
              </div>
              <Slider 
                value={[maxTokens]} 
                min={8} max={8192} step={8}
                onValueChange={([v]) => setMaxTokens(v)}
                disabled={!isModelLoaded}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-xs font-medium">Temperature: <span className="text-primary tabular-nums">{temperature.toFixed(2)}</span></label>
                <InfoTooltip content="Controls the randomness and 'creativity' of the output." impact="0.1 is very literal/predictable; 1.0+ is highly creative/diverse." />
              </div>
              <Slider 
                value={[temperature * 100]} 
                min={1} max={150} step={1}
                onValueChange={([v]) => setTemperature(v / 100)}
                disabled={!isModelLoaded}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-xs font-medium">Top-P: <span className="text-primary tabular-nums">{topP.toFixed(2)}</span></label>
                <InfoTooltip content="Nucleus sampling threshold for filtered token selection." impact="Balances output variety by ignoring low-probability 'junk' words." />
              </div>
              <Slider 
                value={[topP * 100]} 
                min={1} max={100} step={1}
                onValueChange={([v]) => setTopP(v / 100)}
                disabled={!isModelLoaded}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-xs font-medium">Top-K: <span className="text-primary tabular-nums">{topK}</span></label>
                <InfoTooltip content="Only considers the top 'K' most likely tokens for sampling." impact="Higher K maintains diversity; lower K keeps the response focused." />
              </div>
              <Slider 
                value={[topK]} 
                min={1} max={100} step={1}
                onValueChange={([v]) => setTopK(v)}
                disabled={!isModelLoaded}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-xs font-medium">Rep. Penalty: <span className="text-primary tabular-nums">{repetitionPenalty.toFixed(2)}</span></label>
                <InfoTooltip content="Penalty applied to tokens that have already appeared." impact="Higher values (e.g. 1.2) significantly reduce repetitive phrases." />
              </div>
              <Slider 
                value={[repetitionPenalty * 10]} 
                min={10} max={20} step={1}
                onValueChange={([v]) => setRepetitionPenalty(v / 10)}
                disabled={!isModelLoaded}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-neon-amber" /> Advanced
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Backend</label>
                <Select value={inferBackend} onValueChange={setInferBackend} disabled={isModelLoaded}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INFER_BACKENDS.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Data Type</label>
                <Select value={inferDtype} onValueChange={setInferDtype} disabled={isModelLoaded}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INFER_DTYPES.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-xs font-medium">System Prompt</label>
                <InfoTooltip content="Initial instructions that define the model's persona." impact="Guides the model's tone, rules, and fundamental behavior." />
              </div>
              <Input 
                value={systemPrompt} 
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant."
                disabled={!isModelLoaded}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              {[
                { val: skipSpecialTokens, set: setSkipSpecialTokens, label: 'Skip Special Tokens' },
                { val: escapeHtml, set: setEscapeHtml, label: 'Escape HTML' },
                { val: enableThinking, set: setEnableThinking, label: 'Enable Thinking' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs">{item.label}</span>
                  <Switch
                    checked={item.val}
                    onCheckedChange={item.set}
                    className="scale-90"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-xs font-medium">Extra Args (JSON)</label>
                <InfoTooltip content="Advanced engine-level parameters in JSON format." impact="Allows expert users to fine-tune the inference backend behavior." />
              </div>
              <Input 
                value={extraArgs} 
                onChange={(e) => setExtraArgs(e.target.value)}
                placeholder='{"vllm_enforce_eager": true}'
                disabled={isModelLoaded}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" /> Chat Interface
              </CardTitle>
              <CardDescription className="hidden sm:block">Test your model with natural language</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none">
                {isModelLoaded ? (
                  <Badge className="bg-neon-green text-white w-full sm:w-auto justify-center">● Loaded</Badge>
                ) : (
                  <Badge variant="secondary" className="w-full sm:w-auto justify-center">Unloaded</Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0} className="h-8 flex-1 sm:h-8">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
                <InfoTooltip content="Wipes the current conversation history." impact="Resets the context window for the model, starting a fresh session." />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-primary opacity-60" />
                  </div>
                  <p className="font-medium">Start a conversation</p>
                  <p className="text-sm mt-1">Load a model first to begin chatting</p>
                </div>
              </div>
            )}
            
            {messages.map((message, i) => (
              <div key={i} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'brand-gradient' : message.role === 'system' ? 'bg-neon-amber/20' : 'bg-primary/10'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : message.role === 'system' ? (
                    <Settings className="w-4 h-4 text-neon-amber" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className={`max-w-[85%] md:max-w-[70%] rounded-xl px-4 py-2.5 ${
                  message.role === 'user' ? 'message-user' : 
                  message.role === 'system' ? 'message-system' : 
                  'message-assistant'
                }`}>
                  <p className="whitespace-pre-wrap text-[13px] md:text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="message-assistant rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 pt-4 pb-4 px-1 sm:px-0">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center justify-between sm:justify-start gap-1 bg-muted/30 p-1 rounded-lg border border-border/50 w-full sm:w-auto">
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" disabled={!isModelLoaded} className="h-8 w-8">
                    <Image className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" disabled={!isModelLoaded} className="h-8 w-8">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" disabled={!isModelLoaded} className="h-8 w-8">
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
                <InfoTooltip content="Multimedia input tools (Image, Video, Audio)." impact="Allows interacting with multi-modal LLMs that support visual/audio processing." />
              </div>
              <div className="flex flex-1 gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 text-sm h-10"
                  disabled={!isModelLoaded || isLoading}
                />
                <Button onClick={handleSend} disabled={!isModelLoaded || isLoading || !input.trim()} className="flex-shrink-0 h-10 w-12 sm:w-auto">
                  <Send className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
