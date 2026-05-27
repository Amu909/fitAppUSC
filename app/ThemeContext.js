import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'fitapp_theme_mode';

const palettes = {
  light: {
    mode: 'light',
    background: '#f4f6fb',
    surface: '#ffffff',
    surfaceAlt: '#f8fafc',
    surfaceDark: '#111114',
    text: '#111827',
    textMuted: '#6b7280',
    textSoft: '#9ca3af',
    border: '#e5e7eb',
    borderSoft: '#eef2f7',
    primary: '#e60404',
    primarySoft: '#fee2e2',
    onPrimary: '#ffffff',
    tabInactive: '#94a3b8',
    success: '#22c55e',
    dangerSurface: '#fff1f2',
  },
  dark: {
    mode: 'dark',
    background: '#09090b',
    surface: '#111114',
    surfaceAlt: '#17181c',
    surfaceDark: '#050507',
    text: '#f9fafb',
    textMuted: '#d1d5db',
    textSoft: '#9ca3af',
    border: '#27272a',
    borderSoft: '#1f2937',
    primary: '#ff2b2b',
    primarySoft: '#3a1216',
    onPrimary: '#ffffff',
    tabInactive: '#8b92a8',
    success: '#22c55e',
    dangerSurface: '#2b1215',
  },
};

const ThemeContext = createContext({
  theme: palettes.light,
  mode: 'light',
  isDark: false,
  setMode: () => {},
  toggleTheme: () => {},
});

const readStoredTheme = () => {
  if (typeof localStorage === 'undefined') return 'light';
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const writeStoredTheme = (mode) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore persistence errors
  }
};

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');

  useEffect(() => {
    setModeState(readStoredTheme());
  }, []);

  const setMode = (nextMode) => {
    const resolved = nextMode === 'dark' ? 'dark' : 'light';
    setModeState(resolved);
    writeStoredTheme(resolved);
  };

  const toggleTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({
      theme: palettes[mode],
      mode,
      isDark: mode === 'dark',
      setMode,
      toggleTheme,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

