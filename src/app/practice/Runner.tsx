import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Calculator, Check, ChevronDown, ChevronLeft, ChevronRight, GraduationCap, Highlighter, MessageCircle, Pause, Play, StickyNote, Timer, X } from 'lucide-react'
import { isCorrect, loadBank, markActive, recordBank, resolveRef, setStore, toggleSaved, toggleSavedBank, useStore, type BankQ, type QRef, type Resolved } from '../store'
import { describeQuestion } from '../screen'
import { studentContext } from '../humoContext'
import { HumoMessages, useHumoChat } from '../components/HumoDrawer'
import { Highlightable } from '../components/Highlightable'
import { clearHighlights } from '../highlights'
import { lessonFor } from '../learn/courses'

const L = ['A', 'B', 'C', 'D']
export type Item = { key: string; ref: QRef; r: Resolved }
type Ans = { value: string | null; checked: boolean; correct: boolean; seconds: number; struck: number[]; before?: boolean }

/* ---------------- building a session from the URL ---------------- */
export function refOf(key: string): QRef {
  if (key.startsWith('bank:')) return { key, testId: 'bank', module: 0, index: 0, bankId: key.slice(5) }
  const [testId, m, i] = key.split(':')
  return { key, testId, module: Number(m), index: Number(i) }
}

export async function buildSession(p: URLSearchParams, st: ReturnType<typeof useStore>): Promise<Item[]> {
  const keys = p.get('keys')
  if (keys) {
    const refs = keys.split(',').filter(Boolean).map(refOf)
    const rs = await Promise.all(refs.map((r) => resolveRef(r)))
    return refs.map((ref, i) => ({ key: ref.key, ref, r: rs[i]! })).filter((x) => x.r)
  }
  const bank = await loadBank()
  const section = p.get('section')
  // topics are joined with "|" because some topic names contain commas ("Form, Structure, and Sense");
  // older links used "," — a whole value that is itself a topic name is kept as one
  const rawSkills = p.get('skills')
  const known = (x: string) => bank.some((b) => b.topic === x || b.skill === x)
  const skills = rawSkills ? (rawSkills.includes('|') || known(rawSkills) ? rawSkills.split('|') : rawSkills.split(',')).map((x) => x.trim()).filter(Boolean) : undefined
  const diffs = p.get('diff')?.split(',').filter(Boolean)
  const status = p.get('status') || 'all'
  const set = p.get('set')
  const savedKeys = new Set(st.saved.map((x) => x.key))
  let list = bank.filter(
    (b) =>
      (!section || b.section === section) &&
      (!skills?.length || skills.includes(b.skill) || (!!b.topic && skills.includes(b.topic))) &&
      (!diffs?.length || diffs.includes(b.difficulty)) &&
      (!set || b.set === set) &&
      (status === 'all' ||
        (status === 'unsolved' && !st.qbank[b.id]) ||
        (status === 'incorrect' && st.qbank[b.id] && !st.qbank[b.id].correct) ||
        (status === 'solved' && st.qbank[b.id]?.correct) ||
        (status === 'saved' && savedKeys.has(`bank:${b.id}`))),
  )
  if (p.get('order') === 'random') list = [...list].sort(() => Math.random() - 0.5)
  const n = Number(p.get('n')) || 0
  if (n) list = list.slice(0, n)
  return list.map((b) => {
    const ref: QRef = { key: `bank:${b.id}`, testId: 'bank', module: 0, index: 0, bankId: b.id }
    return { key: ref.key, ref, r: { q: b, section: b.section, source: b.setName, skill: b.skill, topic: b.topic, difficulty: b.difficulty, bank: b } }
  })
}

/* ---------------- side panel: Ask Sensai ---------------- */
type Tab = 'ask'

