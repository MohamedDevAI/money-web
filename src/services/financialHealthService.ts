/**
 * Financial Health Score Diagnostic & FIRE Freedom Service
 * All figures computed in Indian Rupee (INR ₹)
 *
 * Backend Target:
 *   Database: MongoDB
 *   Collection: financial_health
 *   Base path: /api/financial_health
 *
 * All Pillars, Aspects, Questions, and Scores are stored in and served directly from MongoDB.
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
  expectedAnnualReturn: number; // % default 11% p.a.
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
  monthlyExpenses: 60000, // ₹60,000 / month
  multiplier: 25,
  expectedAnnualReturn: 11, // 11% CAGR
};

const ENDPOINT = '/financial_health';

// ─── Extractors that format DB-stored records into UI view models ──────────

export const extractFinancialHealthResult = (
  record?: FinancialHealthRecord | null
): FinancialHealthResult => {
  const pillars = (record?.pillars || []) as HealthPillar[];
  const totalScore = record?.totalScore ?? (pillars.reduce((sum, p) => sum + (p.earnedPoints || 0), 0));
  const maxScore = record?.maxScore ?? 100;
  const achievedCount = record?.achievedCount ?? (pillars.filter((p) => p.isFulfilled).length);
  const gapsCount = record?.gapsCount ?? (pillars.length - achievedCount);

  let tier = record?.tier;
  let tierColor = record?.tierColor;
  let tierDescription = record?.tierDescription;

  if (!tier) {
    if (totalScore >= 85) {
      tier = 'Elite Fortress';
      tierColor = '#7c3aed';
      tierDescription = 'Your wealth architecture is bulletproof, diversified, and primed for rapid compounding.';
    } else if (totalScore >= 70) {
      tier = 'Strong Compounding';
      tierColor = '#9333ea';
      tierDescription = 'Robust foundations with strong regular investing. Address remaining minor gaps for elite status.';
    } else if (totalScore >= 50) {
      tier = 'Stable with Gaps';
      tierColor = '#a855f7';
      tierDescription = 'Core assets are in place, but protective gaps leave you vulnerable to market or life shocks.';
    } else {
      tier = 'High Risk';
      tierColor = '#6b7280';
      tierDescription = 'Urgent gaps in safety buffer or liabilities require immediate attention.';
    }
  }

  const firstGap = pillars.find((p) => !p.isFulfilled);
  const nextBestAction = record?.nextBestAction || (
    firstGap
      ? `${firstGap.title}: ${firstGap.gapText}`
      : 'All core financial health pillars achieved! Keep compounding.'
  );

  return {
    totalScore,
    maxScore,
    tier: tier as FinancialHealthResult['tier'],
    tierColor: tierColor || '#6b7280',
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
  const calcs = record?.fireCalculations || {};
  const settings = record?.fireSettings || DEFAULT_FIRE_SETTINGS;
  const monthlyExpenses = Number(calcs.monthlyExpenses || settings.monthlyExpenses || 60000);
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

// ─── API Service Operations (MongoDB collection: financial_health) ──────────

export const financialHealthApi = {
  /**
   * Fetch the latest Financial Health record from MongoDB collection `financial_health`.
   * Returns all pillars, questions, answers, and scores loaded directly from DB.
   */
  getHealthRecord: async (): Promise<FinancialHealthRecord> => {
    const { data } = await apiClient.get<FinancialHealthRecord>(ENDPOINT);
    return data;
  },

  /**
   * Save / Upsert complete Financial Health record in MongoDB collection `financial_health`.
   */
  saveHealthRecord: async (record: Partial<FinancialHealthRecord>): Promise<FinancialHealthRecord> => {
    const { data } = await apiClient.post<FinancialHealthRecord>(ENDPOINT, record);
    return data;
  },

  /**
   * Toggle or update a specific health pillar answer in MongoDB collection `financial_health`.
   * The backend updates the pillar, re-computes earned points and total score, and persists to DB.
   */
  updateHealthAnswer: async (pillarId: string, fulfilled: boolean): Promise<FinancialHealthRecord> => {
    const { data } = await apiClient.patch<FinancialHealthRecord>(`${ENDPOINT}/pillar/${pillarId}`, {
      isFulfilled: fulfilled,
    });
    return data;
  },

  /**
   * Update FIRE calculator settings in MongoDB collection `financial_health`.
   * The backend updates settings, recalculates FIRE numbers, and persists to DB.
   */
  updateFireSettings: async (settings: Partial<FireSettings>): Promise<FinancialHealthRecord> => {
    const { data } = await apiClient.patch<FinancialHealthRecord>(`${ENDPOINT}/fire-settings`, settings);
    return data;
  },

  /**
   * Synchronize live portfolio stats, evaluate dynamic pillars in DB, and persist.
   */
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

    const payload = {
      liquidCash: params.cashLiquidity,
      debtLiabilities: params.debtLiabilities,
      activeSipMonthly: params.activeSipMonthly,
      portfolioValue: params.portfolioValue,
      distinctAssetClasses: distinctCategories.size,
      answers: params.answers,
      fireSettings: params.fireSettings,
    };

    const { data } = await apiClient.post<FinancialHealthRecord>(`${ENDPOINT}/sync`, payload);
    return data;
  },
};

// ─── Helpers for Compatibility ──────────────────────────────────────────────

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
