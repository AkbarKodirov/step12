import { useEffect, useRef, useState } from 'react'
import { Confetti } from '../../components/motion'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Flame, Heart, Trophy, X, Zap } from 'lucide-react'
import { isCorrect, loadIndex, loadTest, markActive, setStore, useStore, type TestQuestion } from '../store'
import { Passage } from './TakeTest'
import { useAuth } from '../../lib/auth'
import { markLimit, noteUse, openUpgrade, useAccount } from '../account'

type Row = { id: string; name: string; picture: string | null; score: number }

const SECONDS = 60
const mult = (streak: number) => (streak >= 10 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1)

async function buildPool() {
  const idx = await loadIndex()
  const tests = await Promise.all(idx.map((t) => loadTest(t.id)))
  const pool: TestQuestion[] = tests.flatMap((t) => t.modules.flatMap((m) => m.questions)).filter((q) => q.format === 'mc' && (q.passage?.length ?? 0) < 900)
  return pool.sort(() => Math.random() - 0.5)
}

function Leaderboard({ rows, me }: { rows: Row[] | null; me?: string }) {
  return (
    <div className="card mx-auto mt-4 max-w-2xl p-5">
      <p className="flex items-center justify-between text-[14px] font-semibold">
        <span className="flex items-center gap-2">
          <Trophy className="size-4 text-orange-500" /> This week's leaderboard
        </span>
        <span className="text-[12px] font-normal text-moss">Humo AI students</span>
      </p>
      {!rows ? (
        <p className="mt-4 text-[13px] text-moss">Couldn't load the leaderboard. Check your connection and try again.</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-moss">No runs yet this week — be the first.</p>
      ) : (
        <ol className="mt-3 divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-3 py-2.5 text-[14px] ${r.name === me ? 'font-semibold' : ''}`}>
              <span className={`w-6 text-center tabular-nums ${i < 3 ? 'text-orange-500' : 'text-moss'}`}>{i + 1}</span>
              {r.picture ? <img src={r.picture} alt="" referrerPolicy="no-referrer" className="size-7 rounded-full" /> : <span className="grid size-7 place-items-center rounded-full bg-cream text-[12px] font-semibold">{r.name[0]}</span>}
              <span className="flex-1 truncate">{r.name}</span>
              <span className="font-serif text-[18px] tabular-nums">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function Blitz() {
  const s = useStore()
  const { token, user } = useAuth()
  const [board, setBoard] = useState<Row[] | null>(null)
  const loadBoard = () =>
    fetch('/api/blitz/leaderboard')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setBoard(d.rows))
      .catch(() => setBoard(null))
  const [pool, setPool] = useState<TestQuestion[] | null>(null)
  const [phase, setPhase] = useState<'idle' | 'play' | 'over'>('idle')
  const [i, setI] = useState(0)
  const [lives, setLives] = useState(3)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(SECONDS)
  const [picked, setPicked] = useState<number | null>(null)
  const [answered, setAnswered] = useState(0)
  const started = useRef(0)

  useEffect(() => {
    buildPool().then(setPool)
  }, [])

  const q = pool?.[i % (pool?.length || 1)]

  useEffect(() => {
    if (phase !== 'play' || picked != null) return
    if (left <= 0) {
      resolve(null)
      return
    }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000)
    return () => clearTimeout(t)
  })

  const acc = useAccount()
  const runsLeft = acc.left('blitz')
  const [starting, setStarting] = useState(false)

  /** Free students get one run a day: the server counts it, the app asks for Pro when it is used. */
  async function tryStart() {
    if (!acc.pro && acc.loaded && runsLeft <= 0) return openUpgrade()
    setStarting(true)
    try {
      const r = await fetch('/api/blitz/start', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (r.status === 402) {
        markLimit('blitz')
        return openUpgrade()
      }
      if (r.ok && !acc.pro) noteUse('blitz')
    } catch {
      /* no server (local preview): let the run start */
    } finally {
      setStarting(false)
    }
    start()
  }

  function start() {
    setPhase('play')
    setI(Math.floor(Math.random() * 50))
    setLives(3)
    setStreak(0)
    setScore(0)
    setLeft(SECONDS)
    setPicked(null)
    setAnswered(0)
    started.current = Date.now()
  }

  function resolve(choice: number | null) {
    if (!q || picked != null) return
    setPicked(choice ?? -1)
    setAnswered((n) => n + 1)
    const ok = choice != null && isCorrect(q, String(choice))
    if (ok) {
      const bonus = Math.ceil(left / 10)
      setScore((x) => x + (10 + bonus) * mult(streak))
      setStreak((x) => x + 1)
    } else {
      setStreak(0)
      setLives((l) => l - 1)
    }
    setTimeout(
      () => {
        if (!ok && lives - 1 <= 0) {
          setPhase('over')
          markActive(Math.round((Date.now() - started.current) / 1000), 'blitz')
          return
        }
        setPicked(null)
        setLeft(SECONDS)
        setI((x) => x + 1)
      },
      ok ? 700 : 1500,
    )
  }

  useEffect(() => {
    loadBoard()
  }, [])
  useEffect(() => {
    if (phase !== 'over') return
    setStore((st) => ({ ...st, blitzBest: Math.max(st.blitzBest, score) }))
    if (score > 0)
      fetch('/api/blitz', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ score }) })
        .catch(() => {})
        .finally(loadBoard)
  }, [phase, score])

  if (phase === 'idle' || phase === 'over')
    return (
      <div className="mx-auto max-w-2xl">
        <div className="relative overflow-hidden rounded-[28px] bg-pine p-8 text-center text-cream sm:p-10">
          <div className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-orange-500/25 blur-3xl" />
          <Confetti fire={phase === 'over' && score > 0 && score >= s.blitzBest} />
          <Zap className="relative mx-auto size-10 text-orange-400" />
          <h1 className="display relative mt-4 text-[44px]">{phase === 'over' ? `${score} points` : 'Blitz'}</h1>
          <p className="relative mt-2 text-[15px] text-cream/65">{phase === 'over' ? `${answered} questions answered. Best: ${Math.max(s.blitzBest, score)}` : 'Answer fast. Keep the streak. Three lives.'}</p>
          <div className="relative mt-8 grid grid-cols-3 gap-3 text-[12.5px]">
            {[
              [Heart, '3 lives', 'A wrong answer or timeout costs one'],
              [Flame, 'Streak multiplier', '2× at 3, 3× at 6, 4× at 10'],
              [Trophy, `Best ${s.blitzBest}`, 'Speed bonus for fast answers'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Heart
              return (
                <div key={t as string} className="rounded-2xl bg-white/[0.06] p-3.5">
                  <I className="mx-auto size-5 text-orange-300" />
                  <p className="mt-2 font-semibold">{t as string}</p>
                  <p className="mt-0.5 text-cream/50">{d as string}</p>
                </div>
              )
            })}
          </div>
          <button disabled={!pool || starting} onClick={tryStart} className="btn relative mt-8 h-12 bg-orange-500 px-8 text-[15px] text-white hover:bg-orange-400 disabled:opacity-50">
            {!pool ? 'Loading questions…' : !acc.pro && acc.loaded && runsLeft <= 0 ? 'Unlimited runs with Pro' : phase === 'over' ? 'Play again' : 'Start run'}
          </button>
          <p className="relative mt-3 text-[12.5px] text-cream/60">Free plan: one Blitz run a day. Pro: unlimited runs.</p>
          {acc.loaded && !acc.pro && (
            <p className="relative mt-3 text-[12.5px] text-cream/60">{runsLeft > 0 ? `${runsLeft} free run left today` : 'Your free run for today is used. Come back tomorrow or go Pro.'}</p>
          )}
        </div>
        <Leaderboard rows={board} me={user?.name} />
      </div>
    )

  if (!q) return null
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <span className="flex gap-1">
          {[0, 1, 2].map((k) => (
            <Heart key={k} className={`size-6 ${k < lives ? 'fill-red-500 text-red-500' : 'text-[#dde3ec]'}`} />
          ))}
        </span>
        <span className="flex items-center gap-2">
          {mult(streak) > 1 && (
            <motion.span key={mult(streak)} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="rounded-full bg-orange-500 px-3 py-1 text-[13px] font-bold text-white">
              {mult(streak)}×
            </motion.span>
          )}
          <span className="inline-flex items-center gap-1 text-[14px] font-semibold">
            <Flame className="size-4 text-orange-500" /> {streak}
          </span>
        </span>
        <span className="font-serif text-[26px] tabular-nums">{score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
        <div className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${left <= 10 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${(left / SECONDS) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.18 }} className="card mt-5 p-6 sm:p-7">
          {q.passage && (
            <div className="mb-5 rounded-2xl bg-cream p-4">
              <Passage html={q.passage} />
            </div>
          )}
          <p className="whitespace-pre-wrap text-[16px] font-medium">{q.question}</p>
          <div className="mt-5 grid gap-2">
            {q.options.map((o, k) => {
              const right = picked != null && q.correct === k
              const wrong = picked === k && q.correct !== k
              return (
                <button key={k} disabled={picked != null} onClick={() => resolve(k)} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[14.5px] ${right ? 'border-emerald-500 bg-emerald-50 animate-pop' : wrong ? 'border-red-400 bg-red-50 animate-shake' : 'border-line hover:border-line-strong'}`}>
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-pine/30 text-[11px] font-bold">{'ABCD'[k]}</span>
                  <span className="prose-q flex-1" dangerouslySetInnerHTML={{ __html: o }} />
                  {right && <Check className="size-5 text-emerald-600" />}
                  {wrong && <X className="size-5 text-red-500" />}
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
