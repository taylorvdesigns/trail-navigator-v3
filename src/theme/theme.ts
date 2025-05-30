import { createTheme } from '@mui/material/styles';
import { trailColors } from '../config/trailColors';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: trailColors.green,
    },
    secondary: {
      main: trailColors.blue,
    },
    warning: {
      main: trailColors.orange,
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#6B7280',
      disabled: 'rgba(255, 255, 255, 0.5)',
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
    MuiMenu: {
      styleOverrides: {
        paper: {
          color: 'white',
          backgroundColor: '#222',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: 'white !important', // Force white text
          '&.Mui-selected': {
            backgroundColor: '#333',
            color: 'white !important',
          },
          '&.Mui-selected:hover': {
            backgroundColor: '#444',
            color: 'white !important',
          },
          '&:hover': {
            backgroundColor: '#222',
            color: 'white !important',
          },
        },
      },
    },
  },
});
