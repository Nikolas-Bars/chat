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
  borderMuted: string
  text: string
  textMuted: string
  textInverse: string
  primary: string
  primaryLight: string
  primaryDark: string
  danger: string
  dangerLight: string
  success: string
  successLight: string
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

const AVATAR_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6']

export function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]!
}

export function peerInitials(name: string, lastName: string): string {
  return ((name?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

function getColors(theme: ResolvedTheme): ThemeColors {
  if (theme === 'dark') {
    return {
      background: '#020617',
      surface: '#0f172a',
      surfaceMuted: '#1e293b',
      surfaceStrong: '#334155',
      border: '#334155',
      borderMuted: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      textInverse: '#020617',
      primary: '#818cf8',
      primaryLight: 'rgba(129,140,248,0.15)',
      primaryDark: '#6366f1',
      danger: '#f87171',
      dangerLight: 'rgba(248,113,113,0.12)',
      success: '#4ade80',
      successLight: 'rgba(74,222,128,0.12)',
      badge: '#6366f1',
    }
  }

  return {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceMuted: '#f1f5f9',
    surfaceStrong: '#e2e8f0',
    border: '#e2e8f0',
    borderMuted: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#64748b',
    textInverse: '#ffffff',
    primary: '#6366f1',
    primaryLight: 'rgba(99,102,241,0.08)',
    primaryDark: '#4f46e5',
    danger: '#ef4444',
    dangerLight: 'rgba(239,68,68,0.08)',
    success: '#10b981',
    successLight: 'rgba(16,185,129,0.08)',
    badge: '#6366f1',
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
