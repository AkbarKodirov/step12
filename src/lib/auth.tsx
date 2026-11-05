import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type User = {
  id: string
  name: string
  email: string
  picture?: string
  provider: 'google' | 'email' | 'demo'
  createdAt?: number
}

type Session = { token: string; user: User }

type AuthCtx = {
  user: User | null
  token: string | null
  signInWithGoogle: (accessToken: string) => Promise<void>
  signInWithEmail: (mode: 'login' | 'signup', data: { name?: string; email: string; password: string }) => Promise<void>
  signInDemo: () => void
  signOut: () => void
}

const KEY = 'humo.session'
const OLD_KEYS = ['step12.session', 'jamals.session'] // used by older builds; moved over on first load
const Ctx = createContext<AuthCtx | null>(null)

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data as T
}

/** True when the API server isn't running (static hosting / frontend-only dev). */
function isOffline(e: unknown) {
  const s = (e as { status?: number }).status
  return e instanceof TypeError || s === 404 || s === 502 || s === 503 || s === 504
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? OLD_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ?? null
      return raw ? (JSON.parse(raw) as Session) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session))
      else localStorage.removeItem(KEY)
      OLD_KEYS.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* storage blocked — session lives in memory */
    }
  }, [session])

  const signInWithGoogle = useCallback(async (accessToken: string) => {
    try {
      setSession(await post<Session>('/api/auth/google', { accessToken }))
    } catch (e) {
      if (!isOffline(e)) throw e
      // Frontend-only mode (no API server): read the Google profile directly.
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) throw new Error('Google sign-in failed. Try again.')
      const p = (await res.json()) as { sub: string; name: string; email: string; picture?: string }
      setSession({ token: 'google-offline', user: { id: p.sub, name: p.name, email: p.email, picture: p.picture, provider: 'google' } })
    }
  }, [])

  const signInWithEmail = useCallback<AuthCtx['signInWithEmail']>(async (mode, data) => {
    try {
      setSession(await post<Session>(`/api/auth/${mode}`, data))
    } catch (e) {
      if (!isOffline(e)) throw e
      setSession({
        token: 'offline',
        user: { id: data.email, name: data.name || data.email.split('@')[0], email: data.email, provider: 'email' },
      })
    }
  }, [])

  const signInDemo = useCallback(() => {
    setSession({ token: 'demo', user: { id: 'demo', name: 'Demo student', email: 'demo@humo.ai', provider: 'demo' } })
  }, [])

  const signOut = useCallback(() => setSession(null), [])

  const value = useMemo(
    () => ({ user: session?.user ?? null, token: session?.token ?? null, signInWithGoogle, signInWithEmail, signInDemo, signOut }),
    [session, signInWithGoogle, signInWithEmail, signInDemo, signOut],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
