import { Theme } from '@mui/material/styles';
import { theme } from './index';

export const darkTheme: Theme = {
  ...theme,
  palette: {
    ...theme.palette,
    mode: 'dark',
    background: {
      default: '#242424',
      paper: '#000000',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#6B7280',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
  },
};