function AskTab({ item, a, auto }: { item: Item; a: Ans; auto: string | null }) {
  const s = useStore()
  const screen = describeQuestion(item.r.q, { chosen: a.value, checked: a.checked, correct: a.correct, seconds: a.seconds, where: `Question bank · ${item.r.source}`, skill: item.r.skill })
  const ctx = `${studentContext(s, 'a Question Bank question')}\n\nWHAT THE STUDENT SEES ON SCREEN RIGHT NOW:\n${screen}`
  const { msgs, busy, send, retry } = useHumoChat(a.checked && !a.correct ? "I can see this question and your answer. Want me to show exactly where it went wrong?" : "I can see this question. Ask for a hint, a strategy, or a full walkthrough.", ctx)
  const [text, setText] = useState('')
  const fired = useRef(false)
  useEffect(() => {
    if (auto && !fired.current) {
      fired.current = true
      send(auto)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])
  const chips = a.checked && !a.correct ? ['Why is my answer wrong?', 'What trap did I fall for?', 'Explain step by step'] : item.r.section === 'MATH' ? ['Give me a hint', 'Solve it with Desmos', 'What is the fastest method?'] : ['Give me a hint', 'Highlight the key part of the text', "What's the best strategy for this?"]
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <HumoMessages msgs={msgs} busy={busy} onRetry={retry} />
        {msgs.length === 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button key={c} onClick={() => send(c)} className="rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] hover:border-jg-500">
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
          setText('')
        }}
        className="m-3 flex gap-2 rounded-2xl border border-line bg-card p-1.5 focus-within:border-jg-500"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about this question…" className="min-w-0 flex-1 bg-transparent px-3 text-[14px] focus:outline-none" />
        <button disabled={busy || !text.trim()} className="grid size-9 place-items-center rounded-xl bg-pine text-cream disabled:opacity-40">
          <ChevronRight className="size-4" />
        </button>
      </form>
    </div>
  )
}

