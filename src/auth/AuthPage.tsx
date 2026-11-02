import { lazy, Suspense, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GoogleButton, inAppBrowser } from './GoogleButton'
import { GOOGLE_CLIENT_ID, useAuth } from '../lib/auth'
import { Logo } from '../landing/Landing'

const HumoScene = lazy(() => import('../three/HumoScene'))

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, signInWithEmail } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (user) return <Navigate to="/app" replace />

  const signup = mode === 'signup'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.')
    setBusy(true)
    try {
      await signInWithEmail(mode, form)
      nav('/app')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[15px] placeholder:text-white/30 transition focus:border-jg-500/60 focus:bg-white/[0.05] focus:outline-none'

  return (
    <div className="grid min-h-svh bg-ink text-white lg:grid-cols-2">
      {/* Humo stage */}
      <aside className="relative hidden overflow-hidden border-r border-white/[0.07] lg:block">
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <HumoScene layout="compact" />
          </Suspense>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-ink to-transparent" />
        <div className="absolute left-10 top-8">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="absolute inset-x-10 bottom-10">
          <p className="max-w-md text-[22px] font-medium leading-snug tracking-tight">
            "A master draws the ensō in one breath. Mastery is a thousand small corrections."
          </p>
          <p className="mt-3 text-[13px] text-white/45">Humo finds yours, one question at a time.</p>
        </div>
      </aside>

      {/* Form */}
      <main className="relative flex flex-col px-4 py-8 sm:px-10">
        <div className="pointer-events-none absolute right-0 top-0 size-96 rounded-full bg-jg-500/10 blur-[120px] lg:hidden" />
        <div className="lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="display text-[40px]">{signup ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-3 text-[15px] text-white/50">{signup ? 'Start with a free diagnostic. Takes 40 minutes.' : 'Pick up where you left off with Humo.'}</p>

          <div className="mt-9 [&>div]:w-full [&_button]:w-full">
            {inAppBrowser() && (
              <div className="mb-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3.5 text-[13px] leading-snug text-amber-100">
                <b>Open this page in Chrome or Safari.</b> Google blocks sign-in inside Telegram, Instagram and other in-app browsers. Tap ⋮ / ⋯ → “Open in browser”, or sign up with email below.
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(location.href)}
                  className="mt-2 block rounded-full bg-amber-200 px-3 py-1.5 text-[12px] font-semibold text-ink"
                >
                  Copy link
                </button>
              </div>
            )}
            <GoogleButton size="lg" className="w-full" label={signup ? 'Sign up with Google' : 'Continue with Google'} />
          </div>
          {!GOOGLE_CLIENT_ID && <p className="mt-2 text-[11px] text-white/30">Demo mode — Google sign-in opens a demo account until a client ID is configured.</p>}

          <div className="my-7 flex items-center gap-4 text-[12px] text-white/35">
            <span className="h-px flex-1 bg-white/10" />
            or with email
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3" noValidate>
            {signup && (
              <label className="block">
                <span className="sr-only">Full name</span>
                <input className={input} placeholder="Full name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
            )}
            <label className="block">
              <span className="sr-only">Email</span>
              <input className={input} type="email" placeholder="Email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="sr-only">Password</span>
              <input
                className={input}
                type="password"
                placeholder="Password"
                autoComplete={signup ? 'new-password' : 'current-password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            {error && <p className="text-[13px] text-red-300">{error}</p>}
            <button disabled={busy} className="h-12 w-full rounded-full bg-jg-500 text-[15px] font-semibold text-white transition hover:bg-jg-400 disabled:opacity-60">
              {busy ? 'One moment…' : signup ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-7 text-center text-[14px] text-white/50">
            {signup ? 'Already have an account? ' : 'New to Humo AI? '}
            <Link to={signup ? '/login' : '/signup'} className="text-jg-300 hover:text-jg-200">
              {signup ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </motion.div>
        <p className="text-center text-[11px] text-white/30">
          By continuing you agree to the{' '}
          <Link to="/terms" className="underline hover:text-white/60">Terms</Link> and{' '}
          <Link to="/privacy" className="underline hover:text-white/60">Privacy Policy</Link> of Humo AI.
        </p>
      </main>
    </div>
  )
}
