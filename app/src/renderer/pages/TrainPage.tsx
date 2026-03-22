import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { api, Model } from '@/hooks/useApi'
import { useApp } from '@/contexts/AppContext'
import { cn } from '@/lib/utils'
import { useTraining } from '@/hooks/useTraining'
import { 
  Play, Square, Save, FolderOpen, Eye, Settings, 
  Layers, Cpu, Zap, Brain, Rocket, Activity, Bot, LineChart, ArrowRight,
  Info, Heart, Sparkles, Box, RefreshCw
} from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'

const TRAINING_STAGES = [
  { value: 'sft', label: 'SFT (Supervised Fine-tuning)' },
  { value: 'rm', label: 'Reward Modeling' },
  { value: 'ppo', label: 'PPO (Proximal Policy Optimization)' },
  { value: 'dpo', label: 'DPO (Direct Preference Optimization)' },
  { value: 'kto', label: 'KTO (Kullback-Leibler Divergence)' },
  { value: 'pt', label: 'Pre-Training' },
]

const FINETUNING_TYPES = [
  { value: 'lora', label: 'LoRA' },
  { value: 'full', label: 'Full Parameter' },
  { value: 'freeze', label: 'Freeze' },
  { value: 'llama_pro', label: 'LLaMA-Pro' },
]

const COMPUTE_TYPES = [
  { value: 'bf16', label: 'BF16' },
  { value: 'fp16', label: 'FP16' },
  { value: 'fp32', label: 'FP32' },
  { value: 'pure_bf16', label: 'Pure BF16' },
]

const LR_SCHEDULERS = [
  'linear', 'cosine', 'cosine_with_restarts', 'polynomial', 'constant', 'constant_with_warmup', 'inverse_sqrt', 'reduce_lr_on_plateau'
]

const PREF_LOSSES = [
  { value: 'sigmoid', label: 'Sigmoid' },
  { value: 'hinge', label: 'Hinge' },
  { value: 'ipo', label: 'IPO' },
  { value: 'kto_pair', label: 'KTO Pair' },
  { value: 'orpo', label: 'ORPO' },
  { value: 'simpo', label: 'SimPO' },
]

const ROPE_SCALING = ['none', 'linear', 'dynamic', 'yarn', 'llama3']
const QUANT_BITS = ['none', '8', '4', '3', '2']
const QUANT_METHODS = ['bnb', 'hqq', 'eetq']
const BOOSTERS = ['auto', 'flashattn2', 'unsloth', 'liger_kernel']
const REPORT_TO = ['none', 'wandb', 'mlflow', 'neptune', 'tensorboard', 'trackio']
const DEEPSPEED_STAGES = ['none', '2', '3']

interface TrainingConfig {
  stage: string
  model_name_or_path: string
  template: string
  finetuning_type: string
  dataset: string
  dataset_dir: string
  learning_rate: number
  num_train_epochs: number
  cutoff_len: number
  per_device_train_batch_size: number
  gradient_accumulation_steps: number
  lr_scheduler_type: string
  max_grad_norm: number
  logging_steps: number
  save_steps: number
  warmup_steps: number
  output_dir: string
  bf16: boolean
  fp16: boolean
  pure_bf16: boolean
  lora_rank: number
  lora_alpha: number
  lora_dropout: number
  lora_target: string
  loraplus_lr_ratio: number
  use_rslora: boolean
  use_dora: boolean
  use_pissa: boolean
  create_new_adapter: boolean
  quantization_bit: string
  quantization_method: string
  rope_scaling: string
  val_size: number
  max_samples: number
  neftune_alpha: number
  packing: boolean
  train_on_prompt: boolean
  mask_history: boolean
  resize_vocab: boolean
  pref_beta: number
  pref_loss: string
  pref_ftx: number
  ppo_score_norm: boolean
  ppo_whiten_rewards: boolean
  freeze_trainable_layers: number
  freeze_trainable_modules: string
  additional_target: string
  use_galore: boolean
  galore_rank: number
  galore_update_interval: number
  galore_scale: number
  galore_target: string
  use_apollo: boolean
  apollo_rank: number
  apollo_update_interval: number
  apollo_scale: number
  apollo_target: string
  use_badam: boolean
  badam_mode: string
  badam_switch_mode: string
  badam_switch_interval: number
  badam_update_ratio: number
  report_to: string
  project_name: string
  ds_stage: string
  ds_offload: boolean
  booster: string
  extra_args: string
}

