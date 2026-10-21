import { useState, useEffect, useCallback } from 'react';
import { INITIAL_WATCHLIST, simulateMarketTick } from '../domain/marketSimulator';
import { WatchlistInstrument } from '../interface';

export function useLiveMarketFeed(intervalMs = 2200) {
  const [watchlist, setWatchlist] = useState<WatchlistInstrument[]>(INITIAL_WATCHLIST);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(INITIAL_WATCHLIST[0].symbol);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);

  const triggerManualTick = useCallback(() => {
    setWatchlist((prev) => simulateMarketTick(prev));
  }, []);

  useEffect(() => {
    if (!isLiveStreaming) return;
    const timer = setInterval(() => {
      setWatchlist((prev) => simulateMarketTick(prev));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isLiveStreaming, intervalMs]);

  const activeInstrument =
    watchlist.find((w) => w.symbol === selectedSymbol) || watchlist[0];

  return {
    watchlist,
    selectedSymbol,
    setSelectedSymbol,
    activeInstrument,
    isLiveStreaming,
    setIsLiveStreaming,
    toggleLiveStreaming: () => setIsLiveStreaming((prev) => !prev),
    triggerManualTick,
  };
}
