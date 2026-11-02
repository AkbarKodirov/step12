import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Google sends phones back here (redirect sign-in): #access_token=…&state=… */
export default function GoogleCallback() {
  const { signInWithGoogle } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const h = new URLSearchParams(location.hash.slice(1))
    const token = h.get('access_token')
    let expected: string | null = null
    try {
      expected = sessionStorage.getItem('step12.oauth')
      sessionStorage.removeItem('step12.oauth')
    } catch {
      /* ignore */
    }
    if (h.get('error')) return setError(h.get('error') === 'access_denied' ? 'Google sign-in was cancelled.' : `Google said: ${h.get('error')}`)
    if (!token || (expected && h.get('state') !== expected)) return setError('This sign-in link is not valid any more. Please try again.')
    history.replaceState(null, '', '/auth/google')
    signInWithGoogle(token)
      .then(() => nav('/app', { replace: true }))
      .catch((e) => setError((e as Error).message))
  }, [nav, signInWithGoogle])
  return (
    <div className="grid min-h-svh place-items-center bg-ink px-6 text-center text-cream">
      <div>
        <img src="/brand/humo-mark.svg" alt="" className={`mx-auto size-16 rounded-2xl ${error ? '' : 'animate-pulse'}`} />
        <p className="mt-5 text-[16px]">{error ?? 'Signing you in with Google…'}</p>
        {error && (
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-cream px-6 py-3 text-[14px] font-semibold text-ink">
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  )
}
