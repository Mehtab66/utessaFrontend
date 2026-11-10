import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await api('/api/v1/auth/me')
      setUser(me)
      return me
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Clear legacy localStorage tokens — session is cookie-based now.
    try {
      localStorage.removeItem('utessa_token')
    } catch {
      /* ignore */
    }
    refresh()
  }, [refresh])

  const setSessionUser = useCallback((me) => {
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/api/v1/auth/logout', { method: 'POST' })
    } catch {
      /* still clear local session */
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      setSessionUser,
      // backwards-compatible alias used by older pages
      loginWithToken: (_token, me) => setSessionUser(me),
      logout,
      isAuthenticated: !!user,
    }),
    [user, loading, refresh, setSessionUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
