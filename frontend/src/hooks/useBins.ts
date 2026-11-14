import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBins, createBin, updateBin, deleteBin, getBinByQr } from '../api/client';
import type { BinCreate, BinUpdate } from '../types';

export function useBins() {
  return useQuery({
    queryKey: ['bins'],
    queryFn: getBins,
  });
}

export function useBinByQr(qrCode: string | null) {
  return useQuery({
    queryKey: ['bins', 'qr', qrCode],
    queryFn: () => getBinByQr(qrCode!),
    enabled: !!qrCode,
  });
}

export function useCreateBin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bin: BinCreate) => createBin(bin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
    },
  });
}

export function useUpdateBin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bin }: { id: number; bin: BinUpdate }) => updateBin(id, bin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
    },
  });
}

export function useDeleteBin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
    },
  });
}
