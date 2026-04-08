import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearAccessToken, getAccessToken, setAccessToken } from '../storage/token'
import { fetchMeApi, loginApi, logoutApi } from '../api/auth'

type Me = { userId: number; login?: string; role: 'root' | 'admin' | 'user' } | null

type AuthContextValue = {
  token: string | null
  loading: boolean
  me: Me
  login: (loginOrEmail: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<Me>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const t = await getAccessToken()
      if (cancelled) return
      setToken(t)
      if (t) {
        try {
          const m = await fetchMeApi()
          if (!cancelled) setMe(m)
        } catch {
          if (!cancelled) {
            setMe(null)
            await clearAccessToken()
            setToken(null)
          }
        }
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (loginOrEmail: string, password: string) => {
    const res = await loginApi(loginOrEmail, password)
    if (res.accessToken) {
      await setAccessToken(res.accessToken)
      setToken(res.accessToken)
    }
    const m = await fetchMeApi()
    setMe(m)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      /* ignore */
    }
    await clearAccessToken()
    setToken(null)
    setMe(null)
  }, [])

  const refreshMe = useCallback(async () => {
    const m = await fetchMeApi()
    setMe(m)
  }, [])

  const value = useMemo(
    () => ({ token, loading, me, login, logout, refreshMe }),
    [token, loading, me, login, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
