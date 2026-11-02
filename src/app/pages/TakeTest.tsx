import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Highlighter, Bookmark, Calculator, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, LogOut, Sigma, X } from 'lucide-react'
import { isCorrect, loadTest, markActive, scaleSection, setStore, useAsync, type Attempt, type Mode, type Test, type TestQuestion } from '../store'
import { HumoExplain } from '../components/HumoExplain'
import { Highlightable } from '../components/Highlightable'
import { clearHighlights } from '../highlights'
import { RichText } from '../components/RichText'
import { askHumo, questionPayload } from '../humo'
import { useAuth } from '../../lib/auth'
import { tex, texText } from '../tex'

const LETTERS = ['A', 'B', 'C', 'D']

export function QuestionBody({ q, className = '' }: { q: TestQuestion; className?: string }) {
  return (
    <>
      {q.image && <img src={q.image} alt="Figure for this question" className="mx-auto mb-5 block max-h-[22rem] w-auto max-w-full rounded-xl bg-white p-2 dark:invert-[.92]" />}
      <p className={`whitespace-pre-wrap text-[16.5px] font-medium leading-relaxed ${className}`} dangerouslySetInnerHTML={{ __html: texText(q.question) }} />
    </>
  )
}

export function Passage({ html }: { html: string }) {
  // Content is authored by STEP12 and bundled with the app.
  return <div className="prose-q font-serif text-[17px] leading-[1.75] text-pine" dangerouslySetInnerHTML={{ __html: tex(html) }} />
}

type Ans = { value: string | null; flagged: boolean; seconds: number; checked: boolean; struck: number[] }

export default function TakeTest() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const mode = (params.get('mode') as Mode) || 'exam'
  const { data: test, error } = useAsync(() => loadTest(id), [id])
  if (error) return <p className="p-10 text-center text-red-600">{error}</p>
  if (!test)
    return (
      <div className="grid min-h-svh place-items-center">
        <span className="size-7 animate-spin rounded-full border-2 border-jg-500 border-t-transparent" />
      </div>
    )
  return <Runner test={test} mode={mode} />
}

