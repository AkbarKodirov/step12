import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bookmark, BookmarkPlus, Check, ChevronDown, Clock, MessageCircle, RotateCcw, Sparkles, Target, X } from 'lucide-react'
import { isCorrect, loadTest, setStore, skillBreakdown, stripHtml, toggleSaved, useAsync, useStore, type Attempt, type Test } from '../store'
import { SkillBars } from '../components/SkillBars'
import { Confetti, CountUp, ScoreRing } from '../../components/motion'
import { HumoExplain } from '../components/HumoExplain'
import { HumoDrawer } from '../components/HumoDrawer'
import { Passage, QuestionBody } from './TakeTest'

const L = ['A', 'B', 'C', 'D']

function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return { ref, seen }
}

function ReviewItem({ test, attempt, m, i, n, onAsk }: { test: Test; attempt: Attempt; m: number; i: number; n: number; onAsk: (prefill: string) => void }) {
  const q = test.modules[m].questions[i]
  const a = attempt.answers.find((x) => x.module === m && x.index === i)!
  const ok = isCorrect(q, a.value)
  const blank = a.value == null || a.value === ''
  const { ref, seen } = useInView<HTMLElement>()
  const [showPassage, setShowPassage] = useState(!ok)
  const [analyze, setAnalyze] = useState(false)
  const isSaved = useStore().saved.some((x) => x.key === `${test.id}:${m}:${i}`)

  return (
    <article ref={ref} id={`q-${m}-${i}`} className="card scroll-mt-24 overflow-hidden">
      <div className={`flex items-center justify-between gap-3 border-b px-5 py-3 ${ok ? 'border-emerald-100 bg-emerald-50/60' : blank ? 'border-line bg-cream' : 'border-red-100 bg-red-50/60'}`}>
        <span className="flex items-center gap-2.5">
          <span className={`grid size-7 place-items-center rounded-full text-[12px] font-bold text-white ${ok ? 'bg-emerald-500' : blank ? 'bg-moss' : 'bg-red-500'}`}>{ok ? <Check className="size-4" /> : blank ? '–' : <X className="size-4" />}</span>
          <span className="text-[14px] font-semibold">
            Question {n}
            <span className="ml-2 font-normal text-moss">Module {m + 1}</span>
          </span>
          {a.flagged && <Bookmark className="size-4 fill-red-500 text-red-500" />}
        </span>
        <span className="flex items-center gap-3 text-[12px] text-moss tabular-nums">
          <button onClick={() => toggleSaved(test.id, m, i)} className={`flex items-center gap-1 rounded-full px-2 py-1 font-medium ${isSaved ? 'bg-pine text-cream' : 'hover:bg-card'}`}>
            <BookmarkPlus className="size-3.5" /> {isSaved ? 'Saved' : 'Save'}
          </button>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {a.seconds}s
          </span>
        </span>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* Humo analyses a question only when the student asks */}
        {analyze ? (
          <HumoExplain testId={test.id} qKey={`${m}:${i}`} q={q} math={test.type === 'MATH'} onAsk={() => onAsk(`About question ${n}: `)} />
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-jg-500/20 bg-gradient-to-r from-jg-50 to-card p-3">
            <img src="/brand/humo-mark.svg" alt="" className="size-9 rounded-xl" />
            <p className="min-w-0 flex-1 text-[13px] text-moss">{ok ? 'Got it right — want the fastest method anyway?' : blank ? 'Skipped — see how to solve it.' : 'Humo can show exactly where this one went wrong.'}</p>
            <button onClick={() => setAnalyze(true)} className="inline-flex items-center gap-1.5 rounded-full bg-pine px-4 py-2 text-[13px] font-semibold text-cream hover:bg-pine-2">
              <Sparkles className="size-4 text-jg-300" /> Analyze with Humo
            </button>

          </div>
        )}

        {q.passage && (
          <div>
            <button onClick={() => setShowPassage((v) => !v)} className="flex items-center gap-1 text-[13px] font-medium text-moss hover:text-pine">
              <ChevronDown className={`size-4 transition ${showPassage ? 'rotate-180' : ''}`} /> {showPassage ? 'Hide text' : 'Show text'}
            </button>
            {showPassage && (
              <div className="mt-3 rounded-2xl bg-cream p-4 sm:p-5">
                <Passage html={q.passage} />
              </div>
            )}
          </div>
        )}

        <QuestionBody q={q} />

        {q.format === 'mc' ? (
          <div className="grid gap-2">
            {q.options.map((opt, oi) => {
              const right = q.correct === oi
              const mine = a.value === String(oi)
              return (
                <div key={oi} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-[14.5px] ${right ? 'border-emerald-500 bg-emerald-50' : mine ? 'border-red-400 bg-red-50' : 'border-line'}`}>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${right ? 'bg-emerald-500 text-white' : mine ? 'bg-red-500 text-white' : 'border border-pine/30'}`}>{L[oi]}</span>
                  <span className="prose-q math-q flex-1" dangerouslySetInnerHTML={{ __html: opt }} />
                  {mine && <span className="text-[11px] font-semibold text-moss">Your answer</span>}
                  {right && !mine && <span className="text-[11px] font-semibold text-emerald-700">Correct</span>}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 text-[14px]">
            <span className={`rounded-xl px-4 py-2 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>Your answer: {blank ? '—' : a.value}</span>
            {!ok && <span className="rounded-xl bg-emerald-50 px-4 py-2 text-emerald-700">Correct: {q.answer}</span>}
          </div>
        )}
      </div>
    </article>
  )
}

export default function Results() {
  const { attemptId } = useParams()
  const s = useStore()
  const attempt = s.attempts.find((a) => a.id === attemptId)
  const { data: test } = useAsync(() => (attempt ? loadTest(attempt.testId) : Promise.reject(new Error('none'))), [attempt?.testId])
  const [filter, setFilter] = useState<'all' | 'wrong' | 'flagged' | 'right'>('wrong')
  const [chat, setChat] = useState<{ open: boolean; prefill?: string }>({ open: false })

  const skills = useMemo(() => (attempt && test ? skillBreakdown(attempt.answers.map((a) => ({ q: test.modules[a.module].questions[a.index], type: attempt.type, correct: a.correct }))) : []), [attempt, test])
  useEffect(() => {
    const weak = skills.filter((x) => x.total >= 2 && x.right / x.total < 0.8).map((x) => x.skill).slice(0, 2)
    if (weak.length) setStore((st) => ({ ...st, weakSkills: weak }))
  }, [skills])
  const context = useMemo(() => {
    if (!attempt || !test) return ''
    const wrong = attempt.answers
      .map((a, n) => ({ a, n: n + 1 }))
      .filter(({ a }) => !a.correct)
      .slice(0, 30)
      .map(({ a, n }) => {
        const q = test.modules[a.module].questions[a.index]
        const chosen = a.value == null || a.value === '' ? 'blank' : q.format === 'mc' ? L[Number(a.value)] : a.value
        const correct = q.format === 'mc' ? L[q.correct ?? 0] : q.answer
        return `Q${n} (module ${a.module + 1}): ${stripHtml(q.passage).slice(0, 350)} | ${q.question.slice(0, 200)} | choices: ${q.options.map((o, i) => `${L[i]}) ${stripHtml(o)}`).join('; ')} | student: ${chosen} | correct: ${correct}`
      })
      .join('\n')
    const sk = skills.map((x) => `${x.skill} ${x.right}/${x.total}`).join(', ')
    return `Skill results: ${sk}. The student just finished "${attempt.testName}" (${attempt.type === 'MATH' ? 'SAT Math' : 'SAT Reading & Writing'}) in ${attempt.mode} mode. Raw score ${attempt.raw}/${attempt.total}, estimated section score ${attempt.scaled}. Questions they missed or left blank:\n${wrong || 'none'}`
  }, [attempt, test, skills])

  if (!attempt)
    return (
      <div className="card p-10 text-center">
        <p className="text-[15px]">This result isn't saved on this device.</p>
        <Link to="/app/results" className="btn btn-dark mt-5 h-11 px-6 text-[14px]">
          See my results
        </Link>
      </div>
    )

  const acc = Math.round((attempt.raw / attempt.total) * 100)
  const secs = attempt.answers.reduce((x, a) => x + a.seconds, 0)
  const wrongN = attempt.answers.filter((a) => !a.correct).length
  const flaggedN = attempt.answers.filter((a) => a.flagged).length
  const slowLimit = attempt.type === 'MATH' ? 150 : 120
  const slowN = attempt.answers.filter((a) => a.seconds > slowLimit).length
  const items = attempt.answers.map((a, n) => ({ a, n: n + 1 })).filter(({ a }) => (filter === 'all' ? true : filter === 'wrong' ? !a.correct : filter === 'flagged' ? a.flagged : a.correct))

  return (
    <div>
      {/* Score header */}
      <section className="relative overflow-hidden rounded-[28px] bg-pine p-7 text-cream sm:p-9">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-jg-500/20 blur-3xl" />
        <Confetti fire={acc >= 70 && Date.now() - attempt.finishedAt < 15000} />
        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <ScoreRing value={attempt.scaled - 200} max={600}>
              <div className="text-center">
                <CountUp to={attempt.scaled} className="display block text-[44px] leading-none" />
                <span className="mt-1 block text-[11px] text-cream/55">of 800</span>
              </div>
            </ScoreRing>
            <div>
              <p className="text-[13px] capitalize text-cream/55">
                {attempt.testName} · {attempt.mode} mode
              </p>
              <p className="display mt-2 text-[30px] leading-tight">{acc >= 85 ? 'Outstanding.' : acc >= 70 ? 'Strong work.' : acc >= 50 ? 'Solid base to build on.' : "Let's turn this around."}</p>
              <p className="mt-1 text-[13px] text-cream/55">Estimated section score</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            {(
              [
                [attempt.raw, (n: number) => `${Math.round(n)}/${attempt.total}`, 'correct'],
                [acc, (n: number) => `${Math.round(n)}%`, 'accuracy'],
                [Math.round(secs / attempt.total), (n: number) => `${Math.round(n)}s`, 'per question'],
              ] as const
            ).map(([v, f, l]) => (
              <div key={l}>
                <CountUp to={v} format={f} className="font-serif text-[26px]" />
                <p className="text-[12px] text-cream/50">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-7 flex flex-wrap gap-2.5">
          <button onClick={() => setChat({ open: true })} className="btn btn-green h-11 px-5 text-[14px]">
            <img src="/brand/humo-mark.svg" alt="" className="size-6 rounded-md" /> Talk it through with Humo
          </button>
          {wrongN > 0 && (
            <Link to="/app/mistakes" className="btn h-11 border border-white/15 px-5 text-[14px] text-cream hover:bg-white/[0.06]">
              Retry my {wrongN} mistakes
            </Link>
          )}
          <Link to="/app/tests" className="btn h-11 border border-white/15 px-5 text-[14px] text-cream hover:bg-white/[0.06]">
            <RotateCcw className="size-4" /> Another test
          </Link>
        </div>
      </section>

      {/* Skills + answer map */}
      {skills.length > 0 && (
        <section className="card mt-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <Target className="size-4 text-jg-600" /> Skills, weakest first
            </p>
            <p className="text-[12px] text-moss">Fix the red ones first — that's where your next points are.</p>
          </div>
          <div className="mt-4 ">
            <SkillBars stats={skills} />
          </div>
        </section>
      )}
      <section className="card mt-5 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          <Target className="size-4 text-jg-600" /> Answer map
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {attempt.answers.map((a, n) => (
            <a
              key={n}
              href={`#q-${a.module}-${a.index}`}
              onClick={() => setFilter('all')}
              title={a.seconds > slowLimit ? `${a.seconds}s — slow` : `${a.seconds}s`}
              className={`relative grid size-8 place-items-center rounded-lg text-[11.5px] font-semibold tabular-nums ${a.correct ? 'bg-emerald-500 text-white' : a.value == null || a.value === '' ? 'bg-soft text-moss' : 'bg-red-500 text-white'}`}
            >
              {n + 1}
              {a.seconds > slowLimit && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-orange-500 ring-2 ring-white" />}
            </a>
          ))}
        </div>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-moss">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500" /> Correct</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-500" /> Wrong</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-soft" /> Blank</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-orange-500" /> Over {slowLimit / 60} min{slowN ? ` (${slowN})` : ''}</span>
        </p>
      </section>

      {/* Review */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-[28px]">Review</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['wrong', `Wrong & blank (${wrongN})`],
              ['flagged', `Flagged (${flaggedN})`],
              ['right', `Correct (${attempt.raw})`],
              ['all', 'All'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${filter === k ? 'bg-pine text-cream' : 'bg-card ring-1 ring-line'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {!test ? (
          <div className="skeleton h-40 rounded-[24px]" />
        ) : items.length === 0 ? (
          <div className="card p-10 text-center text-[14px] text-moss">Nothing here.</div>
        ) : (
          items.map(({ a, n }) => <ReviewItem key={n} test={test} attempt={attempt} m={a.module} i={a.index} n={n} onAsk={(p) => setChat({ open: true, prefill: p })} />)
        )}
      </div>

      {/* Floating Humo button */}
      <button
        onClick={() => setChat({ open: true })}
        className="fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full bg-pine py-2 pl-2 pr-4 text-[14px] font-semibold text-cream shadow-xl shadow-pine/30 transition hover:scale-[1.03] md:bottom-8"
        aria-label="Chat with Humo about this test"
      >
        <img src="/brand/humo-mark.svg" alt="" className="size-9 rounded-full ring-2 ring-jg-500" />
        Ask Humo
        <MessageCircle className="size-4 opacity-70" />
      </button>

      <HumoDrawer
        open={chat.open}
        prefill={chat.prefill}
        subtitle="Knows your answers on this test"
        onClose={() => setChat({ open: false })}
        context={context}
        greeting={`I've looked at your ${attempt.testName}. You got ${attempt.raw} of ${attempt.total}${wrongN ? ` — ${wrongN} to learn from` : '. Perfect!'}. What do you want to go through first?`}
        suggestions={['What should I study first?', 'Explain my hardest mistake', 'Was it a timing problem?', 'Make me a 1-week plan from this test']}
      />
    </div>
  )
}
