import React, { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'light' | 'dark';
const Ctx = createContext<{ mode: Mode; toggle: () => void } | null>(null);
const KEY = 'applika:theme';

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(KEY) as Mode) || 'light');
  useEffect(() => { localStorage.setItem(KEY, mode); document.documentElement.dataset.theme = mode; }, [mode]);
  const toggle = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));
  return <Ctx.Provider value={{ mode, toggle }}>{children}</Ctx.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}
