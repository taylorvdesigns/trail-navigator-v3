import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#43D633', // Green trail color
    },
    secondary: {
      main: '#6995E8', // Blue trail color
    },
    warning: {
      main: '#FFB134', // Orange trail color
    },
    text: {
      primary: '#000000',
      secondary: '#6B7280',
    },
    background: {
      default: '#242424',
      paper: '#000000',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    button: {
      textTransform: 'none',
    },
    body1: {
      fontSize: '11px',
      lineHeight: '16px',
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#242424',
        },
      },
    },
  },
});

export const trailColors = {
  green: '#43D633',
  blue: '#6995E8',
  orange: '#FFB134',
  grey: '#6B7280',
}; 