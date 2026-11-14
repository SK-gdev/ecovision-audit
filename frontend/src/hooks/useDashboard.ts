import { useQuery } from '@tanstack/react-query';
import {
  getDashboardStats,
  getRecentAudits,
  getContaminationHotspots,
  getMonthlyTrends,
  getWasteComposition,
} from '../api/client';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
  });
}

export function useRecentAudits() {
  return useQuery({
    queryKey: ['dashboard', 'recent-audits'],
    queryFn: getRecentAudits,
  });
}

export function useContaminationHotspots() {
  return useQuery({
    queryKey: ['dashboard', 'contamination-hotspots'],
    queryFn: getContaminationHotspots,
  });
}

export function useMonthlyTrends() {
  return useQuery({
    queryKey: ['dashboard', 'monthly-trends'],
    queryFn: getMonthlyTrends,
  });
}

export function useWasteComposition() {
  return useQuery({
    queryKey: ['dashboard', 'waste-composition'],
    queryFn: getWasteComposition,
  });
}
