import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { GOOGLE_CLIENT_ID, useAuth } from '../lib/auth'
import { exciteHumo } from '../three/humoMood'

type Props = { size?: 'md' | 'lg'; className?: string; label?: string }

export function GoogleG({ className = 'size-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

const base =
  'group inline-flex items-center justify-center gap-3 rounded-full bg-cream font-medium text-ink transition hover:bg-white active:scale-[0.98] disabled:opacity-60'
const sizes = { md: 'h-11 px-5 text-sm', lg: 'h-13 px-7 text-[15px]' }

/** In-app browsers (Telegram, Instagram, Facebook…) are blocked by Google sign-in. */
export const inAppBrowser = () => /Telegram|Instagram|FBAN|FBAV|Line\/|; wv\)|MicroMessenger|TikTok/i.test(navigator.userAgent)

/** Phones and tablets: popups there are often blocked or open in a separate tab that never comes back,
 * so these devices go straight to the full-page Google sign-in. */
export const isPhone = () =>
  /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) || // iPadOS reports itself as a Mac
  (window.matchMedia?.('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820)

/** Full-page Google sign-in (no popup) — used when a phone blocks the popup. */
export function googleRedirect() {
  const state = Math.random().toString(36).slice(2)
  try {
    sessionStorage.setItem('step12.oauth', state)
  } catch {
    /* ignore */
  }
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: `${location.origin}/auth/google`,
    response_type: 'token',
    scope: 'openid email profile',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  })
  location.href = `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

function LiveButton({ size = 'lg', className = '', label = 'Continue with Google' }: Props) {
  const { signInWithGoogle } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const login = useGoogleLogin({
    scope: 'openid email profile',
    onSuccess: async (r) => {
      try {
        await signInWithGoogle(r.access_token)
        nav('/app')
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setBusy(false)
      }
    },
    onError: () => {
      setBusy(false)
      setError('Google sign-in was cancelled. Try again.')
    },
    // the popup could not open (common on phones) → do the whole sign-in in this tab instead
    onNonOAuthError: (e) => {
      setBusy(false)
      if (e.type === 'popup_failed_to_open') googleRedirect()
    },
  })
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setError(null)
          setBusy(true)
          // phones: full-page sign-in every time (no popup to get blocked or lost)
          if (isPhone()) return googleRedirect()
          login()
          // if the student closes the popup, Google sends nothing back: free the button again
          setTimeout(() => setBusy(false), 60_000)
        }}
        onPointerEnter={() => exciteHumo(true)}
        onPointerLeave={() => exciteHumo(false)}
        className={`${base} ${sizes[size]} ${className}`}
      >
        <GoogleG />
        {busy ? 'Opening Google…' : label}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}

/** Shown until VITE_GOOGLE_CLIENT_ID is set — signs into a demo account so the flow is clickable. */
function DemoButton({ size = 'lg', className = '', label = 'Continue with Google' }: Props) {
  const { signInDemo } = useAuth()
  const nav = useNavigate()
  return (
    <button
      type="button"
      title="Demo mode: add VITE_GOOGLE_CLIENT_ID to enable real Google sign-in"
      onClick={() => {
        signInDemo()
        nav('/app')
      }}
      onPointerEnter={() => exciteHumo(true)}
      onPointerLeave={() => exciteHumo(false)}
      className={`${base} ${sizes[size]} ${className}`}
    >
      <GoogleG />
      {label}
    </button>
  )
}

export function GoogleButton(props: Props) {
  return GOOGLE_CLIENT_ID ? <LiveButton {...props} /> : <DemoButton {...props} />
}
