/**
 * Application-wide constants.
 * Consolidates values previously scattered across financeConstants.ts, Habits.tsx, Goals.tsx, Tasks.tsx, etc.
 */

// ─── API Configuration ───────────────────────────────────────────────────────

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ─── Category Color Palette (for charts & badges) ────────────────────────────

export const CATEGORY_PALETTE = [
  '#f97316', // Orange 500
  '#9a3412', // Orange 800
  '#fdba74', // Orange 300
  '#57534e', // Stone 600
  '#f59e0b', // Amber 500
  '#c2410c', // Orange 700
  '#fed7aa', // Orange 200
  '#78350f', // Amber 900
  '#fb923c', // Orange 400
  '#a8a29e', // Stone 400
  '#ea580c', // Orange 600
  '#fcd34d', // Amber 300
  '#7c2d12', // Orange 900
  '#d97706', // Amber 600
  '#ffedd5', // Orange 100
  '#292524', // Stone 800
] as const;

/** Get a color from the palette by index (wraps around) */
export const getCategoryColor = (index: number): string => {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
};

// ─── Payment Methods ──────────────────────────────────────────────────────────

export const PAYMENT_METHODS = ['Account', 'Card', 'Cash', 'Transfer', 'UPI'] as const;

// ─── Domain Category Lists ───────────────────────────────────────────────────

export const HABIT_CATEGORIES = [
  'Health', 'Productivity', 'Mindset', 'Learning', 'Fitness', 'Finance',
] as const;

export const GOAL_CATEGORIES = [
  'Career', 'Finance', 'Fitness', 'Learning', 'Personal',
] as const;

export const TASK_CATEGORIES = [
  'Development', 'DevOps', 'Finance', 'Health', 'Personal', 'General',
] as const;

// ─── Day Names ────────────────────────────────────────────────────────────────

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;



