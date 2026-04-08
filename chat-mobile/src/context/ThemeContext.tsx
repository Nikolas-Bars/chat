import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

type ThemeColors = {
  background: string
  surface: string
  surfaceMuted: string
  surfaceStrong: string
  border: string
  text: string
  textMuted: string
  textInverse: string
  primary: string
  danger: string
  success: string
  badge: string
}

type ThemeContextValue = {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  colors: ThemeColors
  setMode: (mode: ThemeMode) => Promise<void>
  toggle: () => Promise<void>
}

const STORAGE_KEY = 'chat-mobile-theme-mode'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getColors(theme: ResolvedTheme): ThemeColors {
  if (theme === 'dark') {
    return {
      background: '#020617',
      surface: '#0f172a',
      surfaceMuted: '#111827',
      surfaceStrong: '#1e293b',
      border: '#334155',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      textInverse: '#020617',
      primary: '#60a5fa',
      danger: '#f87171',
      success: '#4ade80',
      badge: '#f43f5e',
    }
  }

  return {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceMuted: '#f1f5f9',
    surfaceStrong: '#0f172a',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    textInverse: '#ffffff',
    primary: '#2563eb',
    danger: '#b91c1c',
    success: '#15803d',
    badge: '#e11d48',
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('system')
  const resolvedTheme: ResolvedTheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode

  useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY)
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setModeState(saved)
      }
    })()
  }, [])

  const value = useMemo<ThemeContextValue>(() => {
    const persistMode = async (nextMode: ThemeMode) => {
      setModeState(nextMode)
      await AsyncStorage.setItem(STORAGE_KEY, nextMode)
    }

    return {
      mode,
      resolvedTheme,
      colors: getColors(resolvedTheme),
      setMode: persistMode,
      toggle: async () => {
        const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark'
        await persistMode(next)
      },
    }
  }, [mode, resolvedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
