/**
 * Financial Health Score Diagnostic & FIRE Freedom Service
 * All figures computed in Indian Rupee (INR ₹)
 *
 * Backend Target:
 *   Database: MongoDB
 *   Collection: financial_health
 *   Base path: /api/financial_health
 * Includes resilient local storage + institutional seed data fallback.
 */

import { InvestmentHolding } from '../interface';
import { SEED_FINANCIAL_HEALTH } from '../domain/seedData';
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
const LOCAL_FH_KEY = 'money_os_financial_health_v2';

function getLocalHealthRecord(): FinancialHealthRecord {
  try {
    const raw = localStorage.getItem(LOCAL_FH_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore storage errors
  }
  saveLocalHealthRecord(SEED_FINANCIAL_HEALTH);
  return SEED_FINANCIAL_HEALTH;
}

function saveLocalHealthRecord(record: FinancialHealthRecord): void {
  try {
    localStorage.setItem(LOCAL_FH_KEY, JSON.stringify(record));
  } catch {
    // ignore storage errors
  }
}

function recomputeRecordState(record: FinancialHealthRecord): FinancialHealthRecord {
  const pillars = (record.pillars || SEED_FINANCIAL_HEALTH.pillars || []).map((p) => ({
    ...p,
    earnedPoints: p.isFulfilled ? p.maxPoints : 0,
  }));
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

  const settings = { ...DEFAULT_FIRE_SETTINGS, ...(record.fireSettings || {}) };
  const monthlyExpenses = Number(settings.monthlyExpenses || 75000);
  const annualExpenses = monthlyExpenses * 12;
  const multiplier = Number(settings.multiplier || 25);
  const selectedTarget = annualExpenses * multiplier;
  const currentNetWorth = Number(record.fireCalculations?.currentNetWorth ?? 2376455);
  const monthlyInvestment = Number(record.fireCalculations?.monthlyInvestment ?? 45000);
  const progressPct =
    selectedTarget > 0
      ? Number(Math.min(100, (currentNetWorth / selectedTarget) * 100).toFixed(1))
      : 0;
  const shortfall = Math.max(0, selectedTarget - currentNetWorth);

  // Estimate years to FIRE with compound growth
  const r = (settings.expectedAnnualReturn || 12) / 100;
  const annualContribution = Math.max(120000, monthlyInvestment * 12);
  let simWealth = currentNetWorth;
  let years = 0;
  while (simWealth < selectedTarget && years < 45) {
    simWealth = simWealth * (1 + r) + annualContribution;
    years += 0.5;
  }

  return {
    ...record,
    pillars,
    totalScore,
    maxScore: 100,
    tier,
    tierColor,
    achievedCount,
    gapsCount,
    fireSettings: settings,
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
}

export const extractFinancialHealthResult = (
  record?: FinancialHealthRecord | null
): FinancialHealthResult => {
  const effective = record?.pillars?.length ? record : getLocalHealthRecord();
  const pillars = (effective.pillars || []) as HealthPillar[];
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
  const effective = record?.fireCalculations ? record : getLocalHealthRecord();
  const calcs = effective.fireCalculations || {};
  const settings = effective.fireSettings || DEFAULT_FIRE_SETTINGS;
  const monthlyExpenses = Number(calcs.monthlyExpenses || settings.monthlyExpenses || 75000);
  const annualExpenses = Number(calcs.annualExpenses || monthlyExpenses * 12);
  const multiplier = Number(settings.multiplier || 25);

  return {
    monthlyExpenses,
    annualExpenses,
    leanFireTarget: Number(calcs.leanFireTarget || annualExpenses * 20),
    standardFireTarget: Number(calcs.standardFireTarget || annualExpenses * 25),
    fatFireTarget: Number(calcs.fatFireTarget || annualExpenses * 33),
    selectedTarget: Number(calcs.selectedTarget || annualExpenses * multiplier),
    currentNetWorth: Number(calcs.currentNetWorth || 0),
    progressPct: Number(calcs.progressPct || 0),
    shortfall: Number(calcs.shortfall || 0),
    yearsToFire: Number(calcs.yearsToFire || 0),
    targetYear: Number(calcs.targetYear || new Date().getFullYear()),
    monthlyInvestment: Number(calcs.monthlyInvestment || 0),
  };
};

export const financialHealthApi = {
  getHealthRecord: async (): Promise<FinancialHealthRecord> => {
    try {
      const { data } = await apiClient.get<FinancialHealthRecord>(ENDPOINT, { timeout: 4000 });
      if (data && data.pillars) {
        saveLocalHealthRecord(data);
        return data;
      }
    } catch {
      // Backend offline — serve local institutional health record
    }
    return getLocalHealthRecord();
  },

  saveHealthRecord: async (record: Partial<FinancialHealthRecord>): Promise<FinancialHealthRecord> => {
    const merged = recomputeRecordState({ ...getLocalHealthRecord(), ...record });
    saveLocalHealthRecord(merged);
    try {
      const { data } = await apiClient.post<FinancialHealthRecord>(ENDPOINT, merged);
      if (data) return data;
    } catch {
      // Saved locally
    }
    return merged;
  },

  updateHealthAnswer: async (pillarId: string, fulfilled: boolean): Promise<FinancialHealthRecord> => {
    const current = getLocalHealthRecord();
    const updatedPillars = (current.pillars || []).map((p) =>
      p.id === pillarId
        ? { ...p, isFulfilled: fulfilled, earnedPoints: fulfilled ? p.maxPoints : 0 }
        : p
    );
    const nextRecord = recomputeRecordState({ ...current, pillars: updatedPillars });
    saveLocalHealthRecord(nextRecord);

    try {
      const { data } = await apiClient.patch<FinancialHealthRecord>(
        `${ENDPOINT}/pillar/${pillarId}`,
        { isFulfilled: fulfilled }
      );
      if (data) return data;
    } catch {
      // Saved locally
    }
    return nextRecord;
  },

  updateFireSettings: async (settings: Partial<FireSettings>): Promise<FinancialHealthRecord> => {
    const current = getLocalHealthRecord();
    const nextRecord = recomputeRecordState({
      ...current,
      fireSettings: { ...(current.fireSettings || DEFAULT_FIRE_SETTINGS), ...settings },
    });
    saveLocalHealthRecord(nextRecord);

    try {
      const { data } = await apiClient.patch<FinancialHealthRecord>(
        `${ENDPOINT}/fire-settings`,
        settings
      );
      if (data) return data;
    } catch {
      // Saved locally
    }
    return nextRecord;
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

    const current = getLocalHealthRecord();
    const netWorth = params.portfolioValue + params.cashLiquidity - params.debtLiabilities;
    const syncedLocal = recomputeRecordState({
      ...current,
      fireCalculations: {
        ...(current.fireCalculations || {}),
        currentNetWorth: netWorth,
        monthlyInvestment: params.activeSipMonthly,
      },
    });
    saveLocalHealthRecord(syncedLocal);

    const payload = {
      liquidCash: params.cashLiquidity,
      debtLiabilities: params.debtLiabilities,
      activeSipMonthly: params.activeSipMonthly,
      portfolioValue: params.portfolioValue,
      distinctAssetClasses: distinctCategories.size,
      answers: params.answers,
      fireSettings: params.fireSettings,
    };

    try {
      const { data } = await apiClient.post<FinancialHealthRecord>(`${ENDPOINT}/sync`, payload);
      if (data && data.pillars) {
        saveLocalHealthRecord(data);
        return data;
      }
    } catch {
      // Synced locally
    }
    return syncedLocal;
  },
};

export const getStoredFireSettings = (record?: FinancialHealthRecord | null): FireSettings => {
  return record?.fireSettings || DEFAULT_FIRE_SETTINGS;
};

export const getStoredHealthAnswers = (record?: FinancialHealthRecord | null): Record<string, boolean> => {
  return record?.answers || {};
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
