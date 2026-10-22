/**
 * Market Data & IIFL Broker Gateway Client (`iiflService.ts`)
 *
 * All external data fetching operations (Live NSE/BSE Quotes, India VIX, Historical OHLCV,
 * Technical Indicators, Option Chain, and IIFL Capital OAuth/Holdings/Positions/Orders)
 * are executed on the Spring Boot backend (`/api/market/...`).
 */

import apiClient from './apiClient';
import {
  OHLCCandle,
  OptionChainStrikeRow,
  OrderBookDepth,
  Timeframe,
  WatchlistInstrument,
} from '../interface';

export interface IIFLInstrumentMeta {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'NFO';
  exchangeSegment: number;
  exchangeCode: 'NSEEQ' | 'BSEEQ' | 'NSEFO';
  exchangeInstrumentID: number;
  nseYahooTicker: string;
  instrument: 'INDEX' | 'EQUITY';
  sector: string;
  lotSize: number;
}

export const DEFAULT_IIFL_INSTRUMENTS: IIFLInstrumentMeta[] = [
  { symbol: 'NIFTY 50', name: 'Nifty 50 Benchmark Index', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 26000, nseYahooTicker: '^NSEI', instrument: 'INDEX', sector: 'Broad Index', lotSize: 75 },
  { symbol: 'SENSEX', name: 'BSE Sensex 30 Index', exchange: 'BSE', exchangeSegment: 11, exchangeCode: 'BSEEQ', exchangeInstrumentID: 1, nseYahooTicker: '^BSESN', instrument: 'INDEX', sector: 'BSE Benchmark', lotSize: 20 },
  { symbol: 'BANKNIFTY', name: 'Nifty Bank Index', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 26009, nseYahooTicker: '^NSEBANK', instrument: 'INDEX', sector: 'Banking Index', lotSize: 30 },
  { symbol: 'BSE', name: 'BSE Ltd (Bombay Stock Exchange)', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 19585, nseYahooTicker: 'BSE.NS', instrument: 'EQUITY', sector: 'Exchange', lotSize: 125 },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 2885, nseYahooTicker: 'RELIANCE.NS', instrument: 'EQUITY', sector: 'Energy & Telecom', lotSize: 250 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 1333, nseYahooTicker: 'HDFCBANK.NS', instrument: 'EQUITY', sector: 'Private Banking', lotSize: 550 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 11536, nseYahooTicker: 'TCS.NS', instrument: 'EQUITY', sector: 'IT Services', lotSize: 175 },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 1594, nseYahooTicker: 'INFY.NS', instrument: 'EQUITY', sector: 'IT Services', lotSize: 400 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 4963, nseYahooTicker: 'ICICIBANK.NS', instrument: 'EQUITY', sector: 'Private Banking', lotSize: 700 },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 3045, nseYahooTicker: 'SBIN.NS', instrument: 'EQUITY', sector: 'PSU Banking', lotSize: 750 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 3456, nseYahooTicker: 'TATAMOTORS.NS', instrument: 'EQUITY', sector: 'Automobiles', lotSize: 550 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', exchangeSegment: 1, exchangeCode: 'NSEEQ', exchangeInstrumentID: 11483, nseYahooTicker: 'LT.NS', instrument: 'EQUITY', sector: 'Infrastructure', lotSize: 150 },
];

export interface IIFLConnectionState {
  configured: boolean;
  marketDataConnected: boolean;
  interactiveConnected: boolean;
  gatewayUrl: string;
  oauthLoginUrl: string;
  clientId?: string;
  lastSyncTime?: string;
  errorMessage?: string;
}

class SpringBootMarketClient {
  private connectionState: IIFLConnectionState = {
    configured: true,
    marketDataConnected: false,
    interactiveConnected: false,
    gatewayUrl: '/api/market',
    oauthLoginUrl: 'https://markets.iiflcapital.com/?v=1&appkey=tns1BhogmfWyBID',
  };

  private depthCache = new Map<string, OrderBookDepth>();

  public getConnectionState(): IIFLConnectionState {
    return { ...this.connectionState };
  }

  public getOAuthLoginUrl(): string {
    return this.connectionState.oauthLoginUrl;
  }

