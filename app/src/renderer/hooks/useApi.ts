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
  downloads?: number
  likes?: number
}

export interface ModelGroup {
  groups: Record<string, Model[]>
  total: number
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

export interface GPUHealthResult {
  cuda_available: boolean
  cuda_version: string | null
  gpu_name: string | null
  gpu_count: number
  gpu_compute_capability: string | null
  tensor_test_passed: boolean
  memory_test_passed: boolean
  error: string | null
  details: Record<string, number | string>
  venv_pytorch_version?: string
  venv_cuda_available?: boolean
  venv_cuda_version?: string
}

export interface LocalModel {
  name: string
  path: string
  size: string
  local_path: string
}

export interface DownloadTask {
  task_id: string
  model_path: string
  model_name: string
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled' | 'not_found'
  progress: number
  downloaded: string
  total: string
  speed: string
  eta: string
  error?: string
  local_path?: string
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

  const datasets = {
    getInfo: () => useQuery<any>({ queryKey: ['datasets', 'info'], queryFn: () => fetchApi('/datasets/info') }),
    getSupportedFormats: () => useQuery<any>({ queryKey: ['datasets', 'formats'], queryFn: () => fetchApi('/datasets/supported-formats') }),
  }

  const settings = {
    get: () => useQuery<any>({ queryKey: ['settings'], queryFn: () => fetchApi('/settings') }),
    getAiProvider: () => useQuery<any>({ queryKey: ['settings', 'ai-provider'], queryFn: () => fetchApi('/settings/ai-provider') }),
    getOllamaModels: (baseUrl?: string) => useQuery<any>({ queryKey: ['settings', 'ollama-models', baseUrl], queryFn: () => fetchApi(`/settings/ollama-models?base_url=${encodeURIComponent(baseUrl || 'http://localhost:11434')}`) }),
    getGeminiModels: () => useQuery<any>({ queryKey: ['settings', 'gemini-models'], queryFn: () => fetchApi('/settings/gemini-models') }),
  }

  const autotune = {
    getSessions: () => useQuery<any[]>({ queryKey: ['autotune', 'sessions'], queryFn: () => fetchApi('/autotune/sessions'), refetchInterval: 10000 }),
    getSession: (sessionId: string) => useQuery<any>({ queryKey: ['autotune', 'sessions', sessionId], queryFn: () => fetchApi(`/autotune/sessions/${sessionId}`), enabled: !!sessionId, refetchInterval: 5000 }),
  }

