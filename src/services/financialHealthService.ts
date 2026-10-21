/**
 * Financial Health Score Diagnostic & FIRE Freedom Service
 * All figures computed in Indian Rupee (INR ₹)
 *
 * Syncs with `/api/financial_health` when available and dynamically evaluates
 * live portfolio holdings, asset diversification, SIP velocity, and FIRE targets.
 */

import { InvestmentHolding } from '../interface';
import apiClient from './apiClient';

export interface HealthPillar {
  id: string;
  title: string;
  category: 'Safety' | 'Debt' | 'Growth' | 'Protection' | 'Estate';
  maxPoints: number;
  question: string;
  whyItMatters: string;
  gapText: string;
  isAutoDetected: boolean;
  isFulfilled: boolean;
  earnedPoints: number;
  details?: string;
}

export interface FinancialHealthResult {
  totalScore: number;
  maxScore: number;
  tier: 'Elite Fortress' | 'Strong Compounding' | 'Stable with Gaps' | 'High Risk';
  tierColor: string;
  tierDescription: string;
  pillars: HealthPillar[];
  achievedCount: number;
  gapsCount: number;
  nextBestAction: string;
}

export interface FireSettings {
  monthlyExpenses: number; // in INR ₹
  multiplier: number; // default 25 (Standard 4% rule)
  expectedAnnualReturn: number; // % default 12% p.a.
}

export interface FireCalculationResult {
  monthlyExpenses: number;
  annualExpenses: number;
  leanFireTarget: number; // 20x
  standardFireTarget: number; // 25x
  fatFireTarget: number; // 33x
  selectedTarget: number;
  currentNetWorth: number;
  progressPct: number;
  shortfall: number;
  yearsToFire: number;
  targetYear: number;
  monthlyInvestment: number;
}

