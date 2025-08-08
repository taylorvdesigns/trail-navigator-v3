import { useTheme as useMuiTheme } from '@mui/material/styles';

/**
 * Returns a function to resolve semantic color tokens from the active theme.
 * Falls back to provided default or sensible palette values.
 */
export function useColorToken() {
  const theme = useMuiTheme() as any;
  const tokens: Record<string, string> = theme?.extra?.tokens || {};

  return (name: string, fallback?: string): string => {
    if (tokens[name]) return tokens[name];
    if (name === 'divider') return theme?.palette?.divider || fallback || '#333';
    if (name === 'textSecondary') return theme?.palette?.text?.secondary || fallback || '#6B7280';
    if (fallback) return fallback;
    return theme?.palette?.primary?.main || '#2E7D32';
  };
}


