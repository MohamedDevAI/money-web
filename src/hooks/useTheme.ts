/**
 * Hook for applying the application theme.
 *
 * The app ships a single "Sunrise" orange & white light theme, so this hook
 * simply pins `data-theme="light"` on the document root. Component styles that
 * still carry `[data-theme='light']` overrides rely on this attribute.
 */

import { useEffect } from 'react';

export const APP_THEME = 'light' as const;

export function useTheme() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', APP_THEME);
  }, []);

  return { theme: APP_THEME };
}
