/**
 * Centralized formatting utilities for the Personal Tracker app.
 * All currency, date, and percentage formatting lives here — no duplicates elsewhere.
 */

// ─── Currency Formatters ──────────────────────────────────────────────────────

/** Format amount as Saudi Riyal (SAR) */
export const formatSAR = (amount: number): string => {
  return `SAR ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/** Format amount as Indian Rupee (INR ₹) */
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

/** Format amount as US Dollar ($) */
export const formatUSD = (amount: number): string => {
  return `$${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/** Generic currency formatter with locale-aware number formatting */
export const formatCurrency = (
  amount: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
};

// ─── Percentage Formatter ─────────────────────────────────────────────────────

/** Format a value as a percentage (e.g. 64.2 → "64.2%") */
export const formatPercent = (value: number, decimals = 1): string => {
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Compact INR display for large amounts:
 *   1,20,000  → ₹1.2L
 *   1,20,00,000 → ₹1.2Cr
 *   500 → ₹500
 */
export const formatINRCompact = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  }
  if (abs >= 1_000) {
    return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}₹${abs.toFixed(0)}`;
};

/**
 * Format a percentage change with explicit sign and optional color hint string.
 * e.g. 4.25 → "+4.25%" | -2.1 → "-2.10%"
 */
export const formatPctChange = (value: number, decimals = 2): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(decimals)}%`;
};

// ─── Date Formatters ──────────────────────────────────────────────────────────

/** Format a date string for display (e.g. "Wednesday, Sep 10, 2026") */
export const formatDateLong = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/** Format a date string as ISO date only (e.g. "2026-09-10") */
export const formatDateISO = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';
  return d.toISOString().split('T')[0];
};
