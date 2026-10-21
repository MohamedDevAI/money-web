/**
 * Live IIFL Market Feed Hook (100% Pure API Mode)
 *
 * Streams live Touchline + 5x5 L2 Market Depth quotes and Margin Balance
 * strictly from the IIFL Capital Markets' API (`iiflService`).
 * Zero simulated or mock data is used.
 */

import { useState, useEffect, useCallback } from 'react';
import { iiflService, IIFLConnectionState } from '../services/iiflService';
import { WatchlistInstrument } from '../interface';

export function useLiveMarketFeed(intervalMs = 2500) {
  const [watchlist, setWatchlist] = useState<WatchlistInstrument[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NIFTY 50');
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [cashAvailable, setCashAvailable] = useState<number>(0);
  const [marginUtilized, setMarginUtilized] = useState<number>(0);
  const [connectionState, setConnectionState] = useState<IIFLConnectionState>(() =>
    iiflService.getConnectionState()
  );

  const fetchLiveQuotes = useCallback(async () => {
    try {
      const quotes = await iiflService.getLiveWatchlistQuotes();
      if (Array.isArray(quotes) && quotes.length > 0) {
        setWatchlist(quotes);
        setSelectedSymbol((prev) =>
          quotes.some((q) => q.symbol === prev) ? prev : quotes[0].symbol
        );
      }
    } catch {
      // IIFL API not yet authenticated or reachable
    } finally {
      setConnectionState(iiflService.getConnectionState());
    }
  }, []);

  const fetchMarginBalance = useCallback(async () => {
    try {
      const bal = await iiflService.getMarginBalance();
      setCashAvailable(bal.cashAvailable);
      setMarginUtilized(bal.marginUtilized);
    } catch {
      // Ignore when unauthenticated
    }
  }, []);

  const authenticateManual = useCallback(
    async (params: {
      redirectUrlOrAuthCode?: string;
      clientId?: string;
      userSessionToken?: string;
    }) => {
      const state = await iiflService.authenticateManual(params);
      setConnectionState(state);
      if (state.marketDataConnected) {
        await Promise.all([fetchLiveQuotes(), fetchMarginBalance()]);
      }
      return state;
    },
    [fetchLiveQuotes, fetchMarginBalance]
  );

  useEffect(() => {
    iiflService.initializeSessions().then((state) => {
      setConnectionState(state);
      fetchLiveQuotes();
      fetchMarginBalance();
    });
  }, [fetchLiveQuotes, fetchMarginBalance]);

  useEffect(() => {
    if (!isLiveStreaming) return;
    const timer = setInterval(() => {
      fetchLiveQuotes();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isLiveStreaming, intervalMs, fetchLiveQuotes]);

  const activeInstrument: WatchlistInstrument | undefined =
    watchlist.find((w) => w.symbol === selectedSymbol) || watchlist[0];

  return {
    watchlist,
    selectedSymbol,
    setSelectedSymbol,
    activeInstrument,
    isLiveStreaming,
    setIsLiveStreaming,
    toggleLiveStreaming: () => setIsLiveStreaming((prev) => !prev),
    triggerManualTick: () => {
      fetchLiveQuotes();
      fetchMarginBalance();
    },
    authenticateManual,
    cashAvailable,
    marginUtilized,
    connectionState,
  };
}
