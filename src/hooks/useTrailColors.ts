import { useTheme as useMuiTheme } from '@mui/material/styles';

/**
 * Returns a function that resolves a trail's color from the active theme.
 * Falls back to the provided default color, then to the theme's primary color.
 */
export function useTrailColors() {
  const theme = useMuiTheme() as any;
  const map: Record<string, string> = theme?.extra?.trailColors || {};
  const primary: string = theme?.palette?.primary?.main || '#2E7D32';

  return (trailId: string | undefined, fallback?: string): string => {
    if (trailId && map[trailId]) return map[trailId];
    if (fallback) return fallback;
    return primary;
  };
}