  return {
    models,
    training,
    system,
    datasets,
    settings,
    autotune,
    fetchApi,
  }
}

export const api = {
  models: {
    getAll: () => fetchApi<ModelGroup>('/models/'),
    getFlat: () => fetchApi<Model[]>('/models/flat'),
    getGroups: () => fetchApi<{ groups: string[] }>('/models/groups'),
    getSupported: () => fetchApi<string[]>('/models/supported'),
    getLocal: () => fetchApi<LocalModel[]>('/models/local'),
    getTemplates: () => fetchApi<string[]>('/models/templates'),
    getHubs: () => fetchApi<{ id: string; name: string; icon: string }[]>('/models/hubs'),
    getModelsDir: () => fetchApi<{ path: string }>('/models/models_dir'),
    getCheckpoints: (modelName: string) => fetchApi<string[]>(`/models/checkpoints/${encodeURIComponent(modelName)}`),
    download: (body: { model_name: string; hub?: string }) => fetchApi<{ task_id?: string; error?: string }>('/models/download', { method: 'POST', body: JSON.stringify(body) }),
    getDownloadStatus: (taskId: string) => fetchApi<DownloadTask>(`/models/download/${encodeURIComponent(taskId)}`),
    getAllDownloads: () => fetchApi<DownloadTask[]>('/models/downloads'),
    cancelDownload: (taskId: string) => fetchApi<{ success: boolean }>(`/models/download/${encodeURIComponent(taskId)}`, { method: 'DELETE' }),
    deleteDownload: (taskId: string) => fetchApi<{ success: boolean }>(`/models/download/${encodeURIComponent(taskId)}/delete`, { method: 'DELETE' }),
    deleteLocalModel: (localPath: string) => fetchApi<{ success: boolean }>(`/models/local/${encodeURIComponent(localPath)}`, { method: 'DELETE' }),
    clearDownloads: () => fetchApi<{ success: boolean }>('/models/downloads/clear', { method: 'DELETE' }),
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
    getInfo: (config: Partial<TrainingConfig>) => fetchApi<any>('/training/info', { method: 'POST', body: JSON.stringify(config) }),
    saveConfig: (config: TrainingConfig, path: string) => fetchApi('/training/save', { method: 'POST', body: JSON.stringify({ config, path }) }),
    loadConfig: (path: string) => fetchApi<TrainingConfig>('/training/load', { method: 'POST', body: JSON.stringify({ path }) }),
    getComputeDevices: () => fetchApi<any>('/training/compute-devices'),
    getComputeOptions: () => fetchApi<any>('/training/compute-options'),
  },
  chat: {
    load: (config: Record<string, any>) => fetchApi('/chat/load', { method: 'POST', body: JSON.stringify(config) }),
    unload: () => fetchApi('/chat/unload', { method: 'POST' }),
    chat: (body: { messages: { role: string; content: string }[]; max_tokens?: number; temperature?: number; top_p?: number; repetition_penalty?: number; presence_penalty?: number; skip_special_tokens?: boolean }) => fetchApi('/chat/chat', { method: 'POST', body: JSON.stringify(body) }),
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
    getGpuHealth: () => fetchApi<GPUHealthResult>('/system/gpu/health'),
  },
  evaluate: {
    preview: (config: Record<string, any>) => fetchApi<{ command: string }>('/evaluate/preview', { method: 'POST', body: JSON.stringify(config) }),
    start: (config: Record<string, any>) => fetchApi<{ run_id: string; success: boolean; error?: string }>('/evaluate/start', { method: 'POST', body: JSON.stringify(config) }),
    getStatus: (runId: string) => fetchApi<{ run_id: string; status: string; progress: number; results: Record<string, number> }>(`/evaluate/status/${runId}`),
    stop: (runId: string) => fetchApi<{ success: boolean }>(`/evaluate/stop/${runId}`, { method: 'POST' }),
    getLogs: (runId: string) => fetchApi<{ logs: string[]; count: number }>(`/evaluate/logs/${runId}`),
    listRuns: () => fetchApi<{ run_id: string; status: string; progress: number }[]>('/evaluate/runs'),
  },
  export: {
    preview: (config: Record<string, any>) => fetchApi<{ command: string }>('/export/preview', { method: 'POST', body: JSON.stringify(config) }),
    start: (config: Record<string, any>) => fetchApi<{ run_id: string; success: boolean; error?: string }>('/export/start', { method: 'POST', body: JSON.stringify(config) }),
    getStatus: (runId: string) => fetchApi<{ run_id: string; status: string; progress: number; stage: string }>(`/export/status/${runId}`),
    stop: (runId: string) => fetchApi<{ success: boolean }>(`/export/stop/${runId}`, { method: 'POST' }),
    getLogs: (runId: string) => fetchApi<{ logs: string[]; count: number }>(`/export/logs/${runId}`),
    listRuns: () => fetchApi<{ run_id: string; status: string; progress: number }[]>('/export/runs'),
  },
  datasets: {
    getInfo: () => fetchApi<{ datasets: any[]; config_path: string }>('/datasets/info'),
    getSupportedFormats: () => fetchApi<any>('/datasets/supported-formats'),
    validateLocalPath: (path: string) => fetchApi<any>('/datasets/validate-local-path', { method: 'POST', body: JSON.stringify({ path }) }),
    copyToData: (path: string) => fetchApi<any>('/datasets/copy-to-data', { method: 'POST', body: JSON.stringify({ path }) }),
    searchHF: (query: string, limit?: number) => fetchApi<any>(`/datasets/hf/search?query=${encodeURIComponent(query)}&limit=${limit || 20}`),
    getHFDatasetInfo: (repoId: string) => fetchApi<any>(`/datasets/hf/${encodeURIComponent(repoId)}`),
    previewHF: (repoId: string, split?: string) => fetchApi<any>(`/datasets/hf/${encodeURIComponent(repoId)}/preview?split=${split || 'train'}`),
    validateHFFormat: (repoId: string) => fetchApi<any>(`/datasets/hf/validate-format?repo_id=${encodeURIComponent(repoId)}`),
    downloadHF: (repoId: string, splits?: string) => fetchApi<any>('/datasets/hf/' + encodeURIComponent(repoId) + '/download', { method: 'POST', body: JSON.stringify({ splits }) }),
  },
  settings: {
    get: () => fetchApi<any>('/settings'),
    update: (data: any) => fetchApi<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    getAiProvider: () => fetchApi<any>('/settings/ai-provider'),
    updateAiProvider: (config: any) => fetchApi<any>('/settings/ai-provider', { method: 'PUT', body: JSON.stringify(config) }),
    testGemini: (apiKey: string, model: string) => fetchApi<any>('/settings/test-gemini', { method: 'POST', body: JSON.stringify({ api_key: apiKey, model }) }),
    testOllama: (baseUrl: string, model: string) => fetchApi<any>('/settings/test-ollama', { method: 'POST', body: JSON.stringify({ base_url: baseUrl, model }) }),
    getOllamaModels: (baseUrl?: string) => fetchApi<any>(`/settings/ollama-models?base_url=${encodeURIComponent(baseUrl || 'http://localhost:11434')}`),
    getGeminiModels: () => fetchApi<any>('/settings/gemini-models'),
  },
  autotune: {
    start: (config: any) => fetchApi<{ session_id: string; status: string }>('/autotune/start', { method: 'POST', body: JSON.stringify(config) }),
    getSessions: () => fetchApi<any[]>('/autotune/sessions'),
    getSession: (sessionId: string) => fetchApi<any>(`/autotune/sessions/${sessionId}`),
    pause: (sessionId: string) => fetchApi<any>(`/autotune/sessions/${sessionId}/pause`, { method: 'POST' }),
    resume: (sessionId: string) => fetchApi<any>(`/autotune/sessions/${sessionId}/resume`, { method: 'POST' }),
    stop: (sessionId: string) => fetchApi<any>(`/autotune/sessions/${sessionId}/stop`, { method: 'POST' }),
    getReport: (sessionId: string, format?: string) => fetchApi<any>(`/autotune/sessions/${sessionId}/report?format=${format || 'json'}`),
    getBestConfig: (sessionId: string) => fetchApi<string>(`/autotune/sessions/${sessionId}/best-config`),
    delete: (sessionId: string) => fetchApi<any>(`/autotune/sessions/${sessionId}`, { method: 'DELETE' }),
    validateProvider: (config: any) => fetchApi<any>('/autotune/validate-ai-provider', { method: 'POST', body: JSON.stringify(config) }),
  },
}
