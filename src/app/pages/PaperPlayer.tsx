import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Clock, Flag, Image as ImageIcon, X } from 'lucide-react'

type Passage = { from: number; to: number; text: string; textDraft?: string; images: string[] }
type PQ = { n: number; format: 'mc' | 'sa'; stem?: string; options?: string[]; correct?: string; answers?: string[]; image?: string }
type Section = { key: string; name: string; minutes: number; passages: Passage[]; questions: PQ[] }
type Paper = { id: string; title: string; sections: Section[] }

const LETTERS = ['A', 'B', 'C', 'D']
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const toNum = (a: string) => {
  const t = a.trim().replace(/\s+/g, '')
  if (/^-?\d+\/\d+$/.test(t)) {
    const [x, y] = t.split('/').map(Number)
    return y ? x / y : NaN
  }
  return t === '' ? NaN : Number(t)
}
/** Grid-in answers: any accepted form, or the same number (1/2 = 0.5 = .5). */
export const gridCorrect = (given: string, accepted: string[]) => {
  const g = given.trim().replace(/\s+/g, '')
  if (!g) return false
  const gn = toNum(g)
  return accepted.some((a) => a.replace(/\s+/g, '') === g || (!Number.isNaN(gn) && !Number.isNaN(toNum(a)) && Math.abs(gn - toNum(a)) < 1e-9))
}
const isRight = (q: PQ, given: string) => (q.format === 'mc' ? given === q.correct : gridCorrect(given, q.answers ?? []))

type Phase = 'intro' | 'run' | 'between' | 'done'