function HintButton({ q, value }: { q: TestQuestion; value: string | null }) {
  const { token } = useAuth()
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setHint(null), [q])
  async function get() {
    setBusy(true)
    const p = questionPayload(q, value)
    try {
      setHint(
        (await askHumo(
          [{ role: 'user', text: `Give me ONE short hint (max 2 sentences) for this question. Do NOT reveal the answer or say which letter is correct. No Desmos screen block.\n${p.passage ? `Text: ${p.passage}\n` : ''}Question: ${p.question}\n${p.options.join('\n')}${p.chosen ? `\nI'm leaning towards ${p.chosen}.` : ''}` }],
          token,
        )).reply,
      )
    } catch (e) {
      setHint((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-3">
      {!hint ? (
        <button onClick={get} disabled={busy} className="inline-flex items-center gap-2 text-[13px] font-medium text-jg-700 hover:text-jg-600 disabled:opacity-60">
          <img src="/sensai-mark.png" alt="" className="size-5 rounded-md" /> {busy ? 'Sensai is thinking…' : 'Get a hint from Sensai'}
        </button>
      ) : (
        <div className="flex gap-2.5 rounded-xl border border-jg-500/25 bg-jg-50 p-3 text-[13.5px]">
          <img src="/sensai-mark.png" alt="" className="size-6 shrink-0 rounded-md" />
          <div>
            <RichText text={hint} />
          </div>
        </div>
      )}
    </div>
  )
}

function Runner({ test, mode }: { test: Test; mode: Mode }) {
  const nav = useNavigate()
  // highlights last for this test only (like Bluebook)
  useEffect(() => {
    clearHighlights()
    return clearHighlights
  }, [test.id])
  const timed = mode !== 'practice'
  const minutesFor = (m: number) => test.modules[m]?.minutes ?? (test.type === 'MATH' ? 35 : 32)
  const [mod, setMod] = useState(0)
  const perModule = minutesFor(mod) * 60 * (mode === 'sprint' ? 0.7 : 1)

  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Ans[][]>(() => test.modules.map((m) => m.questions.map(() => ({ value: null, flagged: false, seconds: 0, checked: false, struck: [] }))))
  const [left, setLeft] = useState(Math.round(perModule))
  const [hideTimer, setHideTimer] = useState(false)
  const [eliminate, setEliminate] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [phase, setPhase] = useState<'question' | 'review' | 'break'>('question')
  const [confirmExit, setConfirmExit] = useState(false)
  const [calc, setCalc] = useState(false)
  const [refSheet, setRefSheet] = useState(false)
  const [annotate, setAnnotate] = useState(true)
  const isRW = test.type !== 'MATH'
  const started = useRef(Date.now())
  const qStart = useRef(Date.now())

  const questions = test.modules[mod].questions
  const q = questions[idx]
  const a = answers[mod][idx]

  const patch = useCallback(
    (p: Partial<Ans>, m = mod, i = idx) => setAnswers((all) => all.map((row, mi) => (mi !== m ? row : row.map((x, qi) => (qi !== i ? x : { ...x, ...p }))))),
    [mod, idx],
  )

  // time spent per question
  const commitTime = useCallback(() => {
    const now = Date.now()
    const dt = Math.round((now - qStart.current) / 1000)
    qStart.current = now
    if (phase === 'question') setAnswers((all) => all.map((row, mi) => (mi !== mod ? row : row.map((x, qi) => (qi !== idx ? x : { ...x, seconds: x.seconds + dt })))))
  }, [mod, idx, phase])

  const go = (i: number) => {
    commitTime()
    setIdx(i)
    setNavOpen(false)
    setPhase('question')
  }

  const finish = useCallback(
    (final: Ans[][]) => {
      const flat = test.modules.flatMap((m, mi) =>
        m.questions.map((qq, qi) => {
          const x = final[mi][qi]
          return { module: mi, index: qi, value: x.value, correct: isCorrect(qq, x.value), seconds: x.seconds, flagged: x.flagged }
        }),
      )
      const raw = flat.filter((x) => x.correct).length
      const attempt: Attempt = {
        id: Math.random().toString(36).slice(2, 10),
        testId: test.id,
        testName: test.name,
        type: test.type,
        mode,
        startedAt: started.current,
        finishedAt: Date.now(),
        answers: flat,
        raw,
        total: flat.length,
        scaled: scaleSection(raw, flat.length),
      }
      setStore((s) => ({
        ...s,
        attempts: [...s.attempts, attempt],
        mistakes: [
          ...s.mistakes.filter((m) => !flat.some((f) => f.correct && m.key === `${test.id}:${f.module}:${f.index}`)),
          ...flat
            .filter((f) => !f.correct && !s.mistakes.some((m) => m.key === `${test.id}:${f.module}:${f.index}` && !m.cleared))
            .map((f) => ({ key: `${test.id}:${f.module}:${f.index}`, testId: test.id, module: f.module, index: f.index, addedAt: Date.now(), cleared: false })),
        ],
      }))
      markActive(Math.round((Date.now() - started.current) / 1000), 'test', test.type)
      nav(`/app/results/${attempt.id}`, { replace: true })
    },
    [mode, nav, test],
  )

  const endModule = useCallback(() => {
    commitTime()
    if (mod < test.modules.length - 1) {
      setPhase('break')
    } else {
      setAnswers((final) => {
        queueMicrotask(() => finish(final))
        return final
      })
    }
  }, [commitTime, finish, mod, test.modules.length])

  const startNextModule = () => {
    setMod((m) => m + 1)
    setIdx(0)
    setLeft(Math.round(minutesFor(mod + 1) * 60 * (mode === 'sprint' ? 0.7 : 1)))
    setPhase('question')
    qStart.current = Date.now()
  }

  // timer
  useEffect(() => {
    if (!timed || phase === 'break') return
    const t = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [timed, phase, mod])
  useEffect(() => {
    if (timed && left <= 0 && phase !== 'break') endModule()
  }, [left, timed, phase, endModule])

  // keyboard: arrows to move, A–D to answer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'question' || (e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'ArrowRight' && idx < questions.length - 1) go(idx + 1)
      if (e.key === 'ArrowLeft' && idx > 0) go(idx - 1)
      const k = 'abcd'.indexOf(e.key.toLowerCase())
      if (k >= 0 && q.format === 'mc' && !(mode === 'practice' && a.checked)) patch({ value: String(k) })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // leaving mid-test loses progress
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, '0')
  const ss = String(Math.max(0, left % 60)).padStart(2, '0')
  const answeredCount = answers[mod].filter((x) => x.value != null && x.value !== '').length
  // Math is one column like Bluebook: tables/figures sit above the question.
  const hasPassage = !!q.passage && isRW

  const locked = mode === 'practice' && a.checked
  const sectionLabel = test.type === 'MATH' ? 'Math' : 'Reading and Writing'

  const body = (() => {
    if (phase === 'break')
      return (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-lg px-6 py-20 text-center">
          <motion.img src="/sensai-mark.png" alt="" className="mx-auto size-16 rounded-2xl shadow-lg shadow-jg-500/20" animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
          <h2 className="display mt-6 text-[34px]">Module {mod + 1} done</h2>
          <p className="mt-3 text-[15px] text-moss">
            {mode === 'practice' ? 'Take a breath, then continue to the next module.' : `Module ${mod + 2} starts with a fresh ${Math.round(minutesFor(mod + 1) * (mode === 'sprint' ? 0.7 : 1))}-minute timer. On test day you get a 10-minute break between sections, not between modules — so keep going while you're warm.`}
          </p>
          <button onClick={startNextModule} className="btn btn-dark mt-8 h-12 px-8 text-[15px]">
            Start module {mod + 2}
          </button>
        </motion.div>
      )
    if (phase === 'review')
      return (
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="display text-center text-[32px]">Check your work</h2>
          <p className="mt-2 text-center text-[14px] text-moss">
            {answeredCount} of {questions.length} answered. Click a question to go back to it.
          </p>
          <div className="card mt-8 p-6">
            <div className="flex flex-wrap items-center justify-center gap-5 text-[12px] text-moss">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded border border-dashed border-moss" /> Unanswered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-pine" /> Answered
              </span>
              <span className="flex items-center gap-1.5">
                <Bookmark className="size-3 fill-red-500 text-red-500" /> For review
              </span>
            </div>
            <div className="mt-6 grid grid-cols-6 gap-2 sm:grid-cols-9">
              {answers[mod].map((x, i) => (
                <button key={i} onClick={() => go(i)} className={`relative grid aspect-square place-items-center rounded-lg text-[14px] font-semibold tabular-nums ${x.value != null && x.value !== '' ? 'bg-pine text-cream' : 'border border-dashed border-moss/60 text-pine'}`}>
                  {i + 1}
                  {x.flagged && <Bookmark className="absolute -right-1 -top-1.5 size-4 fill-red-500 text-red-500" />}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={() => setPhase('question')} className="btn btn-ghost h-11 px-6 text-[14px]">
              Back to questions
            </button>
            <button onClick={endModule} className="btn btn-dark h-11 px-6 text-[14px]">
              {mod < test.modules.length - 1 ? `Submit module ${mod + 1}` : 'Submit test'}
            </button>
          </div>
        </div>
      )
    return null
  })()

  return (
    <div className="flex min-h-svh flex-col" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-card">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">
              {test.modules[mod].title ?? `Section ${test.type === 'MATH' ? 2 : 1}, Module ${mod + 1}: ${sectionLabel}`}
            </p>
            <p className="truncate text-[12px] capitalize text-moss">
              {test.name} · {mode} mode
            </p>
          </div>
          <div className="flex flex-col items-center">
            {timed ? (
              <>
                <span className={`font-mono text-[20px] font-semibold tabular-nums ${hideTimer ? 'invisible' : ''} ${left < 300 ? 'animate-pulse text-red-600' : ''}`}>
                  {mm}:{ss}
                </span>
                <button onClick={() => setHideTimer((h) => !h)} className="flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-[11px] text-moss hover:bg-cream">
                  {hideTimer ? <Eye className="size-3" /> : <EyeOff className="size-3" />} {hideTimer ? 'Show' : 'Hide'}
                </button>
              </>
            ) : (
              <span className="rounded-full bg-jg-50 px-3 py-1 text-[12px] font-semibold text-jg-700">Practice · untimed</span>
            )}
          </div>
          <div className="flex justify-end gap-1.5">
            {test.type === 'MATH' && (
              <>
                <button onClick={() => setCalc((v) => !v)} aria-pressed={calc} title="Desmos calculator" className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold ${calc ? 'border-pine bg-pine text-cream' : 'border-line text-moss hover:bg-cream'}`}>
                  <Calculator className="size-4" /> <span className="hidden lg:inline">Calculator</span>
                </button>
                <button onClick={() => setRefSheet((v) => !v)} aria-pressed={refSheet} title="Reference sheet" className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold ${refSheet ? 'border-pine bg-pine text-cream' : 'border-line text-moss hover:bg-cream'}`}>
                  <Sigma className="size-4" /> <span className="hidden lg:inline">Reference</span>
                </button>
              </>
            )}
            {isRW && (
              <button onClick={() => setAnnotate((v) => !v)} aria-pressed={annotate} title="Highlights & notes: select text in the passage" className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold ${annotate ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-line text-moss hover:bg-cream'}`}>
                <Highlighter className="size-4" /> <span className="hidden lg:inline">Highlight</span>
              </button>
            )}
            <button
              onClick={() => setEliminate((v) => !v)}
              aria-pressed={eliminate}
              title="Answer eliminator"
              className={`hidden h-9 items-center rounded-lg border px-2.5 text-[12px] font-semibold line-through sm:flex ${eliminate ? 'border-pine bg-pine text-cream' : 'border-line text-moss hover:bg-cream'}`}
            >
              ABC
            </button>
            <button onClick={() => setConfirmExit(true)} className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] text-moss hover:bg-cream">
              <LogOut className="size-4" /> <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
        {timed && <div className={`h-0.5 transition-[width,background-color] duration-1000 ${left < 300 ? 'bg-red-500' : 'bg-jg-500'}`} style={{ width: `${Math.max(0, (left / perModule) * 100)}%` }} />}
      </header>

      {/* Main */}
      <main className={`flex-1 transition-[padding] ${calc ? 'lg:pl-[27rem]' : ''}`}>
        {body ?? (
          <div className={`mx-auto grid h-full ${hasPassage ? 'max-w-7xl lg:grid-cols-2' : 'max-w-3xl'}`}>
            {hasPassage && (
              <motion.section key={`p-${mod}-${idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="border-b border-line px-5 py-8 sm:px-10 lg:max-h-[calc(100svh-8.5rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
                {isRW ? <Highlightable html={q.passage!} storeKey={`${test.id}:${mod}:${idx}:p`} enabled={annotate} className="prose-q font-serif text-[17px] leading-[1.75] text-pine" /> : <Passage html={q.passage!} />}
              </motion.section>
            )}
            <motion.section key={`${mod}-${idx}`} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="px-5 py-8 sm:px-10 lg:max-h-[calc(100svh-8.5rem)] lg:overflow-y-auto">
              <div className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                <span className="grid size-7 place-items-center rounded-md bg-pine text-[13px] font-semibold text-cream tabular-nums">{idx + 1}</span>
                <button onClick={() => patch({ flagged: !a.flagged })} className={`flex items-center gap-1.5 text-[13px] ${a.flagged ? 'font-semibold text-red-600' : 'text-moss hover:text-pine'}`}>
                  <Bookmark className={`size-4 ${a.flagged ? 'fill-red-500 text-red-500' : ''}`} /> Mark for review
                </button>
              </div>
              {isRW ? <Highlightable text={q.question} storeKey={`${test.id}:${mod}:${idx}:q`} enabled={annotate} className="mt-5 whitespace-pre-wrap text-[16.5px] font-medium leading-relaxed" /> : (
                <>
                  {q.passage && <div className="mt-5 overflow-x-auto"><Passage html={q.passage} /></div>}
                  <QuestionBody q={q} className="mt-5" />
                </>
              )}
              {isRW && annotate && idx === 0 && mod === 0 && <p className="mt-2 text-[11.5px] text-moss">Tip: select any words in the text to highlight, underline or add a note.</p>}

              {q.format === 'mc' ? (
                <div className="mt-6 space-y-2.5">
                  {q.options.map((opt, i) => {
                    const picked = a.value === String(i)
                    const struck = a.struck.includes(i)
                    const showRight = locked && q.correct === i
                    const showWrong = locked && picked && q.correct !== i
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          disabled={locked}
                          onClick={() => patch({ value: String(i), struck: a.struck.filter((s) => s !== i) })}
                          className={`flex flex-1 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[15px] transition ${
                            showRight ? 'border-emerald-500 bg-emerald-50 animate-pop' : showWrong ? 'border-red-400 bg-red-50 animate-shake' : picked ? 'border-pine bg-cream' : 'border-line hover:border-line-strong'
                          } ${struck ? 'opacity-45' : ''}`}
                        >
                          <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold ${picked ? 'border-pine bg-pine text-cream' : 'border-pine/40'}`}>{LETTERS[i]}</span>
                          <span className={`prose-q ${struck ? 'line-through' : ''}`} dangerouslySetInnerHTML={{ __html: tex(opt) }} />
                          {showRight && <Check className="ml-auto size-5 text-emerald-600" />}
                          {showWrong && <X className="ml-auto size-5 text-red-500" />}
                        </button>
                        {eliminate && !locked && (
                          <button
                            onClick={() => patch({ struck: struck ? a.struck.filter((s) => s !== i) : [...a.struck, i], value: picked && !struck ? null : a.value })}
                            aria-label={`${struck ? 'Undo eliminate' : 'Eliminate'} ${LETTERS[i]}`}
                            className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-[11px] font-bold text-moss line-through hover:bg-cream"
                          >
                            {struck ? '↺' : LETTERS[i]}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-6">
                  <label className="text-[13px] text-moss" htmlFor="sa">
                    Your answer (number, fraction like 3/4, or decimal)
                  </label>
                  <input
                    id="sa"
                    disabled={locked}
                    inputMode="decimal"
                    value={a.value ?? ''}
                    onChange={(e) => patch({ value: e.target.value.replace(/[^0-9./-]/g, '').slice(0, 6) })}
                    className="mt-2 block w-48 rounded-xl border-2 border-line px-4 py-3 font-mono text-[20px] focus:border-pine focus:outline-none"
                  />
                  {locked && (
                    <p className={`mt-3 text-[14px] font-semibold ${isCorrect(q, a.value) ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect(q, a.value) ? 'Correct' : `Correct answer: ${q.answer}`}
                    </p>
                  )}
                </div>
              )}

              {mode === 'practice' && (
                <div className="mt-6">
                  {!a.checked ? (
                    <>
                      <button disabled={a.value == null || a.value === ''} onClick={() => patch({ checked: true })} className="btn btn-green h-10 px-5 text-[14px] disabled:opacity-40">
                        Check answer
                      </button>
                      <HintButton q={q} value={a.value} />
                    </>
                  ) : (
                    <HumoExplain testId={test.id} qKey={`${mod}:${idx}`} q={q} math={test.type === 'MATH'} />
                  )}
                </div>
              )}
            </motion.section>
          </div>
        )}
      </main>

      {/* Footer nav */}
      {phase === 'question' && (
        <footer className="sticky bottom-0 z-20 border-t border-line bg-card">
          <div className="relative grid h-16 grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
            <span className="hidden truncate text-[13px] text-moss sm:block">{answeredCount} answered</span>
            <span className="sm:hidden" />
            <button onClick={() => setNavOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg bg-pine px-4 py-2 text-[13px] font-semibold text-cream">
              Question {idx + 1} of {questions.length} <ChevronDown className={`size-4 transition ${navOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex justify-end gap-2">
              <button disabled={idx === 0} onClick={() => go(idx - 1)} className="btn btn-ghost h-10 px-4 text-[13px] disabled:opacity-30">
                <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Back</span>
              </button>
              {idx < questions.length - 1 ? (
                <button onClick={() => go(idx + 1)} className="btn btn-dark h-10 px-5 text-[13px]">
                  Next <ChevronRight className="size-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    commitTime()
                    setPhase('review')
                  }}
                  className="btn btn-dark h-10 px-5 text-[13px]"
                >
                  Review
                </button>
              )}
            </div>

            <AnimatePresence>
              {navOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-[4.5rem] left-1/2 w-[min(92vw,30rem)] -translate-x-1/2 rounded-2xl border border-line bg-card p-5 shadow-2xl"
                >
                  <p className="text-center text-[14px] font-semibold">
                    Module {mod + 1} questions
                  </p>
                  <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-9">
                    {answers[mod].map((x, i) => (
                      <button
                        key={i}
                        onClick={() => go(i)}
                        className={`relative grid aspect-square place-items-center rounded-lg text-[13px] font-semibold tabular-nums ${i === idx ? 'ring-2 ring-jg-500 ring-offset-1' : ''} ${
                          mode === 'practice' && x.checked ? (isCorrect(questions[i], x.value) ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : x.value != null && x.value !== '' ? 'bg-pine text-cream' : 'border border-dashed border-moss/60'
                        }`}
                      >
                        {i + 1}
                        {x.flagged && <Bookmark className="absolute -right-1 -top-1.5 size-3.5 fill-red-500 text-red-500" />}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      commitTime()
                      setNavOpen(false)
                      setPhase('review')
                    }}
                    className="mt-4 w-full rounded-xl border border-line py-2 text-[13px] font-medium hover:bg-cream"
                  >
                    Go to review page
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </footer>
      )}

      {/* Desmos calculator — the same graphing calculator built into Bluebook */}
      {calc && (
        <div className="fixed bottom-20 left-3 top-20 z-30 flex w-[min(94vw,26rem)] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[13px] font-semibold">Desmos calculator</span>
            <button onClick={() => setCalc(false)} aria-label="Close calculator" className="rounded-md p-1 text-moss hover:bg-cream">
              <X className="size-4" />
            </button>
          </div>
          <iframe title="Desmos graphing calculator" src="https://www.desmos.com/calculator" className="flex-1" />
        </div>
      )}
      {refSheet && (
        <div className="fixed right-3 top-20 z-30 w-[min(94vw,24rem)] rounded-2xl border border-line bg-card p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">Reference sheet</span>
            <button onClick={() => setRefSheet(false)} aria-label="Close reference sheet" className="rounded-md p-1 text-moss hover:bg-cream">
              <X className="size-4" />
            </button>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[12.5px]">
            {[
              ['Circle', 'A = πr², C = 2πr'],
              ['Rectangle', 'A = lw'],
              ['Triangle', 'A = ½bh'],
              ['Pythagoras', 'c² = a² + b²'],
              ['30-60-90', 'x, x√3, 2x'],
              ['45-45-90', 's, s, s√2'],
              ['Box', 'V = lwh'],
              ['Cylinder', 'V = πr²h'],
              ['Sphere', 'V = 4⁄3 πr³'],
              ['Cone', 'V = 1⁄3 πr²h'],
              ['Pyramid', 'V = 1⁄3 lwh'],
              ['Circle', '360° = 2π rad'],
            ].map(([k, v], i) => (
              <li key={i} className="rounded-lg bg-cream px-2.5 py-1.5">
                <span className="block font-sans text-[10.5px] text-moss">{k}</span>
                {v}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] text-moss">The sum of the angles in a triangle is 180°.</p>
        </div>
      )}

      {/* Exit confirm */}
      <AnimatePresence>
        {confirmExit && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-pine/50 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div role="alertdialog" className="w-full max-w-sm rounded-3xl bg-card p-6 text-center">
              <h3 className="font-serif text-[24px]">Leave this test?</h3>
              <p className="mt-2 text-[14px] text-moss">You can submit now and see your score for what you answered, or quit without saving.</p>
              <div className="mt-6 grid gap-2">
                <button
                  onClick={() =>
                    setAnswers((final) => {
                      queueMicrotask(() => finish(final))
                      return final
                    })
                  }
                  className="btn btn-dark h-11 text-[14px]"
                >
                  Submit and see results
                </button>
                <button onClick={() => nav('/app/tests')} className="btn h-11 text-[14px] text-red-600 hover:bg-red-50">
                  Quit without saving
                </button>
                <button onClick={() => setConfirmExit(false)} className="btn btn-ghost h-11 text-[14px]">
                  Keep going
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