export interface FinancialHealthRecord {
  id?: string;
  userId?: string;
  answers?: Record<string, boolean>;
  fireSettings?: FireSettings;
  totalScore?: number;
  maxScore?: number;
  tier?: FinancialHealthResult['tier'];
  tierColor?: string;
  tierDescription?: string;
  achievedCount?: number;
  gapsCount?: number;
  nextBestAction?: string;
  pillars?: HealthPillar[];
  fireCalculations?: Partial<FireCalculationResult>;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_FIRE_SETTINGS: FireSettings = {
  monthlyExpenses: 75000,
  multiplier: 25,
  expectedAnnualReturn: 12,
};

const ENDPOINT = '/financial_health';

let activeHealthState: FinancialHealthRecord = {
  fireSettings: DEFAULT_FIRE_SETTINGS,
  answers: {
    'emergency-fund': true,
    'zero-bad-debt': true,
    'term-insurance': true,
    'health-insurance': true,
    'estate-nominee': true,
  },
};

function buildLivePillars(
  portfolioValue: number,
  activeSipMonthly: number,
  distinctAssetClasses: number,
  answers: Record<string, boolean>
): HealthPillar[] {
  const pillars: Omit<HealthPillar, 'earnedPoints'>[] = [
    {
      id: 'emergency-fund',
      title: '6-Month Liquid Emergency Buffer',
      category: 'Safety',
      maxPoints: 20,
      question: 'Do you maintain at least 6 months of core expenses in liquid reserves?',
      whyItMatters: 'Prevents forced liquidation of equities during drawdowns.',
      gapText: 'Build a 6-month liquid reserve in Liquid Funds or Sweep FDs.',
      isAutoDetected: false,
      isFulfilled: answers['emergency-fund'] ?? true,
    },
    {
      id: 'zero-bad-debt',
      title: 'Zero High-Interest Toxic Debt',
      category: 'Debt',
      maxPoints: 15,
      question: 'Are you free of credit card revolvers or personal loans >11% APR?',
      whyItMatters: 'High-cost debt compounds faster than benchmark equity alpha.',
      gapText: 'Retire all >11% APR debt before scaling leveraged positions.',
      isAutoDetected: false,
      isFulfilled: answers['zero-bad-debt'] ?? true,
    },
    {
      id: 'sip-compounding',
      title: 'Systematic Monthly SIP Velocity',
      category: 'Growth',
      maxPoints: 20,
      question: 'Are you systematically deploying monthly SIP capital into Mutual Funds?',
      whyItMatters: 'Automated rupee-cost averaging captures volatility premia.',
      gapText: 'Activate automated monthly Mutual Fund SIPs.',
      isAutoDetected: true,
      isFulfilled: activeSipMonthly > 0,
      details: `Live AMFI SIP Velocity: ₹${activeSipMonthly.toLocaleString('en-IN')}/mo`,
    },
    {
      id: 'multi-asset-diversification',
      title: 'Multi-Asset Portfolio Allocation',
      category: 'Growth',
      maxPoints: 15,
      question: 'Is your capital diversified across Equities and Mutual Funds?',
      whyItMatters: 'Reduces single-instrument idiosyncratic drawdown risk.',
      gapText: 'Diversify across NSE Equities and AMFI Direct Mutual Funds.',
      isAutoDetected: true,
      isFulfilled: distinctAssetClasses >= 2 || portfolioValue > 100000,
      details: `${distinctAssetClasses} Active Asset Classes • Live Value ₹${Math.round(portfolioValue).toLocaleString('en-IN')}`,
    },
    {
      id: 'term-insurance',
      title: 'Pure Term Life Cover (15x Income)',
      category: 'Protection',
      maxPoints: 15,
      question: 'Do you have pure term life insurance of at least 15x annual income?',
      whyItMatters: 'Protects family human-capital value from tail mortality events.',
      gapText: 'Secure a pure term life policy without endowment drag.',
      isAutoDetected: false,
      isFulfilled: answers['term-insurance'] ?? true,
    },
    {
      id: 'health-insurance',
      title: 'Comprehensive Health Indemnity Cover',
      category: 'Protection',
      maxPoints: 15,
      question: 'Do you have ₹15L+ base + super top-up health insurance?',
      whyItMatters: 'Shields compounding investment corpus from medical inflation.',
      gapText: 'Add a ₹10L base + ₹25L super top-up health cover.',
      isAutoDetected: false,
      isFulfilled: answers['health-insurance'] ?? true,
    },
  ];

  return pillars.map((p) => ({
    ...p,
    earnedPoints: p.isFulfilled ? p.maxPoints : 0,
  }));
}

function computeDynamicHealthRecord(params: {
  portfolioValue: number;
  cashLiquidity: number;
  debtLiabilities: number;
  activeSipMonthly: number;
  distinctAssetClasses: number;
  answers?: Record<string, boolean>;
  fireSettings?: Partial<FireSettings>;
}): FinancialHealthRecord {
  const answers = { ...(activeHealthState.answers || {}), ...(params.answers || {}) };
  const settings: FireSettings = {
    ...DEFAULT_FIRE_SETTINGS,
    ...(activeHealthState.fireSettings || {}),
    ...(params.fireSettings || {}),
  };

  const pillars = buildLivePillars(
    params.portfolioValue,
    params.activeSipMonthly,
    params.distinctAssetClasses,
    answers
  );

  const totalScore = pillars.reduce((s, p) => s + p.earnedPoints, 0);
  const achievedCount = pillars.filter((p) => p.isFulfilled).length;
  const gapsCount = pillars.length - achievedCount;

  let tier: FinancialHealthResult['tier'] = 'High Risk';
  let tierColor = '#f43f5e';
  if (totalScore >= 85) {
    tier = 'Elite Fortress';
    tierColor = '#10b981';
  } else if (totalScore >= 70) {
    tier = 'Strong Compounding';
    tierColor = '#06b6d4';
  } else if (totalScore >= 50) {
    tier = 'Stable with Gaps';
    tierColor = '#f59e0b';
  }

  const monthlyExpenses = Number(settings.monthlyExpenses || 75000);
  const annualExpenses = monthlyExpenses * 12;
  const multiplier = Number(settings.multiplier || 25);
  const selectedTarget = annualExpenses * multiplier;
  const currentNetWorth = Math.round(
    params.portfolioValue + params.cashLiquidity - params.debtLiabilities
  );
  const monthlyInvestment = Math.max(params.activeSipMonthly, 25000);
  const progressPct =
    selectedTarget > 0
      ? Number(Math.min(100, (currentNetWorth / selectedTarget) * 100).toFixed(1))
      : 0;
  const shortfall = Math.max(0, selectedTarget - currentNetWorth);

  const r = (settings.expectedAnnualReturn || 12) / 100;
  const annualContribution = monthlyInvestment * 12;
  let simWealth = currentNetWorth;
  let years = 0;
  while (simWealth < selectedTarget && years < 45) {
    simWealth = simWealth * (1 + r) + annualContribution;
    years += 0.5;
  }

  activeHealthState = {
    ...activeHealthState,
    answers,
    fireSettings: settings,
    pillars,
    totalScore,
    maxScore: 100,
    tier,
    tierColor,
    achievedCount,
    gapsCount,
    fireCalculations: {
      monthlyExpenses,
      annualExpenses,
      leanFireTarget: annualExpenses * 20,
      standardFireTarget: annualExpenses * 25,
      fatFireTarget: annualExpenses * 33,
      selectedTarget,
      currentNetWorth,
      progressPct,
      shortfall,
      yearsToFire: Number(years.toFixed(1)),
      targetYear: new Date().getFullYear() + Math.ceil(years),
      monthlyInvestment,
    },
  };

  return activeHealthState;
}

export const extractFinancialHealthResult = (
  record?: FinancialHealthRecord | null
): FinancialHealthResult => {
  const effective = record?.pillars?.length ? record : activeHealthState;
  const pillars = (effective.pillars ||
    buildLivePillars(0, 50000, 2, activeHealthState.answers || {})) as HealthPillar[];
  const totalScore =
    effective.totalScore ?? pillars.reduce((sum, p) => sum + (p.earnedPoints || 0), 0);
  const maxScore = effective.maxScore ?? 100;
  const achievedCount =
    effective.achievedCount ?? pillars.filter((p) => p.isFulfilled).length;
  const gapsCount = effective.gapsCount ?? pillars.length - achievedCount;

  let tier = effective.tier;
  let tierColor = effective.tierColor;
  let tierDescription = effective.tierDescription;

  if (!tier) {
    if (totalScore >= 85) {
      tier = 'Elite Fortress';
      tierColor = '#10b981';
      tierDescription =
        'Your wealth architecture is bulletproof, diversified, and primed for rapid compounding.';
    } else if (totalScore >= 70) {
      tier = 'Strong Compounding';
      tierColor = '#06b6d4';
      tierDescription =
        'Robust foundations with strong regular investing. Address remaining minor gaps for elite status.';
    } else if (totalScore >= 50) {
      tier = 'Stable with Gaps';
      tierColor = '#f59e0b';
      tierDescription =
        'Core assets are in place, but protective gaps leave you vulnerable to market or life shocks.';
    } else {
      tier = 'High Risk';
      tierColor = '#f43f5e';
      tierDescription =
        'Urgent gaps in safety buffer or liabilities require immediate attention.';
    }
  }

  const firstGap = pillars.find((p) => !p.isFulfilled);
  const nextBestAction =
    effective.nextBestAction ||
    (firstGap
      ? `${firstGap.title}: ${firstGap.gapText}`
      : 'All core financial health pillars achieved! Keep compounding.');

  return {
    totalScore,
    maxScore,
    tier: tier as FinancialHealthResult['tier'],
    tierColor: tierColor || '#10b981',
    tierDescription: tierDescription || '',
    pillars,
    achievedCount,
    gapsCount,
    nextBestAction,
  };
};

export const extractFireCalculationResult = (
  record?: FinancialHealthRecord | null
): FireCalculationResult => {
  const effective = record?.fireCalculations ? record : activeHealthState;
  const calcs = effective.fireCalculations || {};
  const settings = effective.fireSettings || DEFAULT_FIRE_SETTINGS;
  const monthlyExpenses = Number(calcs.monthlyExpenses ?? settings.monthlyExpenses ?? 75000);
  const annualExpenses = Number(calcs.annualExpenses ?? monthlyExpenses * 12);
  const multiplier = Number(settings.multiplier || 25);

  return {
    monthlyExpenses,
    annualExpenses,
    leanFireTarget: Number(calcs.leanFireTarget ?? annualExpenses * 20),
    standardFireTarget: Number(calcs.standardFireTarget ?? annualExpenses * 25),
    fatFireTarget: Number(calcs.fatFireTarget ?? annualExpenses * 33),
    selectedTarget: Number(calcs.selectedTarget ?? annualExpenses * multiplier),
    currentNetWorth: Number(calcs.currentNetWorth ?? 0),
    progressPct: Number(calcs.progressPct ?? 0),
    shortfall: Number(calcs.shortfall ?? 0),
    yearsToFire: Number(calcs.yearsToFire ?? 0),
    targetYear: Number(calcs.targetYear ?? new Date().getFullYear()),
    monthlyInvestment: Number(calcs.monthlyInvestment ?? 0),
  };
};

export const financialHealthApi = {
  getHealthRecord: async (): Promise<FinancialHealthRecord> => {
    try {
      const { data } = await apiClient.get<FinancialHealthRecord>(ENDPOINT);
      if (data && data.pillars) {
        activeHealthState = data;
        return data;
      }
    } catch {
      // Backend offline — return live computed state
    }
    return activeHealthState;
  },

  saveHealthRecord: async (record: Partial<FinancialHealthRecord>): Promise<FinancialHealthRecord> => {
    try {
      const { data } = await apiClient.post<FinancialHealthRecord>(ENDPOINT, record);
      if (data) return data;
    } catch {
      // Ignore if backend offline
    }
    activeHealthState = { ...activeHealthState, ...record };
    return activeHealthState;
  },

  updateHealthAnswer: async (pillarId: string, fulfilled: boolean): Promise<FinancialHealthRecord> => {
    const nextAnswers = { ...(activeHealthState.answers || {}), [pillarId]: fulfilled };
    activeHealthState.answers = nextAnswers;
    if (activeHealthState.pillars) {
      activeHealthState.pillars = activeHealthState.pillars.map((p) =>
        p.id === pillarId
          ? { ...p, isFulfilled: fulfilled, earnedPoints: fulfilled ? p.maxPoints : 0 }
          : p
      );
      activeHealthState.totalScore = activeHealthState.pillars.reduce(
        (s, p) => s + p.earnedPoints,
        0
      );
    }

    try {
      const { data } = await apiClient.patch<FinancialHealthRecord>(
        `${ENDPOINT}/pillar/${pillarId}`,
        { isFulfilled: fulfilled }
      );
      if (data) return data;
    } catch {
      // Ignore
    }
    return { ...activeHealthState };
  },

  updateFireSettings: async (settings: Partial<FireSettings>): Promise<FinancialHealthRecord> => {
    const mergedSettings = {
      ...(activeHealthState.fireSettings || DEFAULT_FIRE_SETTINGS),
      ...settings,
    };
    activeHealthState.fireSettings = mergedSettings;

    try {
      const { data } = await apiClient.patch<FinancialHealthRecord>(
        `${ENDPOINT}/fire-settings`,
        settings
      );
      if (data) return data;
    } catch {
      // Ignore
    }
    return computeDynamicHealthRecord({
      portfolioValue: activeHealthState.fireCalculations?.currentNetWorth || 0,
      cashLiquidity: 0,
      debtLiabilities: 0,
      activeSipMonthly: activeHealthState.fireCalculations?.monthlyInvestment || 50000,
      distinctAssetClasses: 2,
      fireSettings: mergedSettings,
    });
  },

  syncFinancialHealth: async (params: {
    holdings: InvestmentHolding[];
    cashLiquidity: number;
    debtLiabilities: number;
    activeSipMonthly: number;
    portfolioValue: number;
    answers?: Record<string, boolean>;
    fireSettings?: Partial<FireSettings>;
  }): Promise<FinancialHealthRecord> => {
    const distinctCategories = new Set(
      params.holdings
        .filter((h) => h.quantity > 0)
        .map((h) => (h.category === 'SIPs' ? 'Mutual Funds' : h.category))
    );

    const dynamicState = computeDynamicHealthRecord({
      portfolioValue: params.portfolioValue,
      cashLiquidity: params.cashLiquidity,
      debtLiabilities: params.debtLiabilities,
      activeSipMonthly: params.activeSipMonthly,
      distinctAssetClasses: distinctCategories.size,
      answers: params.answers,
      fireSettings: params.fireSettings,
    });

    try {
      const { data } = await apiClient.post<FinancialHealthRecord>(`${ENDPOINT}/sync`, {
        liquidCash: params.cashLiquidity,
        debtLiabilities: params.debtLiabilities,
        activeSipMonthly: params.activeSipMonthly,
        portfolioValue: params.portfolioValue,
        distinctAssetClasses: distinctCategories.size,
        answers: params.answers,
        fireSettings: params.fireSettings,
      });
      if (data && data.pillars) {
        activeHealthState = data;
        return data;
      }
    } catch {
      // Return dynamically computed state from live portfolio
    }
    return dynamicState;
  },
};

export const getStoredFireSettings = (record?: FinancialHealthRecord | null): FireSettings => {
  return record?.fireSettings || activeHealthState.fireSettings || DEFAULT_FIRE_SETTINGS;
};

export const getStoredHealthAnswers = (record?: FinancialHealthRecord | null): Record<string, boolean> => {
  return record?.answers || activeHealthState.answers || {};
};

export const computeFinancialHealth = (
  record?: FinancialHealthRecord | null
): FinancialHealthResult => {
  return extractFinancialHealthResult(record);
};

export const calculateFireNumbers = (
  record?: FinancialHealthRecord | null
): FireCalculationResult => {
  return extractFireCalculationResult(record);
};
