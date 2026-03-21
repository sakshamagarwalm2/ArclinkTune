import { useQuery } from '@tanstack/react-query'
import { api, type SystemStats } from './useApi'

export function useSystemStats(interval = 5000) {
  const { data: stats, isLoading, error, refetch } = useQuery<SystemStats>({
    queryKey: ['systemStats'],
    queryFn: () => api.system.getStats(),
    refetchInterval: interval,
    staleTime: 2000,
  })

  return {
    stats,
    isLoading,
    error,
    refresh: refetch,
  }
}
