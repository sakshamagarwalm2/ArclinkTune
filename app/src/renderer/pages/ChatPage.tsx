import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/hooks/useApi'
import { Send, Bot, User, Loader2, Trash2, Image, Video, Mic, Settings, Play, Square } from 'lucide-react'

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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  
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
      }) as { content: string }
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.content }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response' }])
    } finally {
      setIsLoading(false)
    }
  }

  const loadModel = async () => {
    setIsLoading(true)
    try {
      await api.chat.load({ 
        model_path: modelPath,
        finetuning_type: finetuningType,
        infer_backend: inferBackend,
        infer_dtype: inferDtype,
        checkpoint_path: checkpointPath,
        template,
        extra_args: extraArgs ? JSON.parse(extraArgs) : {},
      })
      setIsModelLoaded(true)
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: 'Model loaded successfully. You can now start chatting.' 
      }])
    } catch (error) {
      console.error('Failed to load model:', error)
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `Error loading model: ${error}` 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const unloadModel = async () => {
    await api.chat.unload()
    setIsModelLoaded(false)
    setMessages([])
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4" /> Model Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Model Path</label>
              <Input 
                value={modelPath} 
                onChange={(e) => setModelPath(e.target.value)}
                placeholder="meta-llama/Llama-3.1-8B-Instruct"
                disabled={isModelLoaded}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Checkpoint Path</label>
              <Input 
                value={checkpointPath} 
                onChange={(e) => setCheckpointPath(e.target.value)}
                placeholder="Path to LoRA adapter (optional)"
                disabled={isModelLoaded}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fine-tuning Type</label>
              <Select value={finetuningType} onValueChange={setFinetuningType} disabled={isModelLoaded}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lora">LoRA</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="freeze">Freeze</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Template</label>
              <Select value={template} onValueChange={setTemplate} disabled={isModelLoaded}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="llama3">Llama 3</SelectItem>
                  <SelectItem value="qwen">Qwen</SelectItem>
                  <SelectItem value="chatglm3">ChatGLM3</SelectItem>
                  <SelectItem value="mixtral">Mixtral</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" /> Generation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max New Tokens: {maxTokens}</label>
              <Slider 
                value={[maxTokens]} 
                min={8} max={8192} step={8}
                onValueChange={([v]) => setMaxTokens(v)}
                disabled={!isModelLoaded}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature: {temperature.toFixed(2)}</label>
              <Slider 
                value={[temperature * 100]} 
                min={1} max={150} step={1}
                onValueChange={([v]) => setTemperature(v / 100)}
                disabled={!isModelLoaded}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Top-P: {topP.toFixed(2)}</label>
              <Slider 
                value={[topP * 100]} 
                min={1} max={100} step={1}
                onValueChange={([v]) => setTopP(v / 100)}
                disabled={!isModelLoaded}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Top-K: {topK}</label>
              <Slider 
                value={[topK]} 
                min={1} max={100} step={1}
                onValueChange={([v]) => setTopK(v)}
                disabled={!isModelLoaded}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Repetition Penalty: {repetitionPenalty.toFixed(2)}</label>
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
            <CardTitle className="text-base">Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Inference Backend</label>
              <Select value={inferBackend} onValueChange={setInferBackend} disabled={isModelLoaded}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INFER_BACKENDS.map(b => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Type</label>
              <Select value={inferDtype} onValueChange={setInferDtype} disabled={isModelLoaded}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INFER_DTYPES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">System Prompt</label>
              <Input 
                value={systemPrompt} 
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant."
                disabled={!isModelLoaded}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={skipSpecialTokens}
                  onChange={(e) => setSkipSpecialTokens(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs">Skip Special</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={escapeHtml}
                  onChange={(e) => setEscapeHtml(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs">Escape HTML</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={enableThinking}
                  onChange={(e) => setEnableThinking(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs">Thinking</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Extra Args (JSON)</label>
              <Input 
                value={extraArgs} 
                onChange={(e) => setExtraArgs(e.target.value)}
                placeholder='{"vllm_enforce_eager": true}'
                disabled={isModelLoaded}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chat Interface</CardTitle>
              <CardDescription>Test your model with natural language</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isModelLoaded ? (
                <Badge variant="success" className="bg-emerald-500">Model Loaded</Badge>
              ) : (
                <Badge variant="secondary">No Model Loaded</Badge>
              )}
              <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0}>
                <Trash2 className="w-4 h-4 mr-1" /> Clear
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with your model</p>
                  <p className="text-sm">Load a model first to begin chatting</p>
                </div>
              </div>
            )}
            
            {messages.map((message, i) => (
              <div key={i} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-indigo-500' : message.role === 'system' ? 'bg-amber-500' : 'bg-purple-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : message.role === 'system' ? (
                    <Settings className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.role === 'user' ? 'bg-indigo-500 text-white' : 
                  message.role === 'system' ? 'bg-amber-100 dark:bg-amber-900/30' : 
                  'bg-muted'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="icon" disabled={!isModelLoaded}>
                <Image className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={!isModelLoaded}>
                <Video className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={!isModelLoaded}>
                <Mic className="w-4 h-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1"
                disabled={!isModelLoaded || isLoading}
              />
              <Button onClick={handleSend} disabled={!isModelLoaded || isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
