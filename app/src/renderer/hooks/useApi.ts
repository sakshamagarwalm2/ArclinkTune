import { useQuery } from '@tanstack/react-query'

const API_BASE = 'http://localhost:8000/api'

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

export interface Model {
  name: string
  path: string
  template?: string
  downloaded: boolean
  size?: string
}

export interface TrainingConfig {
  stage: string
  model_name_or_path: string
  template: string
  finetuning_type: string
  dataset: string
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
}

export interface SystemStats {
  gpu: GPUStats[]
  cpu: CPUStats
  memory: MemoryStats
  disk: DiskStats[]
  network?: NetworkStats
  info: SystemInfo
  timestamp: string
}

export interface GPUStats {
  name: string
  driver_version: string
  utilization_percent: number
  memory_used_gb: number
  memory_total_gb: number
  memory_percent: number
  temperature_celsius: number
  power_watts: number
  fan_speed_percent: number
  clock_gpu_mhz: number
  clock_memory_mhz: number
}

export interface CPUStats {
  name: string
  cores_physical: number
  cores_logical: number
  utilization_percent: number
  per_core_percent: number[]
  frequency_mhz: number
}

export interface MemoryStats {
  ram_total_gb: number
  ram_used_gb: number
  ram_available_gb: number
  ram_percent: number
  swap_total_gb: number
  swap_used_gb: number
  swap_percent: number
}

export interface DiskStats {
  device: string
  mount_point: string
  total_gb: number
  used_gb: number
  free_gb: number
  percent: number
}

export interface NetworkStats {
  bytes_sent_gb: number
  bytes_recv_gb: number
}

export interface SystemInfo {
  platform: string
  hostname: string
  uptime_seconds: number
}

export function useApi() {
  const models = {
    getAll: () => useQuery<Model[]>({ queryKey: ['models'], queryFn: () => fetchApi('/models/') }),
    getSupported: () => useQuery<string[]>({ queryKey: ['models', 'supported'], queryFn: () => fetchApi('/models/supported') }),
    getLocal: () => useQuery<Model[]>({ queryKey: ['models', 'local'], queryFn: () => fetchApi('/models/local') }),
  }

  const training = {
    getConfig: () => useQuery<TrainingConfig>({ queryKey: ['training', 'config'], queryFn: () => fetchApi('/training/config') }),
    getDatasets: () => useQuery<{ name: string; path: string }[]>({ queryKey: ['training', 'datasets'], queryFn: () => fetchApi('/training/datasets') }),
  }

  const system = {
    getStats: () => useQuery<SystemStats>({ queryKey: ['system', 'stats'], queryFn: () => fetchApi('/system/stats'), refetchInterval: 5000 }),
    getGpu: () => useQuery<GPUStats[]>({ queryKey: ['system', 'gpu'], queryFn: () => fetchApi('/system/gpu'), refetchInterval: 5000 }),
    getCpu: () => useQuery<CPUStats>({ queryKey: ['system', 'cpu'], queryFn: () => fetchApi('/system/cpu'), refetchInterval: 5000 }),
    getMemory: () => useQuery<MemoryStats>({ queryKey: ['system', 'memory'], queryFn: () => fetchApi('/system/memory'), refetchInterval: 5000 }),
    getDisk: () => useQuery<DiskStats[]>({ queryKey: ['system', 'disk'], queryFn: () => fetchApi('/system/disk'), refetchInterval: 30000 }),
  }

  return {
    models,
    training,
    system,
    fetchApi,
  }
}

export const api = {
  models: {
    getAll: () => fetchApi<Model[]>('/models/'),
    getSupported: () => fetchApi<string[]>('/models/supported'),
    getLocal: () => fetchApi<Model[]>('/models/local'),
    getCheckpoints: (modelName: string) => fetchApi<string[]>(`/models/checkpoints/${encodeURIComponent(modelName)}`),
    download: (body: { model_name: string; hub?: string }) => fetchApi<{ task_id: string }>('/models/download', { method: 'POST', body: JSON.stringify(body) }),
    getDownloadStatus: (taskId: string) => fetchApi(`/models/download/${taskId}`),
    cancelDownload: (taskId: string) => fetchApi(`/models/download/${taskId}`, { method: 'DELETE' }),
  },
  training: {
    getConfig: () => fetchApi<TrainingConfig>('/training/config'),
    preview: (config: Partial<TrainingConfig>) => fetchApi<{ command: string }>('/training/preview', { method: 'POST', body: JSON.stringify(config) }),
    start: (config: Partial<TrainingConfig>) => fetchApi<{ run_id: string }>('/training/start', { method: 'POST', body: JSON.stringify(config) }),
    getStatus: (runId: string) => fetchApi('/training/status/' + runId),
    stop: (runId: string) => fetchApi(`/training/stop/${runId}`, { method: 'POST' }),
    getLogs: (runId: string) => fetchApi<{ logs: string }>(`/training/logs/${runId}`),
    getLoss: (runId: string) => fetchApi<{ loss_history: number[] }>(`/training/loss/${runId}`),
    getDatasets: () => fetchApi<{ name: string; path: string }[]>('/training/datasets'),
    saveConfig: (config: TrainingConfig, path: string) => fetchApi('/training/save', { method: 'POST', body: JSON.stringify({ config, path }) }),
    loadConfig: (path: string) => fetchApi<TrainingConfig>('/training/load', { method: 'POST', body: JSON.stringify({ path }) }),
  },
  chat: {
    load: (config: { model_path: string; finetuning_type?: string }) => fetchApi('/chat/load', { method: 'POST', body: JSON.stringify(config) }),
    unload: () => fetchApi('/chat/unload', { method: 'POST' }),
    chat: (body: { messages: { role: string; content: string }[]; max_tokens?: number; temperature?: number; top_p?: number }) => fetchApi('/chat/chat', { method: 'POST', body: JSON.stringify(body) }),
    getStatus: () => fetchApi('/chat/status'),
  },
  system: {
    getStats: () => fetchApi<SystemStats>('/system/stats'),
    getGpu: () => fetchApi<GPUStats[]>('/system/gpu'),
    getCpu: () => fetchApi<CPUStats>('/system/cpu'),
    getMemory: () => fetchApi<MemoryStats>('/system/memory'),
    getDisk: () => fetchApi<DiskStats[]>('/system/disk'),
    getNetwork: () => fetchApi<NetworkStats>('/system/network'),
    getInfo: () => fetchApi<SystemInfo>('/system/info'),
  },
}
