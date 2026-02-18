import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// Sites
export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: () => apiClient.get('/sites').then((r) => r.data),
  });
}

// Robots
export function useRobots() {
  return useQuery({
    queryKey: ['robots'],
    queryFn: () => apiClient.get('/robots').then((r) => r.data),
    refetchInterval: 10_000,
  });
}

export function useRobot(id: string | undefined) {
  return useQuery({
    queryKey: ['robots', id],
    queryFn: () => apiClient.get(`/robots/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}

export function useRobotReadings(
  robotId: string | undefined,
  params?: { sensorType?: string; from?: string; to?: string; limit?: number; resolution?: string }
) {
  return useQuery({
    queryKey: ['robots', robotId, 'readings', params],
    queryFn: () =>
      apiClient.get(`/robots/${robotId}/telemetry`, { params }).then((r) => r.data),
    enabled: !!robotId,
    refetchInterval: 5_000,
  });
}

// Assets
export function useAssets(siteId?: string) {
  return useQuery({
    queryKey: ['assets', siteId],
    queryFn: () =>
      apiClient.get('/assets', { params: siteId ? { siteId } : {} }).then((r) => r.data),
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: () => apiClient.get(`/assets/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAssetReadings(
  assetId: string | undefined,
  params?: { sensorType?: string; from?: string; to?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['assets', assetId, 'readings', params],
    queryFn: () =>
      apiClient.get(`/assets/${assetId}/readings`, { params }).then((r) => r.data),
    enabled: !!assetId,
  });
}

// Anomalies
export function useAnomalies(params?: {
  severity?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ['anomalies', params],
    queryFn: () =>
      apiClient.get('/anomalies', { params }).then((r) => r.data),
    refetchInterval: 5_000,
  });
}

export function useAcknowledgeAnomaly(
  options?: UseMutationOptions<unknown, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/anomalies/${id}/acknowledge`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
    ...options,
  });
}

// Missions
export function useMissions(siteId?: string) {
  return useQuery({
    queryKey: ['missions', siteId],
    queryFn: () =>
      apiClient.get('/missions', { params: siteId ? { siteId } : {} }).then((r) => r.data),
    refetchInterval: 10_000,
  });
}

export function useCreateMission(
  options?: UseMutationOptions<unknown, Error, Record<string, unknown>>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post('/missions', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
    ...options,
  });
}

export function useUpdateMissionStatus(
  options?: UseMutationOptions<unknown, Error, { id: string; status: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/missions/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
    ...options,
  });
}

// Poses
export function useLatestPoses() {
  return useQuery({
    queryKey: ['poses', 'latest'],
    queryFn: () => apiClient.get('/robots/poses/latest').then((r) => r.data),
    refetchInterval: 5_000,
  });
}

export function usePoseTrail(robotId: string | undefined, params?: { from?: string; limit?: number }) {
  return useQuery({
    queryKey: ['poses', robotId, 'trail', params],
    queryFn: () => apiClient.get(`/robots/${robotId}/poses`, { params }).then((r) => r.data),
    enabled: !!robotId,
    refetchInterval: 5_000,
  });
}

// Analytics
export function useTrends(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['analytics', 'trends', params],
    queryFn: () =>
      apiClient.get('/analytics/trends', { params }).then((r) => r.data),
    refetchInterval: 15_000,
  });
}

export function useComparison(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['analytics', 'comparison', params],
    queryFn: () =>
      apiClient.get('/analytics/comparison', { params }).then((r) => r.data),
    refetchInterval: 15_000,
  });
}