export default function PaperPlayer() {
  const { id } = useParams()
  const nav = useNavigate()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [timed, setTimed] = useState(true)
  const [si, setSi] = useState(0) // section index
  const [qi, setQi] = useState(0) // question index inside the section
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flags, setFlags] = useState<Set<string>>(new Set())
  const [left, setLeft] = useState(0)
  const [showPage, setShowPage] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    fetch(`/papers/${id}.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<Paper>) : Promise.reject(new Error(`This paper didn't load (error ${r.status}).`))))
      .then((p) => alive && setPaper(p))
      .catch((e) => alive && setError(e instanceof TypeError ? "You're offline, so the paper can't load." : (e as Error).message))
    return () => {
      alive = false
    }
  }, [id])

  const sec = paper?.sections[si]
  const q = sec?.questions[qi]
  const key = (s: number, n: number) => `${paper?.sections[s].key}:${n}`

  useEffect(() => {
    if (phase !== 'run' || !timed) return
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => clearInterval(t)
  }, [phase, timed])
  useEffect(() => {
    if (phase === 'run' && timed && left === 0) endSection()
  }, [left, phase])
  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [qi, si, phase])

  const passage = useMemo(() => sec?.passages.find((p) => q && q.n >= p.from && q.n <= p.to), [sec, q])
  const isMath = sec?.key.startsWith('MATH')
  // typed passage text is shown when it exists and has been verified; otherwise (and on request) the original page
  const typed = !!passage?.text

  function startSection(i: number) {
    setSi(i)
    setQi(0)
    setLeft((paper?.sections[i].minutes ?? 0) * 60)
    setShowPage(false)
    setPhase('run')
  }
  function endSection() {
    setConfirm(false)
    if (!paper) return
    setPhase(si + 1 < paper.sections.length ? 'between' : 'done')
  }
  const answered = (s: number, n: number) => !!answers[key(s, n)]?.trim()

  if (error)
    return (
      <Center>
        <p className="text-moss">{error}</p>
        <Link to="/app/papers" className="btn btn-ghost mt-4 h-11 px-6">
          Back to papers
        </Link>
      </Center>
    )
  if (!paper || !sec)
    return (
      <Center>
        <div className="skeleton h-10 w-48" />
      </Center>
    )

  if (phase === 'intro' || phase === 'between') {
    const next = phase === 'intro' ? 0 : si + 1
    const s = paper.sections[next]
    return (
      <Center>
        <div className="card w-full max-w-lg p-6 text-left sm:p-8">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-moss">{paper.title}</p>
          <h1 className="font-serif mt-1 text-[26px] leading-tight">{phase === 'intro' ? 'Paper SAT, section by section' : `Next: ${s.name}`}</h1>
          <ul className="mt-4 space-y-1.5 text-[14px] text-moss">
            {paper.sections.map((x, i) => (
              <li key={x.key} className={`flex justify-between ${i === next ? 'font-semibold text-pine' : ''}`}>
                <span>
                  {i + 1}. {x.name}
                </span>
                <span>
                  {x.questions.length} questions · {x.minutes} min
                </span>
              </li>
            ))}
          </ul>
          {phase === 'intro' && (
            <label className="mt-5 flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
              Timed like the real paper (each section ends when its time is up)
            </label>
          )}
          {s.key.startsWith('MATH') && <p className="mt-4 rounded-xl bg-cream p-3 text-[13px] text-moss">Math questions are shown as the original printed question. Choose A–D, or type the answer for grid-in questions (fractions like 3/4 and decimals like 0.75 both work).</p>}
          <div className="mt-6 flex gap-2">
            <Link to="/app/papers" className="btn btn-ghost h-11 flex-1 text-[14px]">
              Leave
            </Link>
            <button onClick={() => startSection(next)} className="btn btn-dark h-11 flex-1 text-[14px]">
              Start {s.name}
            </button>
          </div>
        </div>
      </Center>
    )
  }

  if (phase === 'done') return <ResultView paper={paper} answers={answers} onExit={() => nav('/app/papers')} />

  if (!q) return null
  const k = key(si, q.n)
  const given = answers[k] ?? ''
  const set = (v: string) => setAnswers((a) => ({ ...a, [k]: v }))

  return (
    <div className="flex h-svh flex-col bg-cream">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-card px-3 sm:px-5">
        <button onClick={() => setConfirm(true)} className="grid size-8 place-items-center rounded-lg text-moss hover:bg-soft" aria-label="Leave the section">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{sec.name}</p>
          <p className="truncate text-[11px] text-moss">
            Question {qi + 1} of {sec.questions.length}
          </p>
        </div>
        <span className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium tabular-nums ${timed && left <= 300 ? 'bg-red-50 text-red-700' : 'bg-soft text-pine'}`}>
          <Clock size={14} />
          {timed ? fmt(left) : 'Untimed'}
        </span>
        <button onClick={() => setConfirm(true)} className="btn btn-dark h-8 px-4 text-[13px]">
          Finish section
        </button>
      </header>

      <div ref={body} className="min-h-0 flex-1 overflow-y-auto">
        <div className={`mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-5 ${passage && !isMath ? 'md:grid-cols-2' : 'max-w-2xl'}`}>
          {passage && !isMath && (
            <section className="card p-4 md:max-h-[calc(100svh-9rem)] md:overflow-y-auto">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-moss">
                  Questions {passage.from}–{passage.to}
                </p>
                {typed && passage.images.length > 0 && (
                  <button onClick={() => setShowPage((v) => !v)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-jg-700">
                    <ImageIcon size={13} /> {showPage ? 'Show typed text' : 'Show original page'}
                  </button>
                )}
              </div>
              {typed && !showPage ? (
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{passage.text}</p>
              ) : (
                <div className="space-y-3">
                  {passage.images.map((src) => (
                    <img key={src} src={src} alt="The printed passage, with its figures and tables" className="w-full rounded-lg border border-line bg-white" loading="lazy" />
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="num grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-[15px] text-card">{q.n}</span>
              <div className="min-w-0 flex-1">
                {isMath && q.image && <img src={q.image} alt={`Question ${q.n}`} className="w-full max-w-xl rounded-lg border border-line bg-white" />}
                {!isMath && q.stem && <p className="pt-0.5 text-[16px] leading-relaxed font-medium">{q.stem}</p>}
                {!isMath && !q.stem && <p className="pt-0.5 text-[14px] text-moss">Choose the best answer for the underlined part of the passage.</p>}
              </div>
              <button
                onClick={() =>
                  setFlags((f) => {
                    const n = new Set(f)
                    n.has(k) ? n.delete(k) : n.add(k)
                    return n
                  })
                }
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${flags.has(k) ? 'text-amber-600' : 'text-moss hover:bg-soft'}`}
                aria-label="Flag for review"
              >
                <Flag size={16} fill={flags.has(k) ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="mt-4">
              {q.format === 'mc' ? (
                <div className={isMath ? 'flex gap-2' : 'grid gap-2'}>
                  {LETTERS.map((L, i) => (
                    <button
                      key={L}
                      onClick={() => set(given === L ? '' : L)}
                      aria-pressed={given === L}
                      className={`flex items-center gap-3 rounded-xl border text-left transition ${isMath ? 'h-12 flex-1 justify-center font-semibold' : 'min-h-12 px-4 py-2.5'} ${given === L ? 'border-jg-600 bg-jg-50' : 'border-line bg-card hover:border-line-strong'}`}
                    >
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full border text-[12px] font-bold ${given === L ? 'border-jg-600 bg-jg-600 text-white' : 'border-line text-moss'}`}>{L}</span>
                      {!isMath && <span className="flex-1 text-[15px]">{q.options?.[i]}</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <label className="block max-w-xs">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-moss">Your answer</span>
                  <input
                    value={given}
                    onChange={(e) => set(e.target.value)}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="e.g. 3/4 or 0.75"
                    className="mt-1 h-12 w-full rounded-xl border border-line bg-card px-4 text-[16px] focus:border-jg-600 focus:outline-none"
                  />
                </label>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="flex h-14 shrink-0 items-center gap-2 border-t border-line bg-card px-2 pb-[env(safe-area-inset-bottom)] sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
          {sec.questions.map((x, i) => (
            <button
              key={x.n}
              onClick={() => setQi(i)}
              className={`relative grid size-8 shrink-0 place-items-center rounded-lg border text-[12px] font-medium ${i === qi ? 'border-jg-600 bg-jg-50 text-jg-700' : answered(si, x.n) ? 'border-ink bg-ink text-card' : 'border-line bg-card text-moss'}`}
            >
              {x.n}
              {flags.has(key(si, x.n)) && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-500" />}
            </button>
          ))}
        </div>
        <button onClick={() => setQi((i) => Math.max(0, i - 1))} disabled={qi === 0} className="btn btn-ghost size-9 disabled:opacity-30" aria-label="Previous question">
          <ArrowLeft size={16} />
        </button>
        <button onClick={() => setQi((i) => Math.min(sec.questions.length - 1, i + 1))} disabled={qi === sec.questions.length - 1} className="btn btn-dark size-9 disabled:opacity-30" aria-label="Next question">
          <ArrowRight size={16} />
        </button>
      </footer>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="font-serif text-[20px]">Finish {sec.name}?</h2>
            <p className="mt-2 text-[14px] text-moss">
              {sec.questions.filter((x) => !answered(si, x.n)).length} unanswered. You cannot come back to this section.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirm(false)} className="btn btn-ghost h-10 flex-1 text-[14px]">
                Keep working
              </button>
              <button onClick={endSection} className="btn btn-dark h-10 flex-1 text-[14px]">
                Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultView({ paper, answers, onExit }: { paper: Paper; answers: Record<string, string>; onExit: () => void }) {
  const rows = paper.sections.map((s) => {
    const marks = s.questions.map((q) => isRight(q, answers[`${s.key}:${q.n}`] ?? ''))
    return { s, marks, raw: marks.filter(Boolean).length }
  })
  const raw = rows.reduce((a, r) => a + r.raw, 0)
  const total = rows.reduce((a, r) => a + r.s.questions.length, 0)
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="min-h-svh bg-cream">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="card p-6 text-center sm:p-10">
          <p className="text-[13px] font-medium text-moss">{paper.title}</p>
          <p className="num mt-1 text-[64px] font-bold leading-none sm:text-[80px]">
            {raw}
            <span className="text-[28px] text-moss">/{total}</span>
          </p>
          <p className="mt-2 text-[14px] text-moss">Raw score. Official score conversion tables differ for every paper, so this page shows correct answers per section instead of an estimated 400–1600.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.s.key} className="rounded-xl bg-soft p-3 text-left">
                <p className="text-[12px] text-moss">{r.s.name}</p>
                <p className="num text-[20px] font-semibold">
                  {r.raw}/{r.s.questions.length}
                </p>
              </div>
            ))}
          </div>
          <button onClick={onExit} className="btn btn-dark mt-6 h-11 px-6 text-[14px]">
            Back to papers
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <div key={r.s.key} className="card p-4">
              <button onClick={() => setOpen(open === r.s.key ? null : r.s.key)} className="flex w-full items-center justify-between text-left">
                <span className="text-[15px] font-semibold">{r.s.name}</span>
                <span className="text-[13px] text-moss">{open === r.s.key ? 'Hide review' : 'Review answers'}</span>
              </button>
              {open === r.s.key && (
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {r.s.questions.map((q, i) => {
                    const g = answers[`${r.s.key}:${q.n}`] ?? ''
                    const right = r.marks[i]
                    return (
                      <li key={q.n} className="flex items-center gap-2 text-[13px]">
                        <span className={`grid size-5 shrink-0 place-items-center rounded ${right ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>{right ? <Check size={12} /> : <X size={12} />}</span>
                        <span className="num w-6 text-moss">{q.n}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {g || '—'}
                          {!right && <span className="text-moss"> · correct: <b className="text-pine">{q.format === 'mc' ? q.correct : q.answers?.[0]}</b></span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-svh place-items-center bg-cream p-4 text-center">{children}</div>
}
