import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CircleDollarSign,
  TrendingUp,
  LayoutDashboard,
  Activity,
  Eye,
  EyeOff,
  Terminal,
  ListChecks,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { investmentApi } from '../services/investmentApi';
import { tradingService } from '../services/tradingService';
import { useInvestmentHoldingsQuery } from '../hooks/useInvestmentHoldingsQuery';
import { useTradesQuery } from '../hooks/useTradesQuery';
import {
  useFinancialHealthQuery,
  useUpdateHealthAnswerMutation,
  useUpdateFireSettingsMutation,
  useSyncFinancialHealthMutation,
} from '../hooks/useFinancialHealthQuery';
import {
  extractFinancialHealthResult,
  extractFireCalculationResult,
  FireSettings,
} from '../services/financialHealthService';
import {
  loadRiskConfig,
  saveRiskConfig,
  evaluateRiskGuardrails,
} from '../domain/riskGuardrails';
import { useMoneyPrivacy } from '../context/MoneyPrivacyContext';
import { useLiveMarketFeed } from '../hooks/useLiveMarketFeed';

// Dashboard & Investment Components
import NetWorthHeroCard from '../components/money/NetWorthHeroCard';
import CategoryBreakdownCards from '../components/money/CategoryBreakdownCards';
import InvestmentAssetAllocationChart from '../components/money/InvestmentAssetAllocationChart';
import InvestmentPerformanceChart from '../components/money/InvestmentPerformanceChart';
import HoldingsTable from '../components/money/HoldingsTable';
import InvestmentModal from '../components/money/InvestmentModal';
import FinancialHealthCard from '../components/money/FinancialHealthCard';
import FinancialHealthModal from '../components/money/FinancialHealthModal';
import FireCalculatorCard from '../components/money/FireCalculatorCard';

// Investment Screens (5-Screen Institutional Research Workflow)
import InvestmentLandingScreen from '../components/money/investment/InvestmentLandingScreen';
import MutualFundListScreen from '../components/money/investment/MutualFundListScreen';
import MutualFundDetailScreen from '../components/money/investment/MutualFundDetailScreen';
import StockListScreen from '../components/money/investment/StockListScreen';
import StockDetailScreen from '../components/money/investment/StockDetailScreen';

// Pro Trading Terminal Components
import TradingKPIHeader from '../components/money/trading/TradingKPIHeader';
import ProTradingChart from '../components/money/trading/ProTradingChart';
import OrderExecutionTicket from '../components/money/trading/OrderExecutionTicket';
import OptionsStrategyBuilder from '../components/money/trading/OptionsStrategyBuilder';
import TradingRiskAnalytics from '../components/money/trading/TradingRiskAnalytics';
import TradingPerformanceChart from '../components/money/trading/TradingPerformanceChart';
import TradingPositionsTable from '../components/money/trading/TradingPositionsTable';
import TradeModal from '../components/money/trading/TradeModal';

import '../components/money/money-theme.css';
import {
  InvestmentCategory,
  InvestmentHolding,
  Trade,
  TradeDirection,
  TradingRiskConfig,
} from '../interface';

type MainTab = 'dashboard' | 'investment' | 'trading';
type InvestmentScreen = 'landing' | 'mf_list' | 'mf_detail' | 'stock_list' | 'stock_detail';
type TradingDeskTab = 'terminal' | 'blotter' | 'options' | 'analytics';

interface MoneyHubProps {
  marketFeed?: ReturnType<typeof useLiveMarketFeed>;
}