function SolutionCard({ b }: { b: BankQ }) {
  const sol = b.solution!
  return (
    <div className="rounded-2xl border border-line bg-card p-4 text-[13.5px]">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#2d70b3]">Type this in Desmos</p>
      <ol className="mt-2 space-y-1">
        {sol.desmos.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-moss">{i + 1}.</span>
            <span className="font-mono text-[12.5px]">{l}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3">
        <b>Look for:</b> {sol.look_for}
      </p>
      <p className="mt-1.5">
        <b>Why:</b> {sol.why}
      </p>
      <p className="mt-1.5">
        <b>Trap:</b> {sol.trap}
      </p>
      <p className="mt-3 rounded-xl bg-jg-50 px-3 py-2 text-jg-700">
        <b>Next time:</b> {sol.rule}
      </p>
    </div>
  )
}




/* ---------------- the session ---------------- */
function Session({ items, rush, back, start, resume = false }: { items: Item[]; rush: boolean; back: string; start?: number; resume?: boolean }) {
  const nav = useNavigate()
  const s = useStore()
  // "All" questions of a skill: questions answered before show the earlier answer (with a Try again button),
  // and the session opens at the first question not answered yet instead of question 1 every time
  const [ans, setAns] = useState<Ans[]>(() =>
    items.map((it) => {
      const pr = resume && it.r.bank ? s.qbank[it.r.bank.id] : undefined
      return pr ? { value: pr.chosen || null, checked: true, correct: pr.correct, seconds: pr.seconds || 0, struck: [], before: true } : { value: null, checked: false, correct: false, seconds: 0, struck: [] }
    }),
  )
  const [i, setI] = useState(() => Math.min(start ?? Math.max(0, ans.findIndex((x) => !x.checked)), items.length - 1))
  const [panel, setPanel] = useState<Tab | null>(null)
  const [auto, setAuto] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  const [hl, setHl] = useState(true)
  const [elim, setElim] = useState(false)
  const [calc, setCalc] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [done, setDone] = useState(false)
  const item = items[i]
  const a = ans[i]
  const q = item.r.q
  const isRW = item.r.section === 'EBRW'
  const limit = rush ? (isRW ? 75 : 95) : 0
  const saved = s.saved.some((x) => x.key === item.key)
  const note = s.notes[item.key] ?? ''

  useEffect(() => {
    if (paused || a.checked || done) return
    const t = setInterval(() => {
      setTick((n) => n + 1)
      setAns((all) => all.map((x, j) => (j === i ? { ...x, seconds: x.seconds + 1 } : x)))
    }, 1000)
    return () => clearInterval(t)
  }, [paused, a.checked, i, done])

  // Rush: time's up → check what's there and move on
  useEffect(() => {
    if (rush && !a.checked && a.seconds >= limit) check(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const patch = (p: Partial<Ans>) => setAns((all) => all.map((x, j) => (j === i ? { ...x, ...p } : x)))

  function check(timeout = false) {
    const ok = !timeout || a.value ? isCorrect(q, a.value) : false
    patch({ checked: true, correct: ok })
    if (item.r.bank) recordBank(item.r.bank, a.value ?? '', ok, a.seconds)
    else {
      markActive(a.seconds, 'mistakes', item.r.section)
      if (ok) setStore((x) => ({ ...x, mistakes: x.mistakes.map((m) => (m.key === item.key ? { ...m, cleared: true } : m)) }))
    }
    if (rush) setTimeout(() => go(i + 1), ok ? 600 : 1400)
  }
  function go(n: number) {
    if (n >= items.length) return setDone(true)
    setI(Math.max(0, n))
    setAuto(null)
    setNavOpen(false)
  }
  function openWhy() {
    setAuto('Why is my answer incorrect? Show me exactly where my thinking went wrong.')
    setPanel('ask')
  }

  const answered = ans.filter((x) => x.checked && !x.before) // this session only
  const right = answered.filter((x) => x.correct).length

  if (done)
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <motion.img initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src="/sensai-mark.png" alt="" className="mx-auto size-20 rounded-3xl" />
        <h1 className="display mt-6 text-[38px]">Session done</h1>
        <p className="mt-2 text-[15px] text-moss">
          {right} of {answered.length} correct · {Math.round(ans.reduce((x, y) => x + y.seconds, 0) / 60)} min
        </p>
        <div className="mt-8 grid grid-cols-10 gap-1.5">
          {ans.map((x, j) => (
            <button key={j} onClick={() => (setDone(false), setI(j))} className={`aspect-square rounded-lg text-[12px] font-semibold ${!x.checked ? 'bg-line text-moss' : x.correct ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'}`}>
              {j + 1}
            </button>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {answered.some((x) => !x.correct) && (
            <button
              onClick={() => {
                const keys = items.filter((_, j) => ans[j].checked && !ans[j].correct && !ans[j].before).map((x) => x.key)
                nav(`/app/practice/run?keys=${keys.join(',')}&back=${encodeURIComponent(back)}`)
              }}
              className="btn btn-dark h-11 px-5 text-[14px]"
            >
              Retry my mistakes
            </button>
          )}
          <Link to={back} className="btn btn-ghost h-11 px-5 text-[14px]">
            Back
          </Link>
        </div>
      </div>
    )

  const timeLeft = limit - a.seconds
  const mm = (n: number) => `${String(Math.floor(Math.max(0, n) / 60)).padStart(2, '0')}:${String(Math.max(0, n) % 60).padStart(2, '0')}`

  return (
    <div className="flex h-svh flex-col bg-card text-pine" onCopy={(e) => e.preventDefault()}>
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-5">
        <Link to={back} aria-label="Back" className="rounded-lg p-1.5 hover:bg-cream">
          <ChevronLeft className="size-5" />
        </Link>
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums ${answered.length ? (right / answered.length >= 0.7 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600') : 'bg-cream text-moss'}`}>{answered.length ? `${Math.round((right / answered.length) * 100)}% · ${right}/${answered.length}` : 'New session'}</span>
        <div className="flex flex-1 items-center justify-center gap-2">
          {rush && <Timer className="size-4 text-orange-500" />}
          <span className={`font-mono text-[15px] font-semibold tabular-nums ${rush && timeLeft <= 10 ? 'animate-pulse text-red-600' : ''}`}>{rush ? mm(timeLeft) : mm(a.seconds)}</span>
          {!rush && (
            <button aria-label={paused ? 'Resume' : 'Pause'} onClick={() => setPaused((p) => !p)} className="grid size-7 place-items-center rounded-full border border-line hover:bg-cream">
              {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
            </button>
          )}
        </div>
        {isRW ? (
          <button onClick={() => setHl((v) => !v)} aria-pressed={hl} title="Highlight & notes" className={`grid size-9 place-items-center rounded-lg border ${hl ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-line text-moss'}`}>
            <Highlighter className="size-4" />
          </button>
        ) : (
          <button onClick={() => setCalc((v) => !v)} aria-pressed={calc} title="Desmos calculator" className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold ${calc ? 'border-[#2d70b3] bg-[#2d70b3] text-white' : 'border-line text-moss'}`}>
            <Calculator className="size-4" /> <span className="hidden sm:inline">Desmos</span>
          </button>
        )}
        <button onClick={() => setElim((v) => !v)} aria-pressed={elim} title="Answer eliminator" className={`hidden h-9 items-center rounded-lg border px-2.5 text-[12px] font-semibold line-through sm:flex ${elim ? 'border-pine bg-pine text-cream' : 'border-line text-moss'}`}>
          ABC
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {calc && (
          <motion.aside initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="hidden w-[26rem] shrink-0 border-r border-line lg:block">
            <iframe title="Desmos graphing calculator" src="https://www.desmos.com/calculator" className="h-full w-full" />
          </motion.aside>
        )}
        <main className={`relative min-w-0 flex-1 overflow-hidden ${paused ? 'blur-md' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div key={item.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.22 }} className={`grid h-full ${q.passage || q.passageImage ? 'lg:grid-cols-2' : ''}`}>
              {(q.passage || q.passageImage) && (
                <section className="overflow-y-auto border-b border-line px-5 py-7 sm:px-9 lg:border-b-0 lg:border-r">
                  {q.passageImage && <img src={q.passageImage} alt="" className="mb-4 max-w-full rounded-xl" />}
                  {q.passage && (isRW ? <Highlightable html={q.passage} storeKey={`${item.key}:p`} enabled={hl} className="prose-q font-serif text-[17px] leading-[1.75]" /> : <div className="prose-q font-serif text-[17px] leading-[1.75]" dangerouslySetInnerHTML={{ __html: q.passage }} />)}
                </section>
              )}
              <section className={`overflow-y-auto px-5 py-7 sm:px-9 ${q.passage || q.passageImage ? '' : 'mx-auto w-full max-w-3xl'}`}>
                <div className="flex items-center gap-2 rounded-xl bg-cream px-2.5 py-2">
                  <span className="grid h-7 min-w-7 place-items-center rounded-md bg-pine px-1.5 text-[13px] font-semibold text-cream tabular-nums">{i + 1}</span>
                  <button onClick={() => (item.r.bank ? toggleSavedBank(item.r.bank.id) : toggleSaved(item.ref.testId, item.ref.module, item.ref.index))} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] ${saved ? 'font-semibold text-red-600' : 'text-moss hover:text-pine'}`}>
                    <Bookmark className={`size-4 ${saved ? 'fill-red-500 text-red-500' : ''}`} /> {saved ? 'Saved' : 'Save'}
                  </button>
                  <button onClick={() => setNoteOpen((v) => !v)} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] ${note ? 'font-semibold text-amber-700' : 'text-moss hover:text-pine'}`}>
                    <StickyNote className="size-4" /> Note
                  </button>
                  <span className="ml-auto hidden text-[11.5px] text-moss sm:inline">
                    {item.r.topic ?? item.r.skill} · <span className={item.r.difficulty === 'Hard' ? 'text-rose-600' : item.r.difficulty === 'Medium' ? 'text-amber-600' : 'text-jg-700'}>{item.r.difficulty}</span>
                  </span>
                </div>
                <AnimatePresence>
                  {noteOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <textarea
                        autoFocus
                        defaultValue={note}
                        onBlur={(e) => setStore((x) => ({ ...x, notes: e.target.value.trim() ? { ...x.notes, [item.key]: e.target.value.trim().slice(0, 600) } : Object.fromEntries(Object.entries(x.notes).filter(([k]) => k !== item.key)) }))}
                        placeholder="Your note for this question (saved to Notes)…"
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[13.5px] focus:outline-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                {q.image && <img src={q.image} alt="" className="mt-5 max-w-full rounded-xl" />}
                {q.question && (isRW ? <Highlightable text={q.question} storeKey={`${item.key}:q`} enabled={hl} className="mt-5 whitespace-pre-wrap text-[16.5px] font-medium leading-relaxed" /> : <p className="mt-5 whitespace-pre-wrap text-[16.5px] font-medium leading-relaxed">{q.question}</p>)}

                {q.format === 'mc' ? (
                  <div className="mt-5 space-y-2.5">
                    {q.options.map((opt, k) => {
                      const picked = a.value === String(k)
                      const struck = a.struck.includes(k)
                      const showRight = a.checked && q.correct === k
                      const showWrong = a.checked && picked && q.correct !== k
                      return (
                        <div key={k} className="flex items-center gap-2">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => !a.checked && patch({ value: String(k), struck: a.struck.filter((x) => x !== k) })}
                            className={`relative flex flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-[15px] transition ${showRight ? 'animate-pop border-emerald-500 bg-emerald-50' : showWrong ? 'animate-shake border-red-400 bg-red-50' : picked ? 'border-[#2d70b3] bg-[#2d70b3]/[0.06]' : 'border-line hover:border-line-strong'} ${struck ? 'opacity-45' : ''}`}
                          >
                            <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold ${picked && !a.checked ? 'border-[#2d70b3] bg-[#2d70b3] text-white' : 'border-pine/40'}`}>{L[k]}</span>
                            <span className={`prose-q flex-1 ${struck ? 'line-through' : ''}`} dangerouslySetInnerHTML={{ __html: opt }} />
                            {picked && !a.checked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  check()
                                }}
                                className="rounded-lg bg-[#2d70b3] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#245d96]"
                              >
                                Check
                              </button>
                            )}
                            {showRight && <Check className="size-5 text-emerald-600" />}
                            {showWrong && <X className="size-5 text-red-500" />}
                          </div>
                          {elim && !a.checked && (
                            <button onClick={() => patch({ struck: struck ? a.struck.filter((x) => x !== k) : [...a.struck, k], value: picked ? null : a.value })} aria-label={`Eliminate ${L[k]}`} className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-[11px] font-bold text-moss line-through hover:bg-cream">
                              {struck ? '↺' : L[k]}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <form
                    className="mt-5 flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (a.value) check()
                    }}
                  >
                    <input disabled={a.checked} inputMode="decimal" value={a.value ?? ''} onChange={(e) => patch({ value: e.target.value.replace(/[^0-9./-]/g, '').slice(0, 6) })} placeholder="Answer" className={`w-44 rounded-xl border-2 px-4 py-3 font-mono text-[18px] focus:outline-none ${a.checked ? (a.correct ? 'border-emerald-500 bg-emerald-50' : 'border-red-400 bg-red-50') : 'border-line focus:border-[#2d70b3]'}`} />
                    {!a.checked && (
                      <button disabled={!a.value} className="h-12 rounded-xl bg-[#2d70b3] px-5 text-[14px] font-semibold text-white disabled:opacity-40">
                        Check
                      </button>
                    )}
                  </form>
                )}

                <AnimatePresence>
                  {a.checked && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-5 flex flex-wrap items-center gap-3 rounded-2xl p-4 ${a.correct ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <span className={`text-[15px] font-semibold ${a.correct ? 'text-emerald-700' : 'text-red-700'}`}>{a.correct ? 'Correct!' : q.format === 'sa' ? `Not quite — the answer is ${q.answer}` : `Not quite — the answer is ${L[q.correct ?? 0]}`}</span>
                      {a.before && <span className="text-[12.5px] text-moss">Answered in an earlier session</span>}
                      <span className="ml-auto flex gap-2">
                        {a.before && (
                          <button onClick={() => patch({ value: null, checked: false, correct: false, seconds: 0, struck: [], before: false })} className="rounded-full bg-card px-3.5 py-1.5 text-[12.5px] font-semibold ring-1 ring-line">
                            Try again
                          </button>
                        )}
                        {!a.correct && (
                          <button onClick={openWhy} className="inline-flex items-center gap-1.5 rounded-full bg-pine px-3.5 py-1.5 text-[12.5px] font-semibold text-cream">
                            <img src="/sensai-mark.png" alt="" className="size-4 rounded" /> Why was I wrong?
                          </button>
                        )}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          </AnimatePresence>
          {paused && (
            <button onClick={() => setPaused(false)} className="absolute inset-0 grid place-items-center bg-white/40">
              <span className="btn btn-dark h-12 px-6 text-[15px]">
                <Play className="size-4" /> Resume
              </span>
            </button>
          )}
        </main>

        {/* Sensai panel */}
        <AnimatePresence>
          {panel && (
            <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }} className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-line bg-cream shadow-[-20px_0_40px_-30px_rgb(27_41_37/.5)] lg:relative">
              <div className="flex items-center gap-1 border-b border-line bg-card px-2 py-2">
                {(
                  [
                    ['ask', 'Ask Sensai', MessageCircle],
                  ] as const
                ).map(([k, l, Icon]) => (
                  <button key={k} onClick={() => setPanel(k)} className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium ${panel === k ? 'text-pine' : 'text-moss hover:text-pine'}`}>
                    {panel === k && <motion.span layoutId="ptab" className="absolute inset-0 rounded-lg bg-cream" />}
                    <Icon className="relative size-3.5" /> <span className="relative">{l}</span>
                  </button>
                ))}
                <button onClick={() => setPanel(null)} aria-label="Close" className="ml-auto rounded-lg p-1.5 text-moss hover:bg-cream">
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {panel === 'ask' && <AskTab key={`${item.key}|${a.checked}`} item={item} a={a} auto={auto} />}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* bottom bar */}
      <footer className="relative flex h-16 shrink-0 items-center gap-2 border-t border-line px-3 sm:px-5">
        <div className="relative">
          <button onClick={() => setNavOpen((v) => !v)} className="flex h-10 items-center gap-1.5 rounded-xl bg-pine px-3.5 text-[13px] font-semibold text-cream">
            {i + 1} of {items.length} <ChevronDown className="size-4" />
          </button>
          <AnimatePresence>
            {navOpen && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-12 left-0 z-30 max-h-80 w-80 overflow-y-auto rounded-2xl border border-line bg-card p-3 shadow-xl">
                <div className="grid grid-cols-8 gap-1.5">
                  {ans.map((x, j) => (
                    <button key={j} onClick={() => go(j)} className={`aspect-square rounded-lg text-[12px] font-semibold tabular-nums ${j === i ? 'ring-2 ring-[#2d70b3]' : ''} ${!x.checked ? 'bg-cream text-pine' : x.correct ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'}`}>
                      {j + 1}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5 overflow-x-auto">
          <button onClick={() => setPanel(panel === 'ask' ? null : 'ask')} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0b1d36] to-[#85082a] px-3.5 text-[13px] font-semibold text-cream">
            <img src="/sensai-mark.png" alt="" className="size-5 rounded-md" /> Ask Sensai
          </button>
          {lessonFor(item.r.skill) && (
            <Link to={lessonFor(item.r.skill)!.to} className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl bg-jg-50 px-3 text-[13px] font-semibold text-jg-700 md:inline-flex">
              <GraduationCap className="size-4" /> Learn
            </Link>
          )}
        </div>
        <button disabled={i === 0} onClick={() => go(i - 1)} className="h-10 rounded-xl border border-line px-3 text-[13px] font-medium disabled:opacity-40">
          <span className="hidden sm:inline">Previous</span>
          <ChevronLeft className="size-4 sm:hidden" />
        </button>
        <button onClick={() => go(i + 1)} className="h-10 rounded-xl bg-pine px-4 text-[13px] font-semibold text-cream">
          {i + 1 >= items.length ? 'Finish' : 'Next'}
        </button>
      </footer>
    </div>
  )
}

export default function Runner() {
  const [p] = useSearchParams()
  const s = useStore()
  const [items, setItems] = useState<Item[] | null>(null)
  const sig = p.toString()
  // highlights belong to this session only: a new set (or leaving) starts clean
  useEffect(() => {
    clearHighlights()
    return clearHighlights
  }, [sig])
  useEffect(() => {
    let alive = true
    setItems(null)
    buildSession(p, s).then((x) => alive && setItems(x))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
  const back = p.get('back') || '/app/practice'
  const rush = p.get('mode') === 'rush'
  const content = useMemo(() => {
    if (!items)
      return (
        <div className="grid h-svh place-items-center bg-card">
          <span className="size-7 animate-spin rounded-full border-2 border-jg-500 border-t-transparent" />
        </div>
      )
    if (!items.length)
      return (
        <div className="grid h-svh place-items-center bg-card p-6 text-center">
          <div>
            <p className="display text-[28px]">No questions match</p>
            <p className="mt-2 text-[14px] text-moss">Try other filters — for example "All" instead of "Unsolved".</p>
            <Link to={back} className="btn btn-dark mt-6 h-11 px-6 text-[14px]">
              Back
            </Link>
          </div>
        </div>
      )
    return <Session key={sig} items={items} rush={rush} back={back} start={p.get('start') ? Number(p.get('start')) || 0 : undefined} resume={!rush && (p.get('status') || 'all') === 'all' && !p.get('set')} />
  }, [items, rush, back, sig])
  return content
}
