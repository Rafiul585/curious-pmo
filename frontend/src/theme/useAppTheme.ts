import { createTheme, PaletteMode, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';
import { useAppSelector } from '../hooks/redux';

// CuriousPMO Brand Colors (Purple Gradient Theme)
const brandColors = {
  primary: {
    main: '#667eea',      // Primary purple (gradient start)
    light: '#8b9ff5',     // Lighter purple
    dark: '#4c5fd5',      // Darker purple
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#764ba2',      // Secondary purple (gradient end)
    light: '#9b6fc4',     // Lighter violet
    dark: '#5a3680',      // Darker violet
    contrastText: '#ffffff',
  },
  success: {
    main: '#10b981',      // Teal green
    light: '#34d399',
    dark: '#059669',
  },
  warning: {
    main: '#f59e0b',      // Amber
    light: '#fbbf24',
    dark: '#d97706',
  },
  error: {
    main: '#ef4444',      // Red
    light: '#f87171',
    dark: '#dc2626',
  },
  info: {
    main: '#667eea',      // Same as primary for consistency
    light: '#8b9ff5',
    dark: '#4c5fd5',
  },
};

const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...brandColors,
    background: {
      default: mode === 'dark' ? '#0f0f1a' : '#f5f7ff',
      paper: mode === 'dark' ? '#1a1a2e' : '#ffffff',
    },
    divider: mode === 'dark' ? 'rgba(102, 126, 234, 0.12)' : 'rgba(102, 126, 234, 0.08)',
    text: {
      primary: mode === 'dark' ? '#f0f0ff' : '#1a1a2e',
      secondary: mode === 'dark' ? '#a0a0c0' : '#64648a',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          '&.MuiButton-contained': {
            color: '#ffffff !important',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorPrimary: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        barColorPrimary: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(102, 126, 234, 0.15)',
            color: '#667eea',
            '&:hover': {
              backgroundColor: 'rgba(102, 126, 234, 0.25)',
            },
          },
        },
      },
    },
  },
});

export const useAppTheme = () => {
  const themeMode = useAppSelector((s) => s.theme?.mode || 'light');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Resolve actual mode based on preference
  const resolvedMode: PaletteMode = useMemo(() => {
    if (themeMode === 'system') {
      return prefersDarkMode ? 'dark' : 'light';
    }
    return themeMode as PaletteMode;
  }, [themeMode, prefersDarkMode]);

  const theme = useMemo(() => createTheme(getDesignTokens(resolvedMode)), [resolvedMode]);
  return { theme, mode: themeMode };
};