  /**
   * 1. Initialize & check Market / IIFL status via Spring Boot (`/api/market/status`)
   */
  public async initializeSessions(): Promise<IIFLConnectionState> {
    try {
      // Check if URL has ?authcode=... from IIFL OAuth redirect
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlAuthCode =
          params.get('authcode') || params.get('authCode') || params.get('code');
        const urlClientId =
          params.get('clientid') || params.get('clientId') || params.get('user_id');

        if (urlAuthCode) {
          await apiClient.post('/market/iifl/session', {
            authCode: urlAuthCode,
            clientId: urlClientId || 'MoneyHubTrader',
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const [statusRes, loginRes] = await Promise.all([
        apiClient.get('/market/status'),
        apiClient.get('/market/iifl/login-url').catch(() => ({ data: {} })),
      ]);

      const s = statusRes.data || {};
      this.connectionState = {
        configured: Boolean(s.configured ?? true),
        marketDataConnected: Boolean(s.marketDataConnected ?? true),
        interactiveConnected: Boolean(s.interactiveConnected),
        gatewayUrl: s.gatewayUrl || '/api/market',
        oauthLoginUrl:
          loginRes.data?.loginUrl ||
          'https://markets.iiflcapital.com/?v=1&appkey=tns1BhogmfWyBID',
        clientId: s.clientId,
        lastSyncTime: s.lastSyncTime || new Date().toISOString(),
        errorMessage: s.errorMessage,
      };
    } catch (err: any) {
      this.connectionState.errorMessage =
        err?.message || 'Spring Boot market service unreachable';
    }
    return this.getConnectionState();
  }

  /**
   * 2. Authenticate IIFL session via Spring Boot (`POST /api/market/iifl/session`)
   */
  public async authenticateManual(params: {
    redirectUrlOrAuthCode?: string;
    clientId?: string;
    userSessionToken?: string;
  }): Promise<IIFLConnectionState> {
    let authCode = params.redirectUrlOrAuthCode?.trim() || '';
    let clientId = params.clientId?.trim() || 'MoneyHubTrader';

    if (authCode.includes('http://') || authCode.includes('https://') || authCode.includes('?')) {
      try {
        const urlObj = new URL(
          authCode.startsWith('http') ? authCode : `https://dummy.local/${authCode}`
        );
        const extractedAuth =
          urlObj.searchParams.get('authcode') ||
          urlObj.searchParams.get('authCode') ||
          urlObj.searchParams.get('code');
        const extractedClient =
          urlObj.searchParams.get('clientid') ||
          urlObj.searchParams.get('clientId') ||
          urlObj.searchParams.get('user_id');
        if (extractedAuth) authCode = extractedAuth;
        if (extractedClient) clientId = extractedClient;
      } catch {
        // Use raw string
      }
    }

    const { data } = await apiClient.post('/market/iifl/session', {
      authCode,
      clientId,
      sessionToken: params.userSessionToken?.trim() || '',
    });

    this.connectionState = {
      ...this.connectionState,
      configured: Boolean(data?.configured ?? true),
      marketDataConnected: Boolean(data?.marketDataConnected ?? true),
      interactiveConnected: Boolean(data?.interactiveConnected),
      clientId: data?.clientId || clientId,
      lastSyncTime: data?.lastSyncTime || new Date().toISOString(),
      errorMessage: data?.errorMessage,
    };

    return this.getConnectionState();
  }

  public async clearSessions(): Promise<void> {
    await apiClient.delete('/market/iifl/session');
    this.connectionState.interactiveConnected = false;
  }

  /**
   * 3. Fetch Live NSE & BSE Watchlist & Benchmark Quotes from Spring Boot (`GET /api/market/quotes`)
   */
  public async getLiveWatchlistQuotes(): Promise<WatchlistInstrument[]> {
    const { data } = await apiClient.get<WatchlistInstrument[]>('/market/quotes');
    if (Array.isArray(data) && data.length > 0) {
      this.connectionState.marketDataConnected = true;
      this.connectionState.lastSyncTime = new Date().toISOString();
      return data;
    }
    return [];
  }

  /**
   * 4. Fetch Historical OHLCV Candles & Technical Overlays from Spring Boot (`GET /api/market/ohlc`)
   */
  public async getHistoricalOHLC(
    symbol: string,
    timeframe: Timeframe
  ): Promise<OHLCCandle[]> {
    const { data } = await apiClient.get<OHLCCandle[]>('/market/ohlc', {
      params: { symbol, timeframe },
    });
    return Array.isArray(data) ? data : [];
  }

  /**
   * 5. Fetch L2 Order Book Depth from Spring Boot (`GET /api/market/depth/{symbol}`)
   */
  public getCachedOrderBookDepth(symbol: string, ltp = 0): OrderBookDepth {
    apiClient
      .get<OrderBookDepth>(`/market/depth/${encodeURIComponent(symbol)}`, {
        params: { ltp },
      })
      .then((res) => {
        if (res.data) {
          this.depthCache.set(symbol, res.data);
        }
      })
      .catch(() => {});

    return (
      this.depthCache.get(symbol) || {
        symbol,
        ltp,
        spread: 0,
        spreadPct: 0,
        totalBidQty: 0,
        totalAskQty: 0,
        buyPressurePct: 50,
        bids: [],
        asks: [],
      }
    );
  }

  /**
   * 6. Fetch Live Option Chain & Black-Scholes Greeks from Spring Boot (`GET /api/market/option-chain`)
   */
  public async getOptionChain(
    symbol: string,
    spotPrice: number,
    strikeStep: number,
    daysToExpiry: number
  ): Promise<{
    rows: OptionChainStrikeRow[];
    pcr: number;
    maxPainStrike: number;
    totalCallOi: number;
    totalPutOi: number;
  }> {
    if (spotPrice <= 0) {
      return { rows: [], pcr: 0, maxPainStrike: 0, totalCallOi: 0, totalPutOi: 0 };
    }
    const { data } = await apiClient.get('/market/option-chain', {
      params: { symbol, spotPrice, strikeStep, daysToExpiry },
    });
    return (
      data || { rows: [], pcr: 0, maxPainStrike: 0, totalCallOi: 0, totalPutOi: 0 }
    );
  }

  /**
   * 7. Fetch Live Margin & Cash Balance from Spring Boot (`GET /api/market/iifl/limits`)
   */
  public async getMarginBalance(): Promise<{
    cashAvailable: number;
    marginUtilized: number;
    netMarginAvailable: number;
  }> {
    try {
      const { data } = await apiClient.get('/market/iifl/limits');
      return {
        cashAvailable: Number(data?.cashAvailable ?? 0),
        marginUtilized: Number(data?.marginUtilized ?? 0),
        netMarginAvailable: Number(data?.netMarginAvailable ?? 0),
      };
    } catch {
      return { cashAvailable: 0, marginUtilized: 0, netMarginAvailable: 0 };
    }
  }
}

export const iiflService = new SpringBootMarketClient();