export function TrainPage() {
  const { status, progress, startTraining, stopTraining } = useTraining()
  const { selectedModel, setSelectedModel, templates, setTemplates } = useApp()
  const isRunning = status === 'running'
  
  const [activeSubTab, setActiveSubTab] = useState<'freeze' | 'rlhf' | 'galore' | 'apollo' | 'badam'>('freeze')
  const [config, setConfig] = useState<TrainingConfig>({
    stage: 'sft',
    model_name_or_path: '',
    template: 'default',
    finetuning_type: 'lora',
    dataset: '',
    dataset_dir: 'data',
    learning_rate: 5e-5,
    num_train_epochs: 3.0,
    cutoff_len: 2048,
    per_device_train_batch_size: 2,
    gradient_accumulation_steps: 8,
    lr_scheduler_type: 'cosine',
    max_grad_norm: 1.0,
    logging_steps: 5,
    save_steps: 100,
    warmup_steps: 0,
    output_dir: `output/train_${Date.now()}`,
    bf16: true,
    fp16: false,
    pure_bf16: false,
    lora_rank: 8,
    lora_alpha: 16,
    lora_dropout: 0.05,
    lora_target: 'all',
    loraplus_lr_ratio: 0,
    use_rslora: false,
    use_dora: false,
    use_pissa: false,
    create_new_adapter: false,
    quantization_bit: 'none',
    quantization_method: 'bnb',
    rope_scaling: 'none',
    val_size: 0,
    max_samples: 100000,
    neftune_alpha: 0,
    packing: false,
    train_on_prompt: false,
    mask_history: false,
    resize_vocab: false,
    pref_beta: 0.1,
    pref_loss: 'sigmoid',
    pref_ftx: 0,
    ppo_score_norm: false,
    ppo_whiten_rewards: false,
    freeze_trainable_layers: 2,
    freeze_trainable_modules: 'all',
    additional_target: '',
    use_galore: false,
    galore_rank: 16,
    galore_update_interval: 200,
    galore_scale: 2.0,
    galore_target: 'all',
    use_apollo: false,
    apollo_rank: 16,
    apollo_update_interval: 200,
    apollo_scale: 32.0,
    apollo_target: 'all',
    use_badam: false,
    badam_mode: 'layer',
    badam_switch_mode: 'ascending',
    badam_switch_interval: 50,
    badam_update_ratio: 0.05,
    report_to: 'none',
    project_name: 'huggingface',
    ds_stage: 'none',
    ds_offload: false,
    booster: 'auto',
    extra_args: '',
  })

  const [previewCommand, setPreviewCommand] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const { data: models = [], isLoading: loadingModels } = useQuery<Model[]>({
    queryKey: ['models', 'train'],
    queryFn: () => api.models.getFlat(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: apiTemplates = [], isLoading: loadingTemplates } = useQuery<string[]>({
    queryKey: ['models', 'templates'],
    queryFn: () => api.models.getTemplates(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: availableDatasets = [], isLoading: loadingDatasets } = useQuery<any[]>({
    queryKey: ['models', 'datasets'],
    queryFn: () => api.training.getDatasets(),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (apiTemplates.length > 0 && templates.length === 0) {
      setTemplates(apiTemplates)
    }
  }, [apiTemplates, templates.length, setTemplates])

  useEffect(() => {
    if (selectedModel && selectedModel.path) {
      setConfig(prev => ({
        ...prev,
        model_name_or_path: selectedModel.path,
        template: selectedModel.template || prev.template,
      }))
    }
  }, [selectedModel])

  const handleModelSelect = (modelPath: string) => {
    const model = models.find(m => m.path === modelPath)
    if (model) {
      setConfig(prev => ({
        ...prev,
        model_name_or_path: modelPath,
        template: model.template || prev.template,
      }))
      setSelectedModel({
        name: model.name,
        path: model.path,
        template: model.template,
      })
    }
  }

  const updateConfig = (key: keyof TrainingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  // Helper for premium segmented controls
  const SegmentedControl = ({ 
    options, 
    value, 
    onChange, 
    columns = 3 
  }: { 
    options: { value: string, label: string }[], 
    value: string, 
    onChange: (v: string) => void,
    columns?: number
  }) => (
    <div className={cn(
      "grid gap-1.5 p-1 rounded-xl bg-muted/20 border border-primary/5 shadow-inner-glow",
      columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
    )}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border border-transparent truncate",
            value === opt.value
              ? "bg-primary/20 text-primary border-primary/30 shadow-neon-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )

  const handlePreview = async () => {
    const response = await api.training.preview(config as any) as { command: string }
    setPreviewCommand(response.command)
  }

  const handleStart = async () => {
    try {
      await startTraining(config as any)
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Training started...`])
    } catch (error) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${error}`])
    }
  }

  const handleStop = async () => {
    await stopTraining()
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Training stopped`])
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            Training Configuration
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Configure and run model fine-tuning</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Badge variant={isRunning ? 'default' : 'secondary'} className={cn(
            "whitespace-nowrap transition-all",
            isRunning ? 'bg-neon-amber text-white animate-pulse' : ''
          )}>
            {isRunning ? '● Training' : 'Ready'}
          </Badge>
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <div className="h-2 w-2 rounded-full bg-neon-green" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Backend Connected</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="basic" className="flex-1">
        <div className="mb-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 h-auto w-full gap-1 brand-gradient-subtle p-1 border border-primary/10">
            <TabsTrigger value="basic" className="gap-1.5 py-2.5 sm:py-2"><Settings className="w-3.5 h-3.5" /> Basic</TabsTrigger>
            <TabsTrigger value="model" className="gap-1.5 py-2.5 sm:py-2"><Cpu className="w-3.5 h-3.5" /> Model</TabsTrigger>
            <TabsTrigger value="hyperparams" className="gap-1.5 py-2.5 sm:py-2"><Brain className="w-3.5 h-3.5" /> Hyperparams</TabsTrigger>
            <TabsTrigger value="lora" className="gap-1.5 py-2.5 sm:py-2"><Layers className="w-3.5 h-3.5" /> LoRA</TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5 py-2.5 sm:py-2"><Zap className="w-3.5 h-3.5" /> Advanced</TabsTrigger>
            <TabsTrigger value="output" className="gap-1.5 py-2.5 sm:py-2"><Activity className="w-3.5 h-3.5" /> Output</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4">
          <TabsContent value="basic">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Settings</CardTitle>
                  <CardDescription>Core training configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Training Stage</label>
                      <InfoTooltip content="The phase of training (SFT, Reward Modeling, PPO, etc.)." impact="Determines the objective function and data format used for the run." />
                    </div>
                    <Select value={config.stage} onValueChange={(v) => updateConfig('stage', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_STAGES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Dataset Directory</label>
                      <InfoTooltip content="Path to the folder containing your dataset files." impact="Necessary for the system to locate the training data." />
                    </div>
                    <Input 
                      value={config.dataset_dir} 
                      onChange={(e) => updateConfig('dataset_dir', e.target.value)}
                      placeholder="data"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Dataset</label>
                      <InfoTooltip content="Specific dataset(s) to use for training." impact="Defines the knowledge and task-specific skills the model will acquire." />
                    </div>
                    {loadingDatasets ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Loading datasets...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Select value={config.dataset} onValueChange={(v) => updateConfig('dataset', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a dataset" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {availableDatasets.map(d => (
                              <SelectItem key={d.path} value={d.path}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input 
                          value={config.dataset} 
                          onChange={(e) => updateConfig('dataset', e.target.value)}
                          placeholder="Or enter custom path: alpaca, oasst1"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Comma-separated dataset names from data/ directory</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Max Samples</label>
                      <InfoTooltip content="Maximum number of examples to use from the dataset." impact="Fewer samples speed up training but may reduce quality." />
                    </div>
                    <Input 
                      type="number"
                      value={config.max_samples} 
                      onChange={(e) => updateConfig('max_samples', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Model Settings</CardTitle>
                  <CardDescription>Model selection and template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Model</label>
                        <InfoTooltip content="Path or ID of the base model to fine-tune." impact="Crucial for loading the correct weights and tokenizer." />
                      </div>
                      <Link to="/models" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Browse Models <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {loadingModels ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Loading models...
                      </div>
                    ) : (
                      <Select value={config.model_name_or_path} onValueChange={handleModelSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {models.slice(0, 100).map(model => (
                            <SelectItem key={model.path} value={model.path}>
                              <div className="flex items-center gap-2">
                                <Bot className="w-4 h-4" />
                                <span>{model.name}</span>
                                <span className="text-xs text-muted-foreground truncate">({model.path})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input 
                      value={config.model_name_or_path} 
                      onChange={(e) => updateConfig('model_name_or_path', e.target.value)}
                      placeholder="Or enter custom path: meta-llama/Llama-3.1-8B-Instruct"
                      className="mt-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Template</label>
                      <InfoTooltip content="Conversation template for the model (e.g., Llama 3, Qwen)." impact="Ensures inputs are formatted correctly for the specific model architecture." />
                    </div>
                    {loadingTemplates && templates.length === 0 ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Loading templates...
                      </div>
                    ) : (
                      <Select value={config.template} onValueChange={(v) => updateConfig('template', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          <SelectItem value="default">Default</SelectItem>
                          {templates.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Fine-tuning Type</label>
                      <InfoTooltip content="Common methods like LoRA, Full Parameter, or Freeze." impact="LoRA is the most memory-efficient; Full is the most thorough but VRAM-intensive." />
                    </div>
                    <Select value={config.finetuning_type} onValueChange={(v) => updateConfig('finetuning_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FINETUNING_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Output Directory</label>
                      <InfoTooltip content="Where your model checkpoints and final weights are saved." impact="Ensure this folder is on a drive with enough free space (GBs)." />
                    </div>
                    <Input 
                      value={config.output_dir} 
                      onChange={(e) => updateConfig('output_dir', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="model">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Model Optimization</CardTitle>
                <CardDescription>Quantization, boosters, and architecture settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Quantization Bit</label>
                        <InfoTooltip content="Precision level of the model weights (4-bit, 8-bit)." impact="Lower bits save VRAM at the cost of slight accuracy degradation." />
                      </div>
                      <SegmentedControl
                        options={QUANT_BITS.map(b => ({ value: b, label: b === 'none' ? 'None' : `${b}-bit` }))}
                        value={config.quantization_bit}
                        onChange={(v) => updateConfig('quantization_bit', v)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Quantization Method</label>
                        <InfoTooltip content="Technique for model compression (e.g., 4-bit, 8-bit)." impact="Reduces VRAM usage significantly with minimal quality loss." />
                      </div>
                      <SegmentedControl
                        options={QUANT_METHODS.map(m => ({ value: m, label: m.toUpperCase() }))}
                        value={config.quantization_method}
                        onChange={(v) => updateConfig('quantization_method', v)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Booster</label>
                        <InfoTooltip content="Acceleration backend like FlashAttention or Unsloth." impact="Speeds up training and reduces memory overhead on supported GPUs." />
                      </div>
                      <SegmentedControl
                        options={BOOSTERS.map(b => ({ value: b, label: b }))}
                        value={config.booster}
                        onChange={(v) => updateConfig('booster', v)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center">
                        <label className="text-sm font-medium">RoPE Scaling</label>
                        <InfoTooltip content="Technique to expand the model's effective context window." impact="Enables processing of much longer text sequences during training." />
                      </div>
                      <SegmentedControl
                        options={ROPE_SCALING.map(r => ({ value: r, label: r === 'none' ? 'None' : r }))}
                        value={config.rope_scaling}
                        onChange={(v) => updateConfig('rope_scaling', v)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium">Dataset Selection</h3>
                      <InfoTooltip content="Choose the JSON/JSONL files for training." impact="The quality and relevance of this data is the most important factor in model performance." />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Resize Vocabulary</label>
                        <InfoTooltip content="Aligns model embeddings with a potentially new/expanded tokenizer." impact="Necessary if you've added new special tokens or a custom vocabulary." />
                      </div>
                      <Switch
                        checked={config.resize_vocab}
                        onCheckedChange={(checked) => updateConfig('resize_vocab', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hyperparams">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hyperparameters</CardTitle>
                <CardDescription>Training hyperparameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Learning Rate: <span className="text-primary tabular-nums">{config.learning_rate.toExponential()}</span></label>
                      <InfoTooltip content="Determines how fast the model weights are adjusted." impact="Too high causes instability; too low makes training extremely slow." />
                    </div>
                    <Slider 
                      value={[Math.log10(config.learning_rate)]} 
                      min={-6} max={-2} step={0.1}
                      onValueChange={([v]) => updateConfig('learning_rate', Math.pow(10, v))}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1e-6</span>
                      <span>1e-2</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Epochs: <span className="text-primary tabular-nums">{config.num_train_epochs}</span></label>
                      <InfoTooltip content="Number of complete passes through the training data." impact="More epochs improve learning but increase the risk of overfitting." />
                    </div>
                    <Slider 
                      value={[config.num_train_epochs]} 
                      min={0.1} max={20} step={0.1}
                      onValueChange={([v]) => updateConfig('num_train_epochs', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Cutoff Length: <span className="text-primary tabular-nums">{config.cutoff_len}</span></label>
                      <InfoTooltip content="Maximum token limit for each training sequence." impact="Directly impacts VRAM usage; higher values allow for longer context." />
                    </div>
                    <Slider 
                      value={[config.cutoff_len]} 
                      min={4} max={131072} step={4}
                      onValueChange={([v]) => updateConfig('cutoff_len', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Batch Size: <span className="text-primary tabular-nums">{config.per_device_train_batch_size}</span></label>
                      <InfoTooltip content="Number of samples processed in one training step." impact="Larger batches stabilize training but require more GPU memory." />
                    </div>
                    <Slider 
                      value={[config.per_device_train_batch_size]} 
                      min={1} max={64} step={1}
                      onValueChange={([v]) => updateConfig('per_device_train_batch_size', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Gradient Accumulation: <span className="text-primary tabular-nums">{config.gradient_accumulation_steps}</span></label>
                      <InfoTooltip content="Number of steps to accumulate gradients before updating weights." impact="Simulates a larger batch size without increasing VRAM consumption." />
                    </div>
                    <Slider 
                      value={[config.gradient_accumulation_steps]} 
                      min={1} max={128} step={1}
                      onValueChange={([v]) => updateConfig('gradient_accumulation_steps', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Max Grad Norm: <span className="text-primary tabular-nums">{config.max_grad_norm}</span></label>
                      <InfoTooltip content="Clips gradients to this value if they exceed the limit." impact="Prevents 'Exploding Gradients' and stabilizes training on long sequences." />
                    </div>
                    <Slider 
                      value={[config.max_grad_norm]} 
                      min={0.1} max={10} step={0.1}
                      onValueChange={([v]) => updateConfig('max_grad_norm', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Warmup Steps: <span className="text-primary tabular-nums">{config.warmup_steps}</span></label>
                      <InfoTooltip content="Number of initial steps where LR gradually increases." impact="Helps the model stabilize before hitting the peak learning rate." />
                    </div>
                    <Slider 
                      value={[config.warmup_steps]} 
                      min={0} max={5000} step={10}
                      onValueChange={([v]) => updateConfig('warmup_steps', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Validation Size: <span className="text-primary tabular-nums">{config.val_size.toFixed(2)}</span></label>
                      <InfoTooltip content="Portion of the data reserved for validation." impact="Helpful for monitoring overfitting; common values are 0.05 to 0.1." />
                    </div>
                    <Slider 
                      value={[config.val_size * 100]} 
                      min={0} max={50} step={1}
                      onValueChange={([v]) => updateConfig('val_size', v / 100)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">LR Scheduler</label>
                    <InfoTooltip content="Strategy for adjusting the learning rate during training." impact="'Cosine' is generally recommended for smooth, efficient convergence." />
                  </div>
                  <SegmentedControl
                    options={LR_SCHEDULERS.map(s => ({ value: s, label: s }))}
                    value={config.lr_scheduler_type}
                    onChange={(v) => updateConfig('lr_scheduler_type', v)}
                    columns={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Compute Type</label>
                  <SegmentedControl
                    options={COMPUTE_TYPES}
                    value={config.bf16 ? 'bf16' : config.fp16 ? 'fp16' : config.pure_bf16 ? 'pure_bf16' : 'fp32'}
                    onChange={(v) => {
                      updateConfig('bf16', v === 'bf16')
                      updateConfig('fp16', v === 'fp16')
                      updateConfig('pure_bf16', v === 'pure_bf16')
                    }}
                    columns={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lora">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">LoRA Settings</CardTitle>
                <CardDescription>Low-Rank Adaptation parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">LoRA Rank: <span className="text-primary tabular-nums">{config.lora_rank}</span></label>
                      <InfoTooltip content="Determines the dimension (capacity) of the LoRA matrices." impact="Higher rank allows more complex learning but increases VRAM usage." />
                    </div>
                    <Slider 
                      value={[config.lora_rank]} 
                      min={1} max={256} step={1}
                      onValueChange={([v]) => updateConfig('lora_rank', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">LoRA Alpha: <span className="text-primary tabular-nums">{config.lora_alpha}</span></label>
                      <InfoTooltip content="Scaling factor applied to the learned LoRA weights." impact="Works with Rank to control the magnitude of model adjustments." />
                    </div>
                    <Slider 
                      value={[config.lora_alpha]} 
                      min={1} max={512} step={1}
                      onValueChange={([v]) => updateConfig('lora_alpha', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">LoRA Dropout: <span className="text-primary tabular-nums">{config.lora_dropout.toFixed(2)}</span></label>
                      <InfoTooltip content="Probability of randomly disabling neurons during tuning." impact="Acts as a regularizer to prevent 'memorization' or overfitting." />
                    </div>
                    <Slider 
                      value={[config.lora_dropout * 100]} 
                      min={0} max={50} step={1}
                      onValueChange={([v]) => updateConfig('lora_dropout', v / 100)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">LoRA+ LR Ratio: <span className="text-primary tabular-nums">{config.loraplus_lr_ratio}</span></label>
                      <InfoTooltip content="Learning rate ratio for the B matrix in LoRA+." impact="Optimizes the learning process by using different LRs for different LoRA matrices." />
                    </div>
                    <Slider 
                      value={[config.loraplus_lr_ratio]} 
                      min={0} max={64} step={1}
                      onValueChange={([v]) => updateConfig('loraplus_lr_ratio', v)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">LoRA Target Modules</label>
                    <InfoTooltip content="Specific model layers (e.g. q_proj, v_proj) to be adapted." impact="Specifying 'all' is usually safest for general fine-tuning." />
                  </div>
                  <Input 
                    value={config.lora_target} 
                    onChange={(e) => updateConfig('lora_target', e.target.value)}
                    placeholder="all, q_proj, v_proj"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">Additional Target Modules</label>
                    <InfoTooltip content="Extra layers beyond the base LoRA targets to be trained." impact="Allows for more comprehensive fine-tuning if the base targets are insufficient." />
                  </div>
                  <Input 
                    value={config.additional_target} 
                    onChange={(e) => updateConfig('additional_target', e.target.value)}
                    placeholder="Additional modules to apply LoRA"
                  />
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'use_rslora', label: 'RSLoRA', tip: 'Rank-Stabilized LoRA for better stability.' },
                    { key: 'use_dora', label: 'DoRA', tip: 'Weight-Decomposed LoRA for better quality.' },
                    { key: 'use_pissa', label: 'PiSSA', tip: 'Principal Singular values adaptation.' },
                    { key: 'create_new_adapter', label: 'New Adapter', tip: 'Start with a fresh initialization.' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center">
                        <span className="text-sm">{item.label}</span>
                        <InfoTooltip content={item.tip} impact="Fine-tunes the mathematical approach for LoRA weight updates." />
                      </div>
                      <Switch
                        checked={config[item.key as keyof TrainingConfig] as boolean}
                        onCheckedChange={(checked) => updateConfig(item.key as keyof TrainingConfig, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

              <div className="w-full flex flex-col gap-4">
                {/* Responsive Sub-Tabs Grid */}
                <div>
                  <div className="grid grid-cols-2 xs:grid-cols-3 md:flex md:w-max gap-1 p-1 bg-muted/20 border border-primary/5 rounded-xl">
                    {[
                      { id: 'freeze', label: 'Freeze', icon: Info },
                      { id: 'rlhf', label: 'RLHF', icon: Heart },
                      { id: 'galore', label: 'GaLorE', icon: Sparkles },
                      { id: 'apollo', label: 'Apollo', icon: Cpu },
                      { id: 'badam', label: 'BAdam', icon: Box },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                          activeSubTab === tab.id 
                            ? "bg-primary/20 text-primary shadow-neon-sm" 
                            : "text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

              {/* Sub-Tab Content */}
              <Card className="flex-1 glass-card border-primary/10 w-full min-h-[450px]">
                <CardContent className="pt-6">
                  {activeSubTab === 'freeze' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <label className="text-sm font-medium">Freeze Trainable Layers: <span className="text-primary tabular-nums">{config.freeze_trainable_layers}</span></label>
                          <InfoTooltip content="Number of initial layers to keep frozen (un-trainable)." impact="Reduces memory usage and prevents catastrophic forgetting by locking base knowledge." />
                        </div>
                        <Slider 
                          value={[config.freeze_trainable_layers]} 
                          min={-128} max={128} step={1}
                          onValueChange={([v]) => updateConfig('freeze_trainable_layers', v)}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <label className="text-sm font-medium">Freeze Trainable Modules</label>
                          <InfoTooltip content="Specific layer names or modules to exclude from training." impact="Highly-specific control over which parts of the model remain static." />
                        </div>
                        <Input 
                          value={config.freeze_trainable_modules} 
                          onChange={(e) => updateConfig('freeze_trainable_modules', e.target.value)}
                          placeholder="all"
                        />
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'rlhf' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <label className="text-sm font-medium">Preference Beta: <span className="text-primary tabular-nums">{config.pref_beta.toFixed(2)}</span></label>
                          <InfoTooltip content="Weight of the KL divergence penalty (common: 0.1)." impact="Prevents the model from diverging too far from the base behavior during RLHF." />
                        </div>
                        <Slider 
                          value={[config.pref_beta * 100]} 
                          min={0} max={100} step={1}
                          onValueChange={([v]) => updateConfig('pref_beta', v / 100)}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <label className="text-sm font-medium">Preference Loss</label>
                          <InfoTooltip content="Loss function for alignment (Sigmoid, IPO, KTO)." impact="Determines how the model learns from preferred vs rejected samples." />
                        </div>
                        <Select value={config.pref_loss} onValueChange={(v) => updateConfig('pref_loss', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PREF_LOSSES.map(l => (
                              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <label className="text-sm font-medium">Preference FTX: <span className="text-primary tabular-nums">{config.pref_ftx}</span></label>
                          <InfoTooltip content="Coefficient for the supervised fine-tuning loss during DPO/RLHF." impact="Balances traditional SFT learning with preference alignment for better stability." />
                        </div>
                        <Slider 
                          value={[config.pref_ftx]} 
                          min={0} max={10} step={0.1}
                          onValueChange={([v]) => updateConfig('pref_ftx', v)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center">
                            <span className="text-sm">PPO Score Norm</span>
                            <InfoTooltip content="Normalizes rewards to stabilize the PPO training objective." impact="Prevents score fluctuations from causing unstable weight updates." />
                          </div>
                          <Switch
                            checked={config.ppo_score_norm}
                            onCheckedChange={(checked) => updateConfig('ppo_score_norm', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center">
                            <span className="text-sm">PPO Whiten Rewards</span>
                            <InfoTooltip content="Standardizes rewards to zero mean and unit variance." impact="Helps the PPO algorithm converge faster by providing consistent reward scales." />
                          </div>
                          <Switch
                            checked={config.ppo_whiten_rewards}
                            onCheckedChange={(checked) => updateConfig('ppo_whiten_rewards', checked)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'galore' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">Enable GaLorE</span>
                          <InfoTooltip content="Gradient Low-Rank Projection optimization." impact="Enables full-parameter training on consumer GPUs with high VRAM efficiency." />
                        </div>
                        <Switch
                          checked={config.use_galore}
                          onCheckedChange={(checked) => updateConfig('use_galore', checked)}
                        />
                      </div>
                      {config.use_galore && (
                        <div className="space-y-6 pt-2">
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <label className="text-sm font-medium">GaLorE Rank: <span className="text-primary tabular-nums">{config.galore_rank}</span></label>
                              <InfoTooltip content="Rank of the projection matrix for GaLorE gradients." impact="Higher rank improves learning accuracy but consumes more VRAM." />
                            </div>
                            <Slider 
                              value={[config.galore_rank]} 
                              min={1} max={256} step={1}
                              onValueChange={([v]) => updateConfig('galore_rank', v)}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <label className="text-sm font-medium">Update Interval: <span className="text-primary tabular-nums">{config.galore_update_interval}</span></label>
                              <InfoTooltip content="Steps between re-projecting the GaLorE gradients." impact="Frequent updates keep the gradient estimate fresh but add computational overhead." />
                            </div>
                            <Slider 
                              value={[config.galore_update_interval]} 
                              min={1} max={1000} step={10}
                              onValueChange={([v]) => updateConfig('galore_update_interval', v)}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <label className="text-sm font-medium">Scale: <span className="text-primary tabular-nums">{config.galore_scale}</span></label>
                              <InfoTooltip content="Scaling factor for the projected gradients in GaLorE." impact="Adjusts the magnitude of weight updates; tune if training is unstable." />
                            </div>
                            <Slider 
                              value={[config.galore_scale]} 
                              min={0} max={100} step={0.1}
                              onValueChange={([v]) => updateConfig('galore_scale', v)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSubTab === 'apollo' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">Enable Apollo</span>
                          <InfoTooltip content="Advanced projection optimization for extreme efficiency." impact="Further reduces training memory footprint compared to standard Adam/LoRA." />
                        </div>
                        <Switch
                          checked={config.use_apollo}
                          onCheckedChange={(checked) => updateConfig('use_apollo', checked)}
                        />
                      </div>
                      {config.use_apollo && (
                        <div className="space-y-6 pt-2">
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <label className="text-sm font-medium">Apollo Rank: <span className="text-primary tabular-nums">{config.apollo_rank}</span></label>
                              <InfoTooltip content="Compression rank for the Apollo optimizer gradients." impact="Balancing rank is key to maintaining convergence while saving VRAM." />
                            </div>
                            <Slider 
                              value={[config.apollo_rank]} 
                              min={1} max={256} step={1}
                              onValueChange={([v]) => updateConfig('apollo_rank', v)}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <label className="text-sm font-medium">Scale: <span className="text-primary tabular-nums">{config.apollo_scale}</span></label>
                              <InfoTooltip content="Gradient scaling factor for Apollo's weight updates." impact="Ensures stability during high-efficiency training sessions." />
                            </div>
                            <Slider 
                              value={[config.apollo_scale]} 
                              min={0} max={100} step={0.1}
                              onValueChange={([v]) => updateConfig('apollo_scale', v)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSubTab === 'badam' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">Enable BAdam</span>
                          <InfoTooltip content="Block-wise Adam optimizer for memory-efficient training." impact="Updates only a fraction of weights at a time, drastically cutting memory use." />
                        </div>
                        <Switch
                          checked={config.use_badam}
                          onCheckedChange={(checked) => updateConfig('use_badam', checked)}
                        />
                      </div>
                      {config.use_badam && (
                        <div className="space-y-6 pt-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <label className="text-sm font-medium">Mode</label>
                                <InfoTooltip content="Determines if blocks are selected by layer or by a fixed ratio." impact="Layer mode is usually more intuitive for standard LLM architectures." />
                              </div>
                              <SegmentedControl
                                options={[
                                  { value: 'layer', label: 'Layer' },
                                  { value: 'ratio', label: 'Ratio' }
                                ]}
                                value={config.badam_mode}
                                onChange={(v) => updateConfig('badam_mode', v)}
                                columns={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <label className="text-sm font-medium">Switch Mode</label>
                                <InfoTooltip content="Strategy for cycling through different blocks of weights." impact="Ascending/Descending cycles through layers; Random ensures even coverage." />
                              </div>
                              <SegmentedControl
                                options={[
                                  { value: 'ascending', label: 'Ascending' },
                                  { value: 'descending', label: 'Descending' },
                                  { value: 'random', label: 'Random' },
                                  { value: 'fixed', label: 'Fixed' }
                                ]}
                                value={config.badam_switch_mode}
                                onChange={(v) => updateConfig('badam_switch_mode', v)}
                                columns={4}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <label className="text-sm font-medium">Switch Interval: <span className="text-primary tabular-nums">{config.badam_switch_interval}</span></label>
                              <InfoTooltip content="Steps to train before switching to the next block of weights." impact="Larger intervals allow deeper learning per block but slow down overall coverage." />
                            </div>
                            <Slider 
                              value={[config.badam_switch_interval]} 
                              min={1} max={500} step={1}
                              onValueChange={([v]) => updateConfig('badam_switch_interval', v)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <label className="text-sm font-medium">Update Ratio: <span className="text-primary tabular-nums">{config.badam_update_ratio.toFixed(2)}</span></label>
                              <InfoTooltip content="Percentage of weights to update in each BAdam step." impact="Directly controls the VRAM vs. Convergence speed trade-off." />
                            </div>
                            <Slider 
                              value={[config.badam_update_ratio * 100]} 
                              min={0} max={50} step={1}
                              onValueChange={([v]) => updateConfig('badam_update_ratio', v / 100)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Advanced Settings</CardTitle>
                <CardDescription>NEFTune, packing, and extra options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">NEFTune Alpha: <span className="text-primary tabular-nums">{config.neftune_alpha}</span></label>
                    <InfoTooltip content="Noise factor for NEFTune (Non-Parametric Fine-Tuning)." impact="Adds noise to embeddings during training to improve model generalization." />
                  </div>
                  <Slider 
                    value={[config.neftune_alpha]} 
                    min={0} max={10} step={0.1}
                    onValueChange={([v]) => updateConfig('neftune_alpha', v)}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'packing', label: 'Sequence Packing', tip: 'Combines multiple short examples into a single sequence.' },
                    { key: 'train_on_prompt', label: 'Train on Prompt', tip: 'Includes the prompt in the loss calculation during training.' },
                    { key: 'mask_history', label: 'Mask History', tip: 'Excludes conversation history from being trained on.' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center">
                        <span className="text-sm">{item.label}</span>
                        <InfoTooltip content={item.tip} impact="Optimizes how the dataset is processed and calculated for loss." />
                      </div>
                      <Switch
                        checked={config[item.key as keyof TrainingConfig] as boolean}
                        onCheckedChange={(checked) => updateConfig(item.key as keyof TrainingConfig, checked)}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">Report To</label>
                    <InfoTooltip content="External platform(s) for logging training metrics." impact="Integrations like WandB or TensorBoard are critical for remote monitoring." />
                  </div>
                  <SegmentedControl
                    options={REPORT_TO.map(r => ({ value: r, label: r === 'none' ? 'None' : r }))}
                    value={config.report_to}
                    onChange={(v) => updateConfig('report_to', v)}
                    columns={3}
                  />
                </div>

                {config.report_to !== 'none' && (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Project Name</label>
                      <InfoTooltip content="The name of the project repository on the logging platform." impact="Helps organize your runs and compare versions on WandB/Neptune." />
                    </div>
                    <Input 
                      value={config.project_name} 
                      onChange={(e) => updateConfig('project_name', e.target.value)}
                      placeholder="huggingface"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">DeepSpeed Stage</label>
                    <InfoTooltip content="Optimization stage for DeepSpeed's ZeRO (Zero Redundancy Optimizer)." impact="Stages 2 and 3 drastically reduce VRAM by partitioning model states across GPUs." />
                  </div>
                  <SegmentedControl
                    options={DEEPSPEED_STAGES.map(s => ({ value: s, label: s === 'none' ? 'None' : `Stage ${s}` }))}
                    value={config.ds_stage}
                    onChange={(v) => updateConfig('ds_stage', v)}
                    columns={3}
                  />
                </div>

                {config.ds_stage !== 'none' && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center">
                      <span className="text-sm">DeepSpeed Offload</span>
                      <InfoTooltip content="Offloads model states to CPU RAM or Disk if VRAM is full." impact="Makes it possible to train massive models on single GPUs, albeit slower." />
                    </div>
                    <Switch
                      checked={config.ds_offload}
                      onCheckedChange={(checked) => updateConfig('ds_offload', checked)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center">
                    <label className="text-sm font-medium">Extra Arguments (JSON)</label>
                    <InfoTooltip content="Manual JSON overrides for the training engine." impact="Provides direct access to niche API parameters not exposed in the UI." />
                  </div>
                  <Input 
                    value={config.extra_args} 
                    onChange={(e) => updateConfig('extra_args', e.target.value)}
                    placeholder='{"optim": "adamw_torch"}'
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="output">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Output Settings</CardTitle>
                <CardDescription>Logging and checkpoint settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Logging Steps: <span className="text-primary tabular-nums">{config.logging_steps}</span></label>
                      <InfoTooltip content="Interval for updating loss and metric charts." impact="Frequent logging gives a smoother chart but can slightly slow down training." />
                    </div>
                    <Slider 
                      value={[config.logging_steps]} 
                      min={1} max={100} step={1}
                      onValueChange={([v]) => updateConfig('logging_steps', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Save Steps: <span className="text-primary tabular-nums">{config.save_steps}</span></label>
                      <InfoTooltip content="Interval between saving model checkpoints to disk." impact="Crucial for resuming training if the process is interrupted." />
                    </div>
                    <Slider 
                      value={[config.save_steps]} 
                      min={10} max={1000} step={10}
                      onValueChange={([v]) => updateConfig('save_steps', v)}
                    />
                  </div>
                </div>

                {/* Interlink */}
                <div className="flex gap-2 pt-2">
                  <Link to="/evaluate" className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      <LineChart className="w-4 h-4" /> Evaluate after Training <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Actions Card */}
      <Card className="mt-auto border-t border-primary/20 bg-card/30">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" /> Actions
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 group">
                <Button variant="outline" size="sm" onClick={handlePreview} className="flex-1 sm:flex-none">
                  <Eye className="w-4 h-4 mr-1" /> <span className="sm:inline">Preview</span>
                </Button>
                <InfoTooltip content="Shows the raw command line that will be executed." impact="Helps power-users verify the final argument string before starting." />
              </div>
              
              <div className="flex items-center gap-1 group">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <FolderOpen className="w-4 h-4 mr-1" /> <span className="sm:inline">Load</span>
                </Button>
                <InfoTooltip content="Load a previously saved training configuration." impact="Saves time by restoring complex hyperparameter sets." />
              </div>

              <div className="flex items-center gap-1 group">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Save className="w-4 h-4 mr-1" /> <span className="sm:inline">Save</span>
                </Button>
                <InfoTooltip content="Save the current configuration to a JSON file." impact="Persistent storage for your experimental setups." />
              </div>

              {isRunning ? (
                <div className="flex items-center gap-1 group w-full sm:w-auto mt-2 sm:mt-0">
                  <Button variant="destructive" size="sm" onClick={handleStop} className="w-full sm:w-auto">
                    <Square className="w-4 h-4 mr-1" /> Stop Training
                  </Button>
                  <InfoTooltip content="Terminates the current training process safely." impact="Stops resource consumption; partial weights should still be available in the output dir." />
                </div>
              ) : (
                <div className="flex items-center gap-1 group w-full sm:w-auto mt-2 sm:mt-0">
                  <Button size="sm" onClick={handleStart} className="w-full sm:w-auto">
                    <Play className="w-4 h-4 mr-1" /> Start Training
                  </Button>
                  <InfoTooltip content="Initializes the backend engine and starts the training job." impact="Locks resources and begins updating model weights based on your config." />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {previewCommand && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-xs font-medium mb-1 text-muted-foreground">Command Preview:</p>
              <code className="text-xs break-all font-mono">{previewCommand}</code>
            </div>
          )}
          {isRunning && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <div className="flex items-center">
                  <span>Training Progress</span>
                  <InfoTooltip content="Real-time completion percentage of the training job." impact="Helps estimate the remaining time and overall resource utilization." />
                </div>
                <span className="text-primary font-medium tabular-nums">{progress || 0}%</span>
              </div>
              <Progress value={progress || 0} className="h-2" variant="cyan" />
            </div>
          )}
          <div className="min-h-[160px] p-3 bg-muted/30 rounded-lg border border-border/50 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Training logs will appear here...</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className="whitespace-pre-wrap">{log}</p>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
