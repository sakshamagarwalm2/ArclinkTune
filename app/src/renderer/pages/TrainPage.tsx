import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { api } from '@/hooks/useApi'
import { useTraining } from '@/hooks/useTraining'
import { 
  Play, Square, Save, FolderOpen, Eye, Settings, 
  Layers, Cpu, Zap, Brain, Rocket, Activity, Bot, LineChart, ArrowRight
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            Training Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Configure and run model fine-tuning</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isRunning ? 'default' : 'secondary'} className={isRunning ? 'bg-neon-amber text-white animate-pulse' : ''}>
            {isRunning ? '● Training' : 'Ready'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="basic" className="flex-1">
        <TabsList className="grid grid-cols-6 w-fit">
          <TabsTrigger value="basic" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Basic</TabsTrigger>
          <TabsTrigger value="model" className="gap-1.5"><Cpu className="w-3.5 h-3.5" /> Model</TabsTrigger>
          <TabsTrigger value="hyperparams" className="gap-1.5"><Brain className="w-3.5 h-3.5" /> Hyperparams</TabsTrigger>
          <TabsTrigger value="lora" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> LoRA</TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> Advanced</TabsTrigger>
          <TabsTrigger value="output" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Output</TabsTrigger>
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
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Training Stage</label>
                      <InfoTooltip content="The phase of training (SFT, Reward Modeling, PPO, etc.)." impact="Determines the objective function and data format used for the run." />
                    </div>
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
                    <Input 
                      value={config.dataset} 
                      onChange={(e) => updateConfig('dataset', e.target.value)}
                      placeholder="alpaca, oasst1"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated dataset names</p>
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
                        <label className="text-sm font-medium">Model Path</label>
                        <InfoTooltip content="Path or ID of the base model to fine-tune." impact="Crucial for loading the correct weights and tokenizer." />
                      </div>
                      <Link to="/models" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Browse Models <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    <Input 
                      value={config.model_name_or_path} 
                      onChange={(e) => updateConfig('model_name_or_path', e.target.value)}
                      placeholder="meta-llama/Llama-3.1-8B-Instruct"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Template</label>
                      <InfoTooltip content="Conversation template for the model (e.g., Llama 3, Qwen)." impact="Ensures inputs are formatted correctly for the specific model architecture." />
                    </div>
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
                    <div className="flex items-center">
                      <label className="text-sm font-medium">Fine-tuning Type</label>
                      <InfoTooltip content="Common methods like LoRA, Full Parameter, or Freeze." impact="LoRA is the most memory-efficient; Full is the most thorough but VRAM-intensive." />
                    </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Quantization Bit</label>
                        <InfoTooltip content="Precision level of the model weights (4-bit, 8-bit)." impact="Lower bits save VRAM at the cost of slight accuracy degradation." />
                      </div>
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
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Quantization Method</label>
                        <InfoTooltip content="Technique for model compression (e.g., 4-bit, 8-bit)." impact="Reduces VRAM usage significantly with minimal quality loss." />
                      </div>
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
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Booster</label>
                        <InfoTooltip content="Acceleration backend like FlashAttention or Unsloth." impact="Speeds up training and reduces memory overhead on supported GPUs." />
                      </div>
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
                      <div className="flex items-center">
                        <label className="text-sm font-medium">RoPE Scaling</label>
                        <InfoTooltip content="Technique to expand the model's effective context window." impact="Enables processing of much longer text sequences during training." />
                      </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <label className="text-sm font-medium">Additional Target Modules</label>
                  <Input 
                    value={config.additional_target} 
                    onChange={(e) => updateConfig('additional_target', e.target.value)}
                    placeholder="Additional modules to apply LoRA"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            <Accordion type="multiple" className="mt-4">
              <AccordionItem value="freeze">
                <AccordionTrigger>Freeze Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Freeze Trainable Layers: <span className="text-primary tabular-nums">{config.freeze_trainable_layers}</span></label>
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
                      <div className="flex items-center">
                        <label className="text-sm font-medium">Preference Beta: <span className="text-primary tabular-nums">{config.pref_beta}</span></label>
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
                      <label className="text-sm font-medium">Preference FTX: <span className="text-primary tabular-nums">{config.pref_ftx}</span></label>
                      <Slider 
                        value={[config.pref_ftx]} 
                        min={0} max={10} step={0.1}
                        onValueChange={([v]) => updateConfig('pref_ftx', v)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <span className="text-sm">PPO Score Norm</span>
                        <Switch
                          checked={config.ppo_score_norm}
                          onCheckedChange={(checked) => updateConfig('ppo_score_norm', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <span className="text-sm">PPO Whiten Rewards</span>
                        <Switch
                          checked={config.ppo_whiten_rewards}
                          onCheckedChange={(checked) => updateConfig('ppo_whiten_rewards', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="galore">
                <AccordionTrigger>GaLorE Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
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
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">GaLorE Rank: <span className="text-primary tabular-nums">{config.galore_rank}</span></label>
                          <Slider 
                            value={[config.galore_rank]} 
                            min={1} max={256} step={1}
                            onValueChange={([v]) => updateConfig('galore_rank', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Update Interval: <span className="text-primary tabular-nums">{config.galore_update_interval}</span></label>
                          <Slider 
                            value={[config.galore_update_interval]} 
                            min={1} max={1000} step={10}
                            onValueChange={([v]) => updateConfig('galore_update_interval', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Scale: <span className="text-primary tabular-nums">{config.galore_scale}</span></label>
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
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Apollo Rank: <span className="text-primary tabular-nums">{config.apollo_rank}</span></label>
                          <Slider 
                            value={[config.apollo_rank]} 
                            min={1} max={256} step={1}
                            onValueChange={([v]) => updateConfig('apollo_rank', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Scale: <span className="text-primary tabular-nums">{config.apollo_scale}</span></label>
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
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-sm font-medium">Enable BAdam</span>
                      <Switch
                        checked={config.use_badam}
                        onCheckedChange={(checked) => updateConfig('use_badam', checked)}
                      />
                    </div>
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
                          <label className="text-sm font-medium">Switch Interval: <span className="text-primary tabular-nums">{config.badam_switch_interval}</span></label>
                          <Slider 
                            value={[config.badam_switch_interval]} 
                            min={1} max={500} step={1}
                            onValueChange={([v]) => updateConfig('badam_switch_interval', v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Update Ratio: <span className="text-primary tabular-nums">{config.badam_update_ratio.toFixed(2)}</span></label>
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
                  <label className="text-sm font-medium">NEFTune Alpha: <span className="text-primary tabular-nums">{config.neftune_alpha}</span></label>
                  <Slider 
                    value={[config.neftune_alpha]} 
                    min={0} max={10} step={0.1}
                    onValueChange={([v]) => updateConfig('neftune_alpha', v)}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'packing', label: 'Sequence Packing' },
                    { key: 'train_on_prompt', label: 'Train on Prompt' },
                    { key: 'mask_history', label: 'Mask History' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-sm">{item.label}</span>
                      <Switch
                        checked={config[item.key as keyof TrainingConfig] as boolean}
                        onCheckedChange={(checked) => updateConfig(item.key as keyof TrainingConfig, checked)}
                      />
                    </div>
                  ))}
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
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-sm">DeepSpeed Offload</span>
                    <Switch
                      checked={config.ds_offload}
                      onCheckedChange={(checked) => updateConfig('ds_offload', checked)}
                    />
                  </div>
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
                    <label className="text-sm font-medium">Logging Steps: <span className="text-primary tabular-nums">{config.logging_steps}</span></label>
                    <Slider 
                      value={[config.logging_steps]} 
                      min={1} max={100} step={1}
                      onValueChange={([v]) => updateConfig('logging_steps', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Save Steps: <span className="text-primary tabular-nums">{config.save_steps}</span></label>
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" /> Actions
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
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-xs font-medium mb-1 text-muted-foreground">Command Preview:</p>
              <code className="text-xs break-all font-mono">{previewCommand}</code>
            </div>
          )}
          {isRunning && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Training Progress</span>
                <span className="text-primary font-medium tabular-nums">{progress || 0}%</span>
              </div>
              <Progress value={progress || 0} className="h-2" variant="cyan" />
            </div>
          )}
          <div className="h-40 overflow-auto p-3 bg-muted/30 rounded-lg border border-border/50 font-mono text-xs">
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
