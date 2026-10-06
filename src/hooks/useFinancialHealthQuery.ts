import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  financialHealthApi,
  FinancialHealthRecord,
  FireSettings,
} from '../services/financialHealthService';
import { QUERY_KEYS } from './queryKeys';
import { InvestmentHolding } from '../interface';

export function useFinancialHealthQuery() {
  return useQuery<FinancialHealthRecord, Error>({
    queryKey: QUERY_KEYS.FINANCIAL_HEALTH,
    queryFn: financialHealthApi.getHealthRecord,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateHealthAnswerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pillarId,
      fulfilled,
    }: {
      pillarId: string;
      fulfilled: boolean;
    }) => financialHealthApi.updateHealthAnswer(pillarId, fulfilled),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.FINANCIAL_HEALTH, data);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_HEALTH });
    },
  });
}

export function useUpdateFireSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      settings,
    }: {
      settings: Partial<FireSettings>;
    }) => financialHealthApi.updateFireSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.FINANCIAL_HEALTH, data);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_HEALTH });
    },
  });
}

export function useSyncFinancialHealthMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      holdings: InvestmentHolding[];
      cashLiquidity: number;
      debtLiabilities: number;
      activeSipMonthly: number;
      portfolioValue: number;
    }) => financialHealthApi.syncFinancialHealth(params),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.FINANCIAL_HEALTH, data);
    },
  });
}
