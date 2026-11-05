import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, Sigma, Calculator, Menu, X as XIcon, BarChart3, BookMarked, BookOpen, CalendarCheck, ClipboardList, FileText, Flame, GraduationCap, Home, LogOut, MessageCircle, NotebookPen, Target, Trophy, Zap, Download } from 'lucide-react'
import { HumoFab } from './components/HumoFab'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'
import { startSync, streak, useBindStore, useStore } from './store'

const HomePage = lazy(() => import('./pages/Home'))
const HumoChat = lazy(() => import('./pages/HumoChat'))
const Tests = lazy(() => import('./pages/Tests'))
const TakeTest = lazy(() => import('./pages/TakeTest'))
const Results = lazy(() => import('./pages/Results'))
const ResultsList = lazy(() => import('./pages/ResultsList'))
const QBankHome = lazy(() => import('./practice/QBank').then((m) => ({ default: m.QBankHome })))
const QBankSection = lazy(() => import('./practice/QBank').then((m) => ({ default: m.QBankSection })))
const Runner = lazy(() => import('./practice/Runner'))
const CoursePage = lazy(() => import('./learn/Learn').then((m) => ({ default: m.CoursePage })))
const LessonPage = lazy(() => import('./learn/Learn').then((m) => ({ default: m.LessonPage })))
const Vocabulary = lazy(() => import('./pages/Vocabulary'))
const Blitz = lazy(() => import('./pages/Blitz'))
const Mistakes = lazy(() => import('./pages/Mistakes'))
const StudyPlan = lazy(() => import('./pages/StudyPlan'))
const ExamPapers = lazy(() => import('./pages/ExamPapers'))
const PaperPlayer = lazy(() => import('./pages/PaperPlayer'))
const Analytics = lazy(() => import('./pages/Analytics'))
const ScoreCalculator = lazy(() => import('./pages/ScoreCalculator'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const Onboarding = lazy(() => import('./Onboarding'))

type Item = { to: string; label: string; icon: typeof Home; end?: boolean; badge?: string }
const GROUPS: { label: string | null; items: Item[] }[] = [
  {
    label: null,
    items: [
      { to: '/app', label: 'Home', icon: Home, end: true },
      { to: '/app/humo', label: 'Ask Sensai', icon: MessageCircle },
      { to: '/app/plan', label: 'Study plan', icon: CalendarCheck },
    ],
  },
  {
    label: 'Practice',
    items: [
      { to: '/app/tests', label: 'Practice tests', icon: ClipboardList },
      { to: '/app/papers', label: 'Exam papers', icon: FileText },
      { to: '/app/practice', label: 'Question bank', icon: BookOpen },
      { to: '/app/desmos', label: 'Desmos Lab', icon: Sigma, badge: 'New' },
      { to: '/app/vocab', label: 'Vocabulary', icon: BookMarked },
      { to: '/app/blitz', label: 'Blitz', icon: Zap },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/app/learn/rw', label: 'Reading & Writing', icon: GraduationCap },
      { to: '/app/learn/math', label: 'Math & Desmos', icon: Calculator },
    ],
  },
  {
    label: 'Progress',
    items: [
      { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/app/mistakes', label: 'Saved & mistakes', icon: NotebookPen },
      { to: '/app/results', label: 'My results', icon: Trophy },
      { to: '/app/calculator', label: 'Score calculator', icon: Target },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/app/settings', label: 'Settings', icon: SettingsIcon }],
  },
]
const MOBILE = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/tests', label: 'Tests', icon: ClipboardList },
  { to: '/app/practice', label: 'Practice', icon: BookOpen },
  { to: '/app/vocab', label: 'Vocab', icon: BookMarked },
]

/** "Install app" button: shown only when the browser offers to install STEP12 (Android Chrome, desktop Chrome/Edge). */
function InstallButton() {
  const [evt, setEvt] = useState<any>(null)
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setEvt(e)
    }
    const done = () => setEvt(null)
    window.addEventListener('beforeinstallprompt', on)
    window.addEventListener('appinstalled', done)
    return () => {
      window.removeEventListener('beforeinstallprompt', on)
      window.removeEventListener('appinstalled', done)
    }
  }, [])
  if (!evt) return null
  return (
    <button
      onClick={async () => {
        evt.prompt()
        await evt.userChoice.catch(() => null)
        setEvt(null)
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-pine px-3.5 text-[13px] font-semibold text-cream"
    >
      <Download className="size-4" /> Install app
    </button>
  )
}

export function Avatar({ size = 'size-8' }: { size?: string }) {
  const { user } = useAuth()
  if (user?.picture) return <img src={user.picture} alt="" referrerPolicy="no-referrer" className={`${size} rounded-full`} />
  return <span className={`${size} grid place-items-center rounded-full bg-jg-500 text-[13px] font-semibold text-white`}>{user?.name?.[0]?.toUpperCase() ?? 'J'}</span>
}

function PageLoading() {
  return (
    <div className="grid h-64 place-items-center">
      <span className="size-6 animate-spin rounded-full border-2 border-jg-500 border-t-transparent" />
    </div>
  )
}

export default function AppShell() {
  const { user, token, signOut } = useAuth()
  useBindStore(user)
  const s = useStore()
  const nav = useNavigate()
  const { pathname } = useLocation()
  // browser tab title follows the page: "Question bank · STEP12"
  useEffect(() => {
    const all = GROUPS.flatMap((g) => g.items)
    const hit = [...all].sort((a, b) => b.to.length - a.to.length).find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
    const extra = pathname.startsWith('/app/practice/run') ? 'Practice' : /\/app\/tests\/[^/]+\/take/.test(pathname) ? 'Test in progress' : null
    document.title = `${extra ?? hit?.label ?? 'STEP12'} · STEP12`
    return () => {
      document.title = 'STEP12 — Digital SAT prep with Sensai'
    }
  }, [pathname])
  const days = streak(s.activeDays)
  const [more, setMore] = useState(false)

  // progress follows the student across devices and survives a cleared browser
  const [synced, setSynced] = useState(false)
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => alive && setSynced(true), 3000)
    startSync(token).finally(() => alive && setSynced(true))
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [token, user?.email])

  // Appearance: system / light / dark (Settings). The landing page never gets the class.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark-app', s.settings.theme === 'dark' || (s.settings.theme === 'system' && mq.matches))
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.documentElement.classList.remove('dark-app')
    }
  }, [s.settings.theme])

  // study reminder while the app is open (phone alerts come from the Google Calendar export)
  useEffect(() => {
    if (!s.settings.reminders || !('Notification' in window) || Notification.permission !== 'granted') return
    const day = (new Date().getDay() + 6) % 7
    if (!(s.profile.studyDays ?? [0, 1, 2, 3, 4, 5]).includes(day)) return
    const [h, m] = (s.profile.studyTime ?? '18:00').split(':').map(Number)
    const at = new Date()
    at.setHours(h, m, 0, 0)
    const ms = at.getTime() - Date.now()
    if (ms < 0) return
    const t = setTimeout(() => new Notification('Time to study with Sensai', { body: `Today's plan: ${(s.plan?.days[day] ?? []).map((x) => x.title).slice(0, 3).join(' · ') || 'Daily 20 words'}`, icon: '/sensai-mark.png' }), ms)
    return () => clearTimeout(t)
  }, [s.settings.reminders, s.profile.studyDays, s.profile.studyTime, s.plan])

  // The test runner is full-screen, like the real exam app.
  if (/\/app\/tests\/[^/]+\/take/.test(pathname) || pathname.startsWith('/app/practice/run') || /^\/app\/papers\/[^/]+/.test(pathname))
    return (
      <div className="min-h-svh bg-card text-pine">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="papers/:id" element={<PaperPlayer />} />
            <Route path="tests/:id/take" element={<TakeTest />} />
            <Route path="practice/run" element={<Runner />} />
          </Routes>
        </Suspense>
      </div>
    )

  // a returning student on a new device: wait for their saved progress before deciding to onboard
  if (!s.onboarded && !synced) return <PageLoading />

  if (!s.onboarded)
    return (
      <Suspense fallback={<PageLoading />}>
        <div className="theme-light">
          <Onboarding />
        </div>
      </Suspense>
    )

  return (
    <div className="min-h-svh bg-cream pb-20 text-pine md:pb-0 md:pl-64">
      {/* Sidebar */}
      <aside className="theme-light fixed inset-y-0 left-0 hidden w-64 flex-col bg-pine p-4 text-cream md:flex">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2">
          <img src="/brand/step12-logo.png" alt="STEP12" className="h-8 w-auto rounded-[5px] ring-1 ring-white/15" />
          <span className="border-l border-white/15 pl-2.5 text-[10.5px] font-medium uppercase leading-tight tracking-[0.14em] text-cream/55">
            Digital
            <br />
            SAT
          </span>
        </Link>
        <nav className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
          {GROUPS.map((g, i) => (
            <div key={i}>
              {g.label && <p className="mb-1.5 px-3 text-[11px] font-semibold text-cream/35">{g.label}</p>}
              <div className="space-y-0.5">
                {g.items.map(({ to, label, icon: Icon, end, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors ${isActive ? 'text-cream' : 'text-cream/60 hover:bg-white/[0.05] hover:text-cream'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-white/[0.1]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                        {isActive && <motion.span layoutId="nav-bar" className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-jg-400" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                        <Icon className="relative size-[18px]" />
                        <span className="relative">{label}</span>
                        {to === '/app/humo' && <img src="/sensai-mark.png" alt="" className="relative ml-auto size-5 rounded-md" />}
                        {badge && <span className="relative ml-auto rounded-md bg-[#2d70b3] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">{badge}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5">
          <Avatar />
          <Link to="/app/settings" className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{user?.name}</p>
            <p className="truncate text-[11px] text-cream/40">{user?.email}</p>
          </Link>
          <Link to="/app/settings" aria-label="Settings" className="rounded-lg p-1.5 text-cream/45 hover:bg-white/[0.08] hover:text-cream">
            <SettingsIcon className="size-4" />
          </Link>
          <button
            aria-label="Log out"
            onClick={() => {
              signOut()
              nav('/')
            }}
            className="rounded-lg p-1.5 text-cream/45 hover:bg-white/[0.08] hover:text-cream"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 md:hidden">
            <img src="/brand/step12-logo.png" alt="STEP12" className="h-7 w-auto rounded-[4px]" />
          </Link>
          <span className="hidden md:block" />
          <div className="flex items-center gap-2">
            <InstallButton />
            <span title="Daily streak" className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold ${days ? 'bg-orange-500 text-white' : 'bg-card text-moss ring-1 ring-line'}`}>
              <Flame className={`size-4 ${days ? 'animate-flicker' : ''}`} /> {days}
            </span>
            <Link to="/app/settings" aria-label="Settings" className="md:hidden">
              <Avatar />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <Suspense fallback={<PageLoading />}>
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="humo" element={<HumoChat key="humo" />} />
            <Route path="tests" element={<Tests />} />
            <Route path="results" element={<ResultsList />} />
            <Route path="results/:attemptId" element={<Results />} />
            <Route path="practice" element={<QBankHome />} />
            <Route path="practice/:section" element={<QBankSection />} />
            <Route path="vocab" element={<Vocabulary />} />
            <Route path="blitz" element={<Blitz />} />
            <Route path="mistakes" element={<Mistakes />} />
            <Route path="plan" element={<StudyPlan />} />
            <Route path="drills" element={<Navigate to="/app/practice" replace />} />
            <Route path="papers" element={<ExamPapers />} />
            <Route path="lessons" element={<Navigate to="/app/learn/rw" replace />} />
            <Route path="learn/:course" element={<CoursePage />} />
            <Route path="learn/:course/:lesson" element={<LessonPage />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="calculator" element={<ScoreCalculator />} />
            <Route path="desmos" element={<HumoChat key="desmos" space="desmos" />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
          </motion.div>
        </Suspense>
      </main>

      {!pathname.startsWith('/app/results/') && pathname !== '/app/humo' && pathname !== '/app/desmos' && <HumoFab />}

      {/* Mobile bottom nav */}
      <nav className="theme-light fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-pine pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMore(false)} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] ${isActive && !more ? 'text-jg-400' : 'text-cream/50'}`}>
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
        <button onClick={() => setMore((m) => !m)} aria-expanded={more} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${more ? 'text-jg-400' : 'text-cream/50'}`}>
          {more ? <XIcon className="size-5" /> : <Menu className="size-5" />}
          More
        </button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-30 bg-pine/40 md:hidden" onClick={() => setMore(false)}>
          <div onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] max-h-[70svh] overflow-y-auto rounded-t-[28px] bg-pine p-5 text-cream theme-light">
            {GROUPS.map((g, i) => (
              <div key={i} className="mb-4">
                {g.label && <p className="mb-1.5 px-1 text-[11px] font-semibold text-cream/40">{g.label}</p>}
                <div className="grid grid-cols-2 gap-1.5">
                  {g.items.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end} onClick={() => setMore(false)} className={({ isActive }) => `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] ${isActive ? 'bg-white/[0.12]' : 'bg-white/[0.04]'}`}>
                      <Icon className="size-4" /> {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                signOut()
                nav('/')
              }}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.04] py-2.5 text-[13px] text-cream/70"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
