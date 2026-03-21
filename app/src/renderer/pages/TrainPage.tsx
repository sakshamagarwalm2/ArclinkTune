import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/hooks/useApi'
import { useTraining } from '@/hooks/useTraining'
import { 
  Play, Square, Save, FolderOpen, Eye, Settings, 
  Layers, Cpu, Zap, Brain, Rocket, Activity
} from 'lucide-react'

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
  'linear', 'cosine', 'cosine_with_restarts', 'polynomial', 'constant', 'constant_with_warmup', 'inverse_sqrt', 'reduce_lr_on_plateau', '摇臂式', 'c Expo'
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
  const isRunning = status === 'running'
  
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

  const updateConfig = (key: keyof TrainingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Training Configuration</h2>
          <p className="text-sm text-muted-foreground">Configure and run fine-tuning</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isRunning ? 'warning' : 'secondary'}>
            {isRunning ? 'Training' : 'Ready'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="basic" className="flex-1">
        <TabsList className="grid grid-cols-6 w-fit">
          <TabsTrigger value="basic" className="gap-1"><Settings className="w-4 h-4" /> Basic</TabsTrigger>
          <TabsTrigger value="model" className="gap-1"><Cpu className="w-4 h-4" /> Model</TabsTrigger>
          <TabsTrigger value="hyperparams" className="gap-1"><Brain className="w-4 h-4" /> Hyperparams</TabsTrigger>
          <TabsTrigger value="lora" className="gap-1"><Layers className="w-4 h-4" /> LoRA</TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1"><Zap className="w-4 h-4" /> Advanced</TabsTrigger>
          <TabsTrigger value="output" className="gap-1"><Activity className="w-4 h-4" /> Output</TabsTrigger>
        </TabsList>

        <div className="mt-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <TabsContent value="basic">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Settings</CardTitle>
                  <CardDescription>Core training configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Training Stage</label>
                    <Select value={config.stage} onValueChange={(v) => updateConfig('stage', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_STAGES.map(stage => (
                          <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dataset Directory</label>
                    <Input 
                      value={config.dataset_dir} 
                      onChange={(e) => updateConfig('dataset_dir', e.target.value)}
                      placeholder="data"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dataset</label>
                    <Input 
                      value={config.dataset} 
                      onChange={(e) => updateConfig('dataset', e.target.value)}
                      placeholder="alpaca, oasst1"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated dataset names</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Samples</label>
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
                    <label className="text-sm font-medium">Model Path</label>
                    <Input 
                      value={config.model_name_or_path} 
                      onChange={(e) => updateConfig('model_name_or_path', e.target.value)}
                      placeholder="meta-llama/Llama-3.1-8B-Instruct"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Template</label>
                    <Select value={config.template} onValueChange={(v) => updateConfig('template', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="llama3">Llama 3</SelectItem>
                        <SelectItem value="llama2">Llama 2</SelectItem>
                        <SelectItem value="qwen">Qwen</SelectItem>
                        <SelectItem value="chatglm3">ChatGLM3</SelectItem>
                        <SelectItem value="mixtral">Mixtral</SelectItem>
                        <SelectItem value="yi">Yi</SelectItem>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="yuan">Yuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fine-tuning Type</label>
                    <Select value={config.finetuning_type} onValueChange={(v) => updateConfig('finetuning_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FINETUNING_TYPES.map(ft => (
                          <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Output Directory</label>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantization Bit</label>
                      <Select value={config.quantization_bit} onValueChange={(v) => updateConfig('quantization_bit', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUANT_BITS.map(b => (
                            <SelectItem key={b} value={b}>{b === 'none' ? 'None' : `${b}-bit`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantization Method</label>
                      <Select value={config.quantization_method} onValueChange={(v) => updateConfig('quantization_method', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUANT_METHODS.map(m => (
                            <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Booster</label>
                      <Select value={config.booster} onValueChange={(v) => updateConfig('booster', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOOSTERS.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">RoPE Scaling</label>
                      <Select value={config.rope_scaling} onValueChange={(v) => updateConfig('rope_scaling', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROPE_SCALING.map(r => (
                            <SelectItem key={r} value={r}>{r === 'none' ? 'None' : r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Resize Vocabulary</label>
                      <input 
                        type="checkbox"
                        checked={config.resize_vocab}
                        onChange={(e) => updateConfig('resize_vocab', e.target.checked)}
                        className="w-5 h-5"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Learning Rate: {config.learning_rate.toExponential()}</label>
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
                    <label className="text-sm font-medium">Epochs: {config.num_train_epochs}</label>
                    <Slider 
                      value={[config.num_train_epochs]} 
                      min={0.1} max={20} step={0.1}
                      onValueChange={([v]) => updateConfig('num_train_epochs', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cutoff Length: {config.cutoff_len}</label>
                    <Slider 
                      value={[config.cutoff_len]} 
                      min={4} max={131072} step={4}
                      onValueChange={([v]) => updateConfig('cutoff_len', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Batch Size: {config.per_device_train_batch_size}</label>
                    <Slider 
                      value={[config.per_device_train_batch_size]} 
                      min={1} max={64} step={1}
                      onValueChange={([v]) => updateConfig('per_device_train_batch_size', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gradient Accumulation: {config.gradient_accumulation_steps}</label>
                    <Slider 
                      value={[config.gradient_accumulation_steps]} 
                      min={1} max={128} step={1}
                      onValueChange={([v]) => updateConfig('gradient_accumulation_steps', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Grad Norm: {config.max_grad_norm}</label>
                    <Slider 
                      value={[config.max_grad_norm]} 
                      min={0.1} max={10} step={0.1}
                      onValueChange={([v]) => updateConfig('max_grad_norm', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Warmup Steps: {config.warmup_steps}</label>
                    <Slider 
                      value={[config.warmup_steps]} 
                      min={0} max={5000} step={10}
                      onValueChange={([v]) => updateConfig('warmup_steps', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Validation Size: {config.val_size.toFixed(2)}</label>
                    <Slider 
                      value={[config.val_size * 100]} 
                      min={0} max={50} step={1}
                      onValueChange={([v]) => updateConfig('val_size', v / 100)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">LR Scheduler</label>
                  <Select value={config.lr_scheduler_type} onValueChange={(v) => updateConfig('lr_scheduler_type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LR_SCHEDULERS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Compute Type</label>
                  <Select value={config.bf16 ? 'bf16' : config.fp16 ? 'fp16' : 'fp32'} onValueChange={(v) => {
                    updateConfig('bf16', v === 'bf16')
                    updateConfig('fp16', v === 'fp16')
                    updateConfig('pure_bf16', v === 'pure_bf16')
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPUTE_TYPES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LoRA Rank: {config.lora_rank}</label>
                    <Slider 
                      value={[config.lora_rank]} 
                      min={1} max={256} step={1}
                      onValueChange={([v]) => updateConfig('lora_rank', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">LoRA Alpha: {config.lora_alpha}</label>
                    <Slider 
                      value={[config.lora_alpha]} 
                      min={1} max={512} step={1}
                      onValueChange={([v]) => updateConfig('lora_alpha', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">LoRA Dropout: {config.lora_dropout.toFixed(2)}</label>
                    <Slider 
                      value={[config.lora_dropout * 100]} 
                      min={0} max={50} step={1}
                      onValueChange={([v]) => updateConfig('lora_dropout', v / 100)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">LoRA+ LR Ratio: {config.loraplus_lr_ratio}</label>
                    <Slider 
                      value={[config.loraplus_lr_ratio]} 
                      min={0} max={64} step={1}
                      onValueChange={([v]) => updateConfig('loraplus_lr_ratio', v)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">LoRA Target Modules</label>
                  <Input 
                    value={config.lora_target} 
                    onChange={(e) => updateConfig('lora_target', e.target.value)}
                    placeholder="all, q_proj, v_proj"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Target Modules</label>
                  <Input 
                    value={config.additional_target} 
                    onChange={(e) => updateConfig('additional_target', e.target.value)}
                    placeholder="Additional modules to apply LoRA"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.use_rslora}
                      onChange={(e) => updateConfig('use_rslora', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">RSLoRA</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.use_dora}
                      onChange={(e) => updateConfig('use_dora', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">DoRA</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.use_pissa}
                      onChange={(e) => updateConfig('use_pissa', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">PiSSA</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.create_new_adapter}
                      onChange={(e) => updateConfig('create_new_adapter', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">New Adapter</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Accordion type="multiple" className="mt-4">
              <AccordionItem value="freeze">
                <AccordionTrigger>Freeze Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Freeze Trainable Layers: {config.freeze_trainable_layers}</label>
                      <Slider 
                        value={[config.freeze_trainable_layers]} 
                        min={-128} max={128} step={1}
                        onValueChange={([v]) => updateConfig('freeze_trainable_layers', v)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Freeze Trainable Modules</label>
                      <Input 
                        value={config.freeze_trainable_modules} 
                        onChange={(e) => updateConfig('freeze_trainable_modules', e.target.value)}
                        placeholder="all"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rlhf">
                <AccordionTrigger>RLHF Settings (DPO/PPO/KTO)</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preference Beta: {config.pref_beta}</label>
                      <Slider 
                        value={[config.pref_beta * 100]} 
                        min={0} max={100} step={1}
                        onValueChange={([v]) => updateConfig('pref_beta', v / 100)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preference Loss</label>
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
                      <label className="text-sm font-medium">Preference FTX: {config.pref_ftx}</label>
                      <Slider 
                        value={[config.pref_ftx]} 
                        min={0} max={10} step={0.1}
                        onValueChange={([v]) => updateConfig('pref_ftx', v)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={config.ppo_score_norm}
                          onChange={(e) => updateConfig('ppo_score_norm', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">PPO Score Norm</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={config.ppo_whiten_rewards}
                          onChange={(e) => updateConfig('ppo_whiten_rewards', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">PPO Whiten Rewards</span>
                      </label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="galore">
                <AccordionTrigger>GaLorE Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={config.use_galore}
                        onChange={(e) => updateConfig('use_galore', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Enable GaLorE</span>
                    </label>
                    {config.use_galore && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">GaLorE Rank: {config.galore_rank}</label>
                          <Slider 
                            value={[config.galore_rank]} 
                            min={1} max={256} step={1}
                            onValueChange={([v]) => updateConfig('galore_rank', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Update Interval: {config.galore_update_interval}</label>
                          <Slider 
                            value={[config.galore_update_interval]} 
                            min={1} max={1000} step={10}
                            onValueChange={([v]) => updateConfig('galore_update_interval', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Scale: {config.galore_scale}</label>
                          <Slider 
                            value={[config.galore_scale]} 
                            min={0} max={100} step={0.1}
                            onValueChange={([v]) => updateConfig('galore_scale', v)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="apollo">
                <AccordionTrigger>Apollo Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={config.use_apollo}
                        onChange={(e) => updateConfig('use_apollo', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Enable Apollo</span>
                    </label>
                    {config.use_apollo && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Apollo Rank: {config.apollo_rank}</label>
                          <Slider 
                            value={[config.apollo_rank]} 
                            min={1} max={256} step={1}
                            onValueChange={([v]) => updateConfig('apollo_rank', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Scale: {config.apollo_scale}</label>
                          <Slider 
                            value={[config.apollo_scale]} 
                            min={0} max={100} step={0.1}
                            onValueChange={([v]) => updateConfig('apollo_scale', v)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="badam">
                <AccordionTrigger>BAdam Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={config.use_badam}
                        onChange={(e) => updateConfig('use_badam', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Enable BAdam</span>
                    </label>
                    {config.use_badam && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Mode</label>
                          <Select value={config.badam_mode} onValueChange={(v) => updateConfig('badam_mode', v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="layer">Layer</SelectItem>
                              <SelectItem value="ratio">Ratio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Switch Mode</label>
                          <Select value={config.badam_switch_mode} onValueChange={(v) => updateConfig('badam_switch_mode', v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ascending">Ascending</SelectItem>
                              <SelectItem value="descending">Descending</SelectItem>
                              <SelectItem value="random">Random</SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Switch Interval: {config.badam_switch_interval}</label>
                          <Slider 
                            value={[config.badam_switch_interval]} 
                            min={1} max={500} step={1}
                            onValueChange={([v]) => updateConfig('badam_switch_interval', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Update Ratio: {config.badam_update_ratio.toFixed(2)}</label>
                          <Slider 
                            value={[config.badam_update_ratio * 100]} 
                            min={0} max={50} step={1}
                            onValueChange={([v]) => updateConfig('badam_update_ratio', v / 100)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Advanced Settings</CardTitle>
                <CardDescription>NEFTune, packing, and extra options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">NEFTune Alpha: {config.neftune_alpha}</label>
                  <Slider 
                    value={[config.neftune_alpha]} 
                    min={0} max={10} step={0.1}
                    onValueChange={([v]) => updateConfig('neftune_alpha', v)}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.packing}
                      onChange={(e) => updateConfig('packing', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Sequence Packing</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.train_on_prompt}
                      onChange={(e) => updateConfig('train_on_prompt', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Train on Prompt</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.mask_history}
                      onChange={(e) => updateConfig('mask_history', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Mask History</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Report To</label>
                  <Select value={config.report_to} onValueChange={(v) => updateConfig('report_to', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TO.map(r => (
                        <SelectItem key={r} value={r}>{r === 'none' ? 'None' : r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.report_to !== 'none' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project Name</label>
                    <Input 
                      value={config.project_name} 
                      onChange={(e) => updateConfig('project_name', e.target.value)}
                      placeholder="huggingface"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">DeepSpeed Stage</label>
                  <Select value={config.ds_stage} onValueChange={(v) => updateConfig('ds_stage', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEEPSPEED_STAGES.map(s => (
                        <SelectItem key={s} value={s}>{s === 'none' ? 'None' : `Stage ${s}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.ds_stage !== 'none' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={config.ds_offload}
                      onChange={(e) => updateConfig('ds_offload', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">DeepSpeed Offload</span>
                  </label>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Extra Arguments (JSON)</label>
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
                    <label className="text-sm font-medium">Logging Steps: {config.logging_steps}</label>
                    <Slider 
                      value={[config.logging_steps]} 
                      min={1} max={100} step={1}
                      onValueChange={([v]) => updateConfig('logging_steps', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Save Steps: {config.save_steps}</label>
                    <Slider 
                      value={[config.save_steps]} 
                      min={10} max={1000} step={10}
                      onValueChange={([v]) => updateConfig('save_steps', v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="w-4 h-4" /> Actions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-1" /> Preview
              </Button>
              <Button variant="outline" size="sm">
                <FolderOpen className="w-4 h-4 mr-1" /> Load
              </Button>
              <Button variant="outline" size="sm">
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              {isRunning ? (
                <Button variant="destructive" size="sm" onClick={handleStop}>
                  <Square className="w-4 h-4 mr-1" /> Stop
                </Button>
              ) : (
                <Button size="sm" onClick={handleStart}>
                  <Play className="w-4 h-4 mr-1" /> Start Training
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {previewCommand && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-1">Command Preview:</p>
              <code className="text-xs break-all">{previewCommand}</code>
            </div>
          )}
          {isRunning && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Training Progress</span>
                <span>{status?.progress || 0}%</span>
              </div>
              <Progress value={status?.progress || 0} className="h-2" />
            </div>
          )}
          <div className="h-40 overflow-auto p-3 bg-muted/50 rounded-lg font-mono text-xs">
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
