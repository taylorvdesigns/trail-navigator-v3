import { createTheme, Theme } from '@mui/material/styles';
import { DesignThemeConfig } from '../../hooks/useDesignTheme';
import { trailColors as localDefaults } from '../../config/trailColors';

export function createMuiThemeFromConfig(
  config: DesignThemeConfig | null,
  isDarkMode: boolean
): Theme {
  const variant = config?.variants?.[isDarkMode ? 'dark' : 'light'];

  const fallbackPalette = isDarkMode
    ? {
        mode: 'dark',
        primary: { main: '#39FF14' },
        secondary: { main: '#6995E8' },
        warning: { main: '#FFB134' },
        text: { primary: '#FFFFFF', secondary: '#B0B0B0' },
        background: { default: '#23272A', paper: '#000000' },
      }
    : {
        mode: 'light',
        primary: { main: '#2E7D32' },
        secondary: { main: '#1565C0' },
        warning: { main: '#FB8C00' },
        text: { primary: '#111111', secondary: '#4B5563' },
        background: { default: '#F6F7F9', paper: '#FFFFFF' },
      };

  const palette = {
    ...fallbackPalette,
    ...(variant?.palette || {}),
    mode: isDarkMode ? 'dark' : 'light',
  } as any;

  const theme = createTheme({
    palette,
    typography: {
      fontFamily: 'Roboto, sans-serif',
      button: { textTransform: 'none' },
    },
  });

  // Attach extra tokens (non-standard) in a namespaced field
  (theme as any).extra = {
    trailColors: { ...localDefaults, ...(variant?.trailColors || {}) },
    tokens: variant?.componentTokens || {},
    themeId: config?.id || 'fallback',
    themeName: config?.name || 'Fallback',
  };

  return theme;
}


