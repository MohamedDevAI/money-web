import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { tradingService } from '../services/tradingService';
import { QUERY_KEYS } from './queryKeys';
import { Trade } from '../interface';

export function useTradesQuery(options?: Partial<UseQueryOptions<Trade[], Error>>) {
  return useQuery<Trade[], Error>({
    queryKey: QUERY_KEYS.TRADES,
    queryFn: tradingService.getTrades,
    ...options,
  });
}
