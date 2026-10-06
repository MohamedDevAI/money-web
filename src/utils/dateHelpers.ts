/**
 * Centralized date-parsing and month-name utilities.
 * Previously scattered across financeConstants.ts, BorrowRepayView.tsx, and expenseApi.ts.
 */

// ─── Month Names ──────────────────────────────────────────────────────────────

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export type MonthName = (typeof MONTH_NAMES)[number];

/** Get current 4-digit year */
export const getCurrentYear = (): number => new Date().getFullYear();

/** Get current month 3-letter abbreviation (e.g. "Sep") */
export const getCurrentMonth = (): MonthName => MONTH_NAMES[new Date().getMonth()];

/** Get 0-based month index from abbreviation (e.g. "Mar" → 2). Returns -1 if invalid. */
export const getMonthIndex = (monthName: string): number => {
  return MONTH_NAMES.findIndex(
    (m) => m.toLowerCase() === monthName.slice(0, 3).toLowerCase()
  );
};

/** Get 3-letter month abbreviation from 0-based index (e.g. 2 → "Mar") */
export const getMonthName = (index: number): MonthName => {
  return MONTH_NAMES[Math.max(0, Math.min(11, index))];
};

// ─── Transaction Date Parsing ─────────────────────────────────────────────────

/**
 * Parse a Transaction's date fields into a normalized { year, month } object.
 * Handles multiple backend date formats: "YYYY-MM-DD", ISO 8601, or pre-set `month` field.
 */
export const parseTxDate = (tx: { date?: string; transactionDate?: string; month?: string }): { year: number; month: string } => {
  let year = getCurrentYear();
  let month = tx.month || getCurrentMonth();

  const rawDate = tx.date || tx.transactionDate || '';
  if (typeof rawDate === 'string') {
    const match = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = parseInt(match[1], 10);
      const mIdx = parseInt(match[2], 10) - 1;
      if (!tx.month && mIdx >= 0 && mIdx < 12) {
        month = MONTH_NAMES[mIdx];
      }
    } else {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        if (!tx.month) {
          month = MONTH_NAMES[d.getMonth()];
        }
      }
    }
  }

  // Normalize month abbreviation to canonical form
  if (month) {
    const found = MONTH_NAMES.find(
      (m) => m.toLowerCase() === month.slice(0, 3).toLowerCase()
    );
    if (found) month = found;
  }

  return { year, month };
};

// ─── Generic Date String Parsing ──────────────────────────────────────────────

/**
 * Parse an arbitrary date string into { month, year } components.
 * Supports "YYYY-MM-DD", "M/D/YYYY", and ISO 8601 formats.
 */
export const parseDateMonthYear = (
  dateStr: string
): { month: string; year: string } => {
  if (!dateStr) return { month: '', year: '' };

  // Handle M/D/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const mIdx = parseInt(parts[0], 10) - 1;
      const y = parts[2].trim();
      const m = mIdx >= 0 && mIdx < 12 ? MONTH_NAMES[mIdx] : '';
      return { month: m, year: y };
    }
  }

  // Handle ISO / YYYY-MM-DD
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return {
      month: MONTH_NAMES[d.getMonth()],
      year: String(d.getFullYear()),
    };
  }

  return { month: '', year: '' };
};

// ─── ISO Date String Helpers ──────────────────────────────────────────────────

/**
 * Convert a date value to a full ISO-8601 string (e.g. "2026-03-01T00:00:00.000Z").
 * Handles "YYYY-MM-DD" strings, Date objects, and ISO strings.
 */
export const toISODateString = (rawDate: string | Date): string => {
  if (rawDate instanceof Date) {
    return rawDate.toISOString();
  }

  if (typeof rawDate === 'string' && rawDate.includes('T')) {
    return rawDate;
  }

  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return `${rawDate}T00:00:00.000Z`;
};

/** Extract the date-only portion from an ISO string (e.g. "2026-03-01") */
export const toDateOnlyString = (rawDate: string | Date): string => {
  const iso = toISODateString(rawDate);
  return iso.split('T')[0];
};

/**
 * Check if a given month/year combination is October 2026 or later.
 * Used by planned expense sync logic to avoid modifying historical data.
 */
export const isFromOctober2026Onwards = (month: string, year: number): boolean => {
  const mIdx = getMonthIndex(month);
  if (year > 2026) return true;
  if (year === 2026 && mIdx >= 9) return true; // Oct = 9
  return false;
};
