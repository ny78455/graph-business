import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useGraphData = () => {
  return useQuery({
    queryKey: ['graph'],
    queryFn: async () => {
      const res = await fetch('/api/graph');
      if (!res.ok) throw new Error('Failed to fetch graph');
      return res.json();
    },
    refetchOnWindowFocus: false,
    refetchInterval: 10000, // Poll every 10s for changes
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard-stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10s for changes
  });
};

export const useSchema = () => {
  return useQuery({
    queryKey: ['schema'],
    queryFn: async () => {
      const res = await fetch('/api/schema');
      if (!res.ok) throw new Error('Failed to fetch schema');
      return res.json();
    },
    staleTime: Infinity,
  });
};

export const useExecuteSQL = () => {
  return useMutation({
    mutationFn: async (sql: string) => {
      const res = await fetch('/api/query-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'SQL Execution failed');
      }
      return res.json();
    },
  });
};