export default function MoneyHub({ marketFeed: externalFeed }: MoneyHubProps) {
  const internalFeed = useLiveMarketFeed(2400);
  const marketFeed = externalFeed || internalFeed;

  const queryClient = useQueryClient();
  const { isMoneyHidden, toggleHideMoney } = useMoneyPrivacy();

  // Active top navigation tab: 'dashboard' | 'investment' | 'trading'
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');

  // Active Investment Screen within Investment Tab
  const [invScreen, setInvScreen] = useState<InvestmentScreen>('landing');
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);

  // Active Trading Desk Sub-Tab within Trading Workspace
  const [tradingDesk, setTradingDesk] = useState<TradingDeskTab>('terminal');
  const [riskConfig, setRiskConfig] = useState<TradingRiskConfig>(() => loadRiskConfig());
  const [quickChartOrder, setQuickChartOrder] = useState<{
    direction: TradeDirection;
    price: number;
  } | null>(null);

  // Selected category filter: 'All' | 'Stocks' | 'Mutual Funds' | 'Bonds' | 'FDs'
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [includeCashAndDebt, setIncludeCashAndDebt] = useState<boolean>(true);

  // Modal State for Investment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<InvestmentHolding | null>(null);
  const [modalCategory, setModalCategory] = useState<InvestmentCategory>('Stocks');

  // Modal State for Diagnostic Health Questions
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  // Modal State for Manual Trade Edit/Create
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Fetch Investment Holdings
  const {
    data: holdings = [],
    refetch: refetchHoldings,
    isFetching: isFetchingHoldings,
  } = useInvestmentHoldingsQuery();

  // Fetch Trading Positions & Trades
  const {
    data: trades = [],
    refetch: refetchTrades,
  } = useTradesQuery();

  // Fetch Financial Health Document
  const {
    data: healthRecord,
    refetch: refetchHealthRecord,
  } = useFinancialHealthQuery();
  const updateHealthAnswerMutation = useUpdateHealthAnswerMutation();
  const updateFireSettingsMutation = useUpdateFireSettingsMutation();
  const syncHealthMutation = useSyncFinancialHealthMutation();

  // Live Treasury Cash & Margin Reserve from IIFL Interactive API
  const cashLiquidity = marketFeed.cashAvailable || 0;
  const debtLiabilities = 0;

  // Compute Portfolio Level Stats
  const portfolioStats = investmentApi.computePortfolioStats(holdings);
  const activeSipMonthly = portfolioStats.monthlySipTotal || 0;

  // Total Comprehensive Net Worth: Portfolio + Cash - Liabilities
  const totalNetWorth =
    portfolioStats.currentValue + cashLiquidity - debtLiabilities;

  // Financial Health & FIRE Aspects
  const healthResult = extractFinancialHealthResult(healthRecord);
  const fireResult = extractFireCalculationResult(healthRecord);

  // Synchronize live financial telemetry with Financial Health
  useEffect(() => {
    syncHealthMutation.mutate({
      holdings,
      cashLiquidity,
      debtLiabilities,
      activeSipMonthly,
      portfolioValue: portfolioStats.currentValue,
    });
  }, [holdings.length, cashLiquidity, debtLiabilities, activeSipMonthly, portfolioStats.currentValue]);

  // Live MTM enrichment of open trades from live market feed
  const liveTrades = trades.map((t) => {
    if (t.status !== 'OPEN') return t;
    const match = marketFeed.watchlist.find((w) =>
      t.symbol.toUpperCase().includes(w.symbol.split(' ')[0].toUpperCase())
    );
    if (!match || t.symbol.includes('CE') || t.symbol.includes('PE')) return t;
    const isLong = t.direction === 'LONG';
    const diff = (match.ltp - t.entryPrice) * (isLong ? 1 : -1);
    const unrealizedPnl = Number((diff * t.quantity).toFixed(2));
    const pnlPercent =
      t.entryPrice > 0 ? Number(((diff / t.entryPrice) * 100).toFixed(2)) : 0;
    const riskAmt = Math.abs(t.entryPrice - t.stopLoss) * t.quantity;
    const rMultiple = riskAmt > 0 ? Number((unrealizedPnl / riskAmt).toFixed(2)) : 0;

    return {
      ...t,
      currentPrice: match.ltp,
      unrealizedPnl,
      netPnl: Number((unrealizedPnl - (t.charges || 0)).toFixed(2)),
      pnlPercent,
      rMultiple,
    };
  });

  // Trading Stats & Guardrails
  const tradingStats = tradingService.computeTradingStats(liveTrades);
  const openTrades = liveTrades.filter((t) => t.status === 'OPEN');
  const guardrailStatus = evaluateRiskGuardrails(riskConfig, liveTrades);

  const handleTogglePillar = (pillarId: string, newState: boolean) => {
    updateHealthAnswerMutation.mutate({
      pillarId,
      fulfilled: newState,
    });
  };

  const handleUpdateFireSettings = (newSettings: Partial<FireSettings>) => {
    updateFireSettingsMutation.mutate({
      settings: newSettings,
    });
  };

  const handleUpdateRiskConfig = (nextConfig: TradingRiskConfig) => {
    saveRiskConfig(nextConfig);
    setRiskConfig(nextConfig);
  };

  // Handlers for Holding Actions
  const handleOpenAdd = (categoryToSelect?: InvestmentCategory) => {
    setEditingHolding(null);
    if (categoryToSelect) {
      setModalCategory(categoryToSelect);
    } else if (selectedCategory !== 'All') {
      setModalCategory(
        selectedCategory === 'Mutual Funds' || selectedCategory === 'SIPs'
          ? 'Mutual Funds'
          : (selectedCategory as InvestmentCategory)
      );
    } else {
      setModalCategory('Stocks');
    }
    setIsModalOpen(true);
  };

  const handleEditHolding = (holding: InvestmentHolding) => {
    setEditingHolding(holding);
    setModalCategory(holding.category);
    setIsModalOpen(true);
  };

  const handleDeleteHolding = async (id: string) => {
    await investmentApi.deleteHolding(id);
    queryClient.invalidateQueries({ queryKey: ['investmentHoldings'] });
  };

  const handleSaveHolding = async (holdingData: Partial<InvestmentHolding>) => {
    if (editingHolding) {
      await investmentApi.updateHolding(editingHolding.id, holdingData);
    } else {
      await investmentApi.createHolding(
        holdingData as Omit<InvestmentHolding, 'id' | '_id' | 'createdAt' | 'updatedAt'>
      );
    }
    queryClient.invalidateQueries({ queryKey: ['investmentHoldings'] });
  };

  const handleRefresh = async () => {
    marketFeed.triggerManualTick();
    await Promise.all([refetchHoldings(), refetchTrades(), refetchHealthRecord()]);
  };

  // Handlers for Trading Actions
  const handleOpenAddTrade = () => {
    setEditingTrade(null);
    setIsTradeModalOpen(true);
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsTradeModalOpen(true);
  };

  const handleExecuteNewTrade = async (tradeData: Omit<Trade, 'id'>) => {
    await tradingService.createTrade(tradeData);
    queryClient.invalidateQueries({ queryKey: ['tradingTrades'] });
  };

  const handleSaveTrade = async (tradeData: Partial<Trade>) => {
    if (editingTrade) {
      await tradingService.updateTrade(editingTrade.id, tradeData);
    } else {
      await tradingService.createTrade(tradeData as Omit<Trade, 'id'>);
    }
    queryClient.invalidateQueries({ queryKey: ['tradingTrades'] });
    setIsTradeModalOpen(false);
  };

  const handleCloseTrade = async (id: string, exitPrice: number) => {
    await tradingService.closeTrade(id, exitPrice);
    queryClient.invalidateQueries({ queryKey: ['tradingTrades'] });
  };

  const handleTrailStopToBreakeven = async (trade: Trade) => {
    await tradingService.updateTrade(trade.id, {
      ...trade,
      stopLoss: trade.entryPrice,
    });
    queryClient.invalidateQueries({ queryKey: ['tradingTrades'] });
  };

  const handleDeleteTrade = async (id: string) => {
    await tradingService.deleteTrade(id);
    queryClient.invalidateQueries({ queryKey: ['tradingTrades'] });
  };

  return (
    <div className="money-screen-root">
      {/* Header Banner */}
      <div className="money-header-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="money-sub-badge">
              <CircleDollarSign size={13} style={{ display: 'inline', marginRight: 4 }} />
              Institutional Wealth, Derivatives & Capital Engine
            </span>
          </div>
          <h1 className="money-title-text">
            Net Worth & <span className="money-gold-gradient">Pro Trading Command Center</span>
          </h1>
          <p className="page-header-subtitle">
            Unified institutional terminal for tracking Equities, Mutual Fund SIPs, Sovereign Bonds, FDs, and Live F&O Execution in INR (₹).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Eye Hide/Unhide Money Button */}
          <button
            onClick={toggleHideMoney}
            className={`money-eye-toggle-btn ${isMoneyHidden ? 'active-hidden' : ''}`}
            title={isMoneyHidden ? 'Click to unhide monetary balances' : 'Click to hide monetary balances'}
          >
            {isMoneyHidden ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{isMoneyHidden ? 'Show Balances' : 'Hide Balances'}</span>
          </button>

          {/* IIFL Live API Connection Pill */}
          <span
            className={`money-header-health-badge ${
              marketFeed.connectionState.marketDataConnected ? 'guardrail-ok' : 'guardrail-warn'
            }`}
            onClick={() => marketFeed.triggerManualTick()}
            title={
              marketFeed.connectionState.errorMessage ||
              'Click to sync IIFL MarketData & Interactive API sessions'
            }
          >
            <Activity
              size={14}
              className={
                marketFeed.connectionState.marketDataConnected ? 'text-emerald' : 'text-amber'
              }
            />
            <span className="font-mono">
              IIFL API:{' '}
              {marketFeed.connectionState.marketDataConnected
                ? 'CONNECTED'
                : marketFeed.connectionState.configured
                ? 'CONNECTING'
                : 'AWAITING KEYS'}
            </span>
          </span>

          {/* Risk Guardrail Pill */}
          <span
            className={`money-header-health-badge ${
              guardrailStatus.status === 'CLEAR' ? 'guardrail-ok' : 'guardrail-warn'
            }`}
            onClick={() => {
              setActiveTab('trading');
              setTradingDesk('analytics');
            }}
            title="Click to inspect Trading Risk Guardrails"
          >
            {guardrailStatus.status === 'CLEAR' ? (
              <ShieldCheck size={14} className="text-emerald" />
            ) : (
              <ShieldAlert size={14} className="text-amber" />
            )}
            <span className="font-mono">
              Risk Engine: {guardrailStatus.status === 'CLEAR' ? 'ARMED' : 'CAUTION'}
            </span>
          </span>

          {/* Health Score Pill */}
          <span
            className="money-header-health-badge"
            onClick={() => setIsDiagnosticOpen(true)}
            title="Click to view Financial Health Diagnostic"
          >
            <ShieldCheck size={14} className="text-cyan" />
            <span>Health Score: {healthResult.totalScore}/100</span>
          </span>
        </div>
      </div>

      {/* 3 Primary Workspace Tabs: Wealth Dashboard | Investment Research | Pro Trading Terminal */}
      <div className="money-main-tabs-bar">
        <button
          className={`money-main-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={16} />
          <span>Wealth Dashboard</span>
        </button>

        <button
          className={`money-main-tab-btn ${activeTab === 'investment' ? 'active' : ''}`}
          onClick={() => {
            if (activeTab === 'investment') {
              setInvScreen('landing');
            }
            setActiveTab('investment');
          }}
        >
          <TrendingUp size={16} />
          <span>Investment Research</span>
          <span className="money-tab-count-pill">{holdings.length} Assets</span>
        </button>

        <button
          className={`money-main-tab-btn tab-trading ${activeTab === 'trading' ? 'active' : ''}`}
          onClick={() => setActiveTab('trading')}
        >
          <Activity size={16} />
          <span>Pro Trading Terminal</span>
          <span className="money-tab-count-pill">{openTrades.length} Active</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: EXECUTIVE WEALTH DASHBOARD
          ======================================================== */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* 1. Net Worth Hero Card */}
          <NetWorthHeroCard
            netWorth={totalNetWorth}
            portfolioValue={portfolioStats.currentValue}
            totalInvested={portfolioStats.totalInvested}
            totalReturn={portfolioStats.totalReturn}
            totalReturnPct={portfolioStats.totalReturnPct}
            todayChange={portfolioStats.todayChange}
            todayChangePct={portfolioStats.todayChangePct}
            cashLiquidity={cashLiquidity}
            debtLiabilities={debtLiabilities}
            activeSipMonthly={portfolioStats.monthlySipTotal || 0}
            includeCashAndDebt={includeCashAndDebt}
            onToggleNetWorthMode={() => setIncludeCashAndDebt((prev) => !prev)}
            onOpenAddModal={() => handleOpenAdd()}
            onRefresh={handleRefresh}
            isRefreshing={isFetchingHoldings}
          />

          {/* 2. Financial Health Score & FIRE Freedom Hub */}
          <div className="financial-intelligence-grid">
            <FinancialHealthCard
              healthResult={healthResult}
              onOpenDiagnostic={() => setIsDiagnosticOpen(true)}
            />
            <FireCalculatorCard
              fireResult={fireResult}
              onUpdateSettings={handleUpdateFireSettings}
            />
          </div>

          {/* 3. Four Asset Class KPI Cards (FD, Bonds, Stocks, SIPs) */}
          <CategoryBreakdownCards
            holdings={holdings}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />

          {/* 4. Visualization Centre (Asset Allocation Donut + Growth Comparison Chart) */}
          <div className="visualization-centre-grid">
            <InvestmentAssetAllocationChart
              holdings={holdings}
              cashLiquidity={cashLiquidity}
              includeCash={includeCashAndDebt}
            />
            <InvestmentPerformanceChart holdings={holdings} />
          </div>

          {/* 5. Interactive Multi-Asset Holdings Ledger Table */}
          <HoldingsTable
            holdings={holdings}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onOpenAddModal={handleOpenAdd}
            onEditHolding={handleEditHolding}
            onDeleteHolding={(id) => handleDeleteHolding(id)}
          />
        </div>
      )}

      {/* ========================================================
          TAB 2: INVESTMENT RESEARCH (5-Screen Drill-Down Architecture)
          ======================================================== */}
      {activeTab === 'investment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {invScreen === 'landing' && (
            <InvestmentLandingScreen
              holdings={holdings}
              onNavigateToMutualFunds={() => setInvScreen('mf_list')}
              onNavigateToStocks={() => setInvScreen('stock_list')}
              onSelectHolding={(id, category) => {
                setSelectedHoldingId(id);
                setInvScreen(category === 'Stocks' ? 'stock_detail' : 'mf_detail');
              }}
              onOpenAddModal={(category) => handleOpenAdd(category)}
            />
          )}

          {invScreen === 'mf_list' && (
            <MutualFundListScreen
              holdings={holdings}
              onBackToLanding={() => setInvScreen('landing')}
              onSelectFund={(id) => {
                setSelectedHoldingId(id);
                setInvScreen('mf_detail');
              }}
              onOpenAddModal={() => handleOpenAdd('Mutual Funds')}
            />
          )}

          {invScreen === 'mf_detail' && (() => {
            const fund =
              holdings.find((h) => h.id === selectedHoldingId) ||
              holdings.find((h) => h.category === 'Mutual Funds' || h.category === 'SIPs');
            if (!fund) {
              return (
                <MutualFundListScreen
                  holdings={holdings}
                  onBackToLanding={() => setInvScreen('landing')}
                  onSelectFund={(id) => {
                    setSelectedHoldingId(id);
                    setInvScreen('mf_detail');
                  }}
                  onOpenAddModal={() => handleOpenAdd('Mutual Funds')}
                />
              );
            }
            return (
              <MutualFundDetailScreen
                fund={fund}
                onBackToList={() => setInvScreen('mf_list')}
                onEditFund={handleEditHolding}
              />
            );
          })()}

          {invScreen === 'stock_list' && (
            <StockListScreen
              holdings={holdings}
              onBackToLanding={() => setInvScreen('landing')}
              onSelectStock={(id) => {
                setSelectedHoldingId(id);
                setInvScreen('stock_detail');
              }}
              onOpenAddModal={() => handleOpenAdd('Stocks')}
            />
          )}

          {invScreen === 'stock_detail' && (() => {
            const stock =
              holdings.find((h) => h.id === selectedHoldingId) ||
              holdings.find((h) => h.category === 'Stocks');
            if (!stock) {
              return (
                <StockListScreen
                  holdings={holdings}
                  onBackToLanding={() => setInvScreen('landing')}
                  onSelectStock={(id) => {
                    setSelectedHoldingId(id);
                    setInvScreen('stock_detail');
                  }}
                  onOpenAddModal={() => handleOpenAdd('Stocks')}
                />
              );
            }
            return (
              <StockDetailScreen
                stock={stock}
                onBackToList={() => setInvScreen('stock_list')}
                onEditStock={handleEditHolding}
              />
            );
          })()}
        </div>
      )}

      {/* ========================================================
          TAB 3: PRO TRADING TERMINAL (4-Desk Institutional Suite)
          ======================================================== */}
      {activeTab === 'trading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Quantitative KPI Header */}
          <TradingKPIHeader
            stats={tradingStats}
            onOpenAddModal={handleOpenAddTrade}
          />

          {/* 4-Desk Sub-Navigation Switcher */}
          <div className="pro-desk-subnav-bar">
            <button
              type="button"
              className={`pro-desk-tab-btn ${tradingDesk === 'terminal' ? 'active' : ''}`}
              onClick={() => setTradingDesk('terminal')}
            >
              <Terminal size={15} />
              <span>Execution & Charting Terminal</span>
              <span className="desk-badge-pill">L2 DOM + Sizer</span>
            </button>

            <button
              type="button"
              className={`pro-desk-tab-btn ${tradingDesk === 'blotter' ? 'active' : ''}`}
              onClick={() => setTradingDesk('blotter')}
            >
              <ListChecks size={15} />
              <span>Positions Blotter & Trade Journal</span>
              <span className="desk-badge-pill">{liveTrades.length} Trades</span>
            </button>

            <button
              type="button"
              className={`pro-desk-tab-btn ${tradingDesk === 'options' ? 'active' : ''}`}
              onClick={() => setTradingDesk('options')}
            >
              <Cpu size={15} />
              <span>F&O Options & Greeks Lab</span>
              <span className="desk-badge-pill">Payoff + Chain</span>
            </button>

            <button
              type="button"
              className={`pro-desk-tab-btn ${tradingDesk === 'analytics' ? 'active' : ''}`}
              onClick={() => setTradingDesk('analytics')}
            >
              <ShieldCheck size={15} />
              <span>Risk Guardrails & Quant Analytics</span>
              <span className="desk-badge-pill">PF {tradingStats.profitFactor.toFixed(2)}</span>
            </button>
          </div>

          {/* DESK 1: Execution & Charting Terminal (Watchlist + Multi-TF Chart + Order Ticket + L2 DOM) */}
          {tradingDesk === 'terminal' && (
            <>
              <div className="pro-terminal-master-layout">
                <ProTradingChart
                  watchlist={marketFeed.watchlist}
                  activeInstrument={marketFeed.activeInstrument}
                  onSelectSymbol={marketFeed.setSelectedSymbol}
                  openTrades={openTrades}
                  onQuickOrderFromChart={(direction, price) =>
                    setQuickChartOrder({ direction, price })
                  }
                />

                <OrderExecutionTicket
                  activeInstrument={marketFeed.activeInstrument}
                  trades={liveTrades}
                  riskConfig={riskConfig}
                  onExecuteTrade={handleExecuteNewTrade}
                  externalOrderPreset={quickChartOrder}
                />
              </div>

              {/* Compact Open Positions Blotter directly beneath Terminal for instant monitoring */}
              <TradingPositionsTable
                trades={liveTrades}
                onOpenAddModal={handleOpenAddTrade}
                onEditTrade={handleEditTrade}
                onCloseTrade={handleCloseTrade}
                onDeleteTrade={handleDeleteTrade}
                onTrailStopToBreakeven={handleTrailStopToBreakeven}
              />
            </>
          )}

          {/* DESK 2: Full Positions Blotter & Equity Performance Curve */}
          {tradingDesk === 'blotter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <TradingPositionsTable
                trades={liveTrades}
                onOpenAddModal={handleOpenAddTrade}
                onEditTrade={handleEditTrade}
                onCloseTrade={handleCloseTrade}
                onDeleteTrade={handleDeleteTrade}
                onTrailStopToBreakeven={handleTrailStopToBreakeven}
              />
              <TradingPerformanceChart trades={liveTrades} />
            </div>
          )}

          {/* DESK 3: Options & Derivatives Strategy Builder + Option Chain */}
          {tradingDesk === 'options' && (
            <OptionsStrategyBuilder
              watchlist={marketFeed.watchlist}
              onDeployStrategyAsTrade={async (tradeData) => {
                await handleExecuteNewTrade(tradeData);
              }}
            />
          )}

          {/* DESK 4: Institutional Risk Engine & Quant Performance Analytics */}
          {tradingDesk === 'analytics' && (
            <TradingRiskAnalytics
              trades={liveTrades}
              stats={tradingStats}
              riskConfig={riskConfig}
              onUpdateRiskConfig={handleUpdateRiskConfig}
            />
          )}
        </div>
      )}

      {/* ========================================================
          MODALS
          ======================================================== */}
      {/* 1. Add / Edit Investment Modal */}
      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveHolding}
        initialHolding={editingHolding}
        defaultCategory={modalCategory}
      />

      {/* 2. Add / Edit Trade Modal */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        onSave={handleSaveTrade}
        initialTrade={editingTrade}
      />

      {/* 3. Financial Health Diagnostic & Gap-Filling Modal */}
      <FinancialHealthModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        healthResult={healthResult}
        onTogglePillar={handleTogglePillar}
      />
    </div>
  );
}
