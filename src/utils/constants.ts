/**
 * Application-wide constants for Money OS (Investing & Pro Trading).
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const CATEGORY_PALETTE = [
  '#10b981', // Emerald 500
  '#06b6d4', // Cyan 500
  '#6366f1', // Indigo 500
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#f43f5e', // Rose 500
] as const;

export const getCategoryColor = (index: number): string => {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
};
