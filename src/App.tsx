import { Component, lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './landing/Landing'
import { useAuth } from './lib/auth'

const AuthPage = lazy(() => import('./auth/AuthPage'))
const AppShell = lazy(() => import('./app/AppShell'))
const Legal = lazy(() => import('./legal/Legal'))
const GoogleCallback = lazy(() => import('./auth/GoogleCallback'))

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function Loading() {
  return (
    <div className="grid min-h-svh place-items-center bg-ink">
      <img src="/brand/humo-mark.svg" alt="" className="size-10 animate-pulse" />
    </div>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-svh place-items-center bg-cream p-6 text-pine">
        <div className="max-w-sm text-center">
          <img src="/brand/humo-mark.svg" alt="" className="mx-auto size-14 rounded-2xl" />
          <h1 className="display mt-6 text-[30px]">Something went wrong</h1>
          <p className="mt-2 text-[14px] text-moss">This page hit an error. Reloading usually fixes it; your progress is saved on this device.</p>
          <p className="mt-3 rounded-xl bg-white px-3 py-2 font-mono text-[11px] text-moss">{this.state.error.message}</p>
          <button onClick={() => location.reload()} className="btn btn-dark mt-6 h-11 px-6 text-[14px]">
            Reload page
          </button>
        </div>
      </div>
    )
  }
}

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/auth/google" element={<GoogleCallback />} />
        <Route path="/privacy" element={<Legal page="privacy" />} />
        <Route path="/terms" element={<Legal page="terms" />} />
        <Route
          path="/app/*"
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
