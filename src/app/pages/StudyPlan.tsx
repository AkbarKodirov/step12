import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Download, GripVertical, Minus, Pencil, Plus, RotateCcw, Send, Sparkles, Trash2, Undo2, X } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { editPlan, HumoOffline } from '../humo'
import { setStore, today, useStore, type PlanKind, type PlanTask, type WeekPlan } from '../store'
import { applyPlan, DAY_NAMES, downloadIcs, generatePlan, googleCalendarLink, KINDS, planDiff, planMinutes, task } from '../plan'
import { RichText } from '../components/RichText'
import { AdaptivePlan } from '../components/AdaptivePlan'

const iso = (d: Date) => d.toISOString().slice(0, 10)
function mondayOf(d: Date) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(12, 0, 0, 0)
  return x
}

const ADDABLE: PlanKind[] = ['drill-rw', 'drill-math', 'skill', 'vocab', 'desmos', 'mistakes', 'lesson', 'blitz', 'test', 'review', 'custom']
const DEFAULT_TITLE: Record<PlanKind, string> = {
  'drill-rw': 'Reading & Writing drill, 20 questions',
  'drill-math': 'Math drill, 20 questions',
  skill: 'Drill a weak skill',
  vocab: 'Daily 20 words',
  desmos: 'Desmos Lab: one hard question',
  mistakes: 'Fix 10 mistakes',
  lesson: 'One strategy lesson',
  blitz: 'Blitz run for pacing',
  test: 'Full practice test in exam mode',
  review: 'Review my last test with Humo',
  custom: '',
}

function AddTask({ onAdd, weak }: { onAdd: (t: PlanTask) => void; weak: string }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line py-2 text-[12.5px] font-medium text-moss transition hover:border-jg-500 hover:text-jg-700">
        <Plus className="size-3.5" /> Add task
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} className="absolute inset-x-0 top-full z-20 mt-1.5 rounded-2xl border border-line bg-card p-2 shadow-[0_18px_40px_-18px_rgb(27_41_37/.45)]">
            {ADDABLE.filter((k) => k !== 'custom').map((k) => (
              <button
                key={k}
                onClick={() => {
                  onAdd(k === 'skill' ? task('skill', `Drill your weak skill: ${weak}`, KINDS.skill.min, weak) : task(k, DEFAULT_TITLE[k]))
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-cream"
              >
                <span className={`size-2.5 rounded-full ${KINDS[k].color}`} />
                <span className="flex-1">{KINDS[k].label}</span>
                <span className="text-[11px] text-moss">{KINDS[k].min}m</span>
              </button>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!custom.trim()) return
                onAdd(task('custom', custom.trim()))
                setCustom('')
                setOpen(false)
              }}
              className="mt-1 flex gap-1 border-t border-line pt-2"
            >
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Your own task…" className="min-w-0 flex-1 rounded-lg bg-cream px-2.5 py-1.5 text-[12.5px] focus:outline-none" />
              <button className="rounded-lg bg-pine px-2.5 text-[12px] font-semibold text-cream">Add</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AskHumoPlan({ plan }: { plan: WeekPlan }) {
  const { token } = useAuth()
  const s = useStore()
  const [text, setText] = useState('')
  const [st, setSt] = useState<{ busy?: boolean; proposal?: WeekPlan; note?: string; error?: string }>({})
  async function ask(t: string) {
    if (!t.trim()) return
    setSt({ busy: true })
    try {
      const r = await editPlan(plan, s.profile, t, token)
      setSt({ proposal: r.plan, note: r.note })
    } catch (e) {
      setSt({ error: e instanceof HumoOffline ? `Humo is offline: ${e.message}` : (e as Error).message })
    }
  }
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-jg-400/15 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <img src="/brand/humo-mark.svg" alt="" className="size-10 rounded-xl" />
        <div>
          <p className="text-[15px] font-semibold">Ask Humo to change your plan</p>
          <p className="text-[12.5px] text-moss">Say it in your own words — English, O'zbekcha or Русский.</p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(text)
        }}
        className="relative mt-4 flex gap-2 rounded-2xl border border-line bg-card p-1.5 focus-within:border-jg-500"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. I have football on Wednesdays, move that work to Thursday" className="min-w-0 flex-1 bg-transparent px-3 text-[14px] focus:outline-none" />
        <button disabled={st.busy || !text.trim()} className="btn btn-dark h-10 px-4 text-[13px] disabled:opacity-40">
          {st.busy ? <span className="size-4 animate-spin rounded-full border-2 border-cream border-t-transparent" /> : <Send className="size-4" />}
          <span className="hidden sm:inline">Change</span>
        </button>
      </form>
      {!st.proposal && (
        <div className="relative mt-3 flex flex-wrap gap-2">
          {['Make weekends lighter', 'More Math, less vocab', 'Add Desmos Lab twice a week', 'I can only study 45 minutes a day', 'Add a full test every Saturday'].map((t) => (
            <button
              key={t}
              disabled={st.busy}
              onClick={() => {
                setText(t)
                ask(t)
              }}
              className="rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] hover:border-jg-500 disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {st.error && <p className="relative mt-3 text-[13px] text-red-600">{st.error}</p>}
      <AnimatePresence>
        {st.proposal && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative overflow-hidden">
            <div className="mt-4 rounded-2xl bg-jg-50 p-4">
              {st.note && (
                <div className="text-[13.5px] text-pine">
                  <RichText text={st.note} />
                </div>
              )}
              <p className="mt-2 text-[12px] font-semibold text-jg-700">
                {planDiff(plan, st.proposal)} · {Math.round(planMinutes(st.proposal) / 6) / 10} h/week (was {Math.round(planMinutes(plan) / 6) / 10})
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {st.proposal.days.map((d, i) => (
                  <div key={i} className="min-w-0">
                    <p className="text-center text-[10.5px] font-semibold text-moss">{DAY_NAMES[i].slice(0, 3)}</p>
                    <div className="mt-1 space-y-1">
                      {d.length === 0 && <span className="block rounded-md bg-white/70 py-1 text-center text-[9.5px] text-moss">rest</span>}
                      {d.map((t) => (
                        <span key={t.id} title={`${t.title} · ${t.min} min`} className={`block truncate rounded-md px-1 py-0.5 text-[9.5px] font-medium text-white ${KINDS[t.kind].color}`}>
                          {t.min}m
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    applyPlan(st.proposal!)
                    setSt({})
                    setText('')
                  }}
                  className="btn btn-green h-10 flex-1 text-[13.5px]"
                >
                  <Check className="size-4" /> Apply Humo's changes
                </button>
                <button onClick={() => setSt({})} className="btn btn-ghost h-10 px-4 text-[13px]">
                  Discard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function StudyPlan() {
  const s = useStore()
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState(false)
  const [cal, setCal] = useState(false)
  const [undo, setUndo] = useState<WeekPlan | null>(null)
  const weak = s.weakSkills[0] ?? s.profile.focus?.[0] ?? 'Words in context'
  const plan = useMemo(() => s.plan ?? generatePlan(s.profile, s.weakSkills), [s.plan, s.profile, s.weakSkills])

  const start = mondayOf(new Date())
  start.setDate(start.getDate() + offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return { i, date: iso(d), d, tasks: plan.days[i] ?? [] }
  })
  const all = days.flatMap((d) => d.tasks.map((t) => `${d.date}:${t.id}`))
  const done = all.filter((k) => s.planDone[k]).length
  const weeksLeft = s.profile.testDate ? Math.max(0, Math.ceil((new Date(s.profile.testDate).getTime() - Date.now()) / (7 * 86400000))) : null
  const minutes = planMinutes(plan)

  const setDay = (i: number, tasks: PlanTask[]) => applyPlan({ days: plan.days.map((d, j) => (j === i ? tasks : d)) })
  const remove = (i: number, id: string) => {
    setUndo(plan)
    setDay(
      i,
      plan.days[i].filter((t) => t.id !== id),
    )
    setTimeout(() => setUndo((u) => (u === plan ? null : u)), 5000)
  }
  const bump = (i: number, id: string, dm: number) => setDay(
    i,
    plan.days[i].map((t) => (t.id === id ? { ...t, min: Math.max(5, Math.min(180, t.min + dm)) } : t)),
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Study plan</h1>
          <p className="mt-2 text-[15px] text-moss">
            {weeksLeft != null ? `${weeksLeft} week${weeksLeft === 1 ? '' : 's'} until your SAT · ` : ''}
            {Math.round(minutes / 6) / 10} hours a week · target {s.profile.target}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => setEditing((e) => !e)} className={`btn h-10 px-4 text-[13px] ${editing ? 'btn-green' : 'btn-ghost'}`}>
            {editing ? <Check className="size-4" /> : <Pencil className="size-4" />} {editing ? 'Done editing' : 'Edit plan'}
          </motion.button>
          <div className="relative">
            <button onClick={() => setCal((c) => !c)} className="btn btn-ghost h-10 px-4 text-[13px]">
              <CalendarPlus className="size-4" /> Google Calendar
            </button>
            <AnimatePresence>
              {cal && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-line bg-card p-3 shadow-[0_24px_50px_-20px_rgb(27_41_37/.5)]">
                  <p className="px-1 text-[13px] font-semibold">Put your plan in your calendar</p>
                  <p className="px-1 pt-0.5 text-[11.5px] text-moss">Weekly events at {s.profile.studyTime ?? '18:00'} until test day, with a 15-minute reminder.</p>
                  <button onClick={() => downloadIcs(plan, s.profile)} className="mt-3 flex w-full items-center gap-3 rounded-xl bg-pine px-3 py-2.5 text-left text-[13px] text-cream hover:bg-pine-2">
                    <Download className="size-4" />
                    <span className="flex-1">
                      Whole plan (.ics)
                      <span className="block text-[11px] text-cream/60">Google → Settings → Import · Apple / Outlook: open the file</span>
                    </span>
                  </button>
                  <p className="mt-3 px-1 text-[11.5px] font-semibold text-moss">Or add one day at a time</p>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {plan.days.map((d, i) =>
                      d.length ? (
                        <a key={i} href={googleCalendarLink(d, i, s.profile)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-cream">
                          <CalendarDays className="size-3.5 text-[#1a73e8]" /> {DAY_NAMES[i]}
                        </a>
                      ) : null,
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="card flex items-center gap-1 p-1">
            <button aria-label="Previous week" onClick={() => setOffset((o) => o - 1)} className="rounded-xl p-2 hover:bg-cream">
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-1 text-[13px] font-medium tabular-nums">
              {days[0].d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {days[6].d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <button aria-label="Next week" onClick={() => setOffset((o) => o + 1)} className="rounded-xl p-2 hover:bg-cream">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="card flex flex-col justify-center p-5">
          <div className="flex justify-between text-[13px]">
            <span className="font-semibold">{offset === 0 ? 'This week' : offset < 0 ? `${-offset} week${offset === -1 ? '' : 's'} ago` : `In ${offset} week${offset === 1 ? '' : 's'}`}</span>
            <span className="tabular-nums text-moss">
              {done}/{all.length} tasks
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-jg-700 to-jg-400" animate={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-moss">
            {(Object.keys(KINDS) as PlanKind[])
              .filter((k) => plan.days.some((d) => d.some((t) => t.kind === k)))
              .map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${KINDS[k].color}`} /> {KINDS[k].label}
                </span>
              ))}
          </div>
          <div className="mt-4 flex gap-3 text-[12.5px]">
            <button
              onClick={() => {
                setUndo(plan)
                applyPlan(generatePlan(s.profile, s.weakSkills))
              }}
              className="inline-flex items-center gap-1.5 text-moss hover:text-pine"
            >
              <Sparkles className="size-3.5" /> Rebuild from my goals
            </button>
            <button onClick={() => setStore((x) => ({ ...x, onboarded: false }))} className="inline-flex items-center gap-1.5 text-moss hover:text-pine">
              <RotateCcw className="size-3.5" /> Redo setup
            </button>
          </div>
        </div>
        <AskHumoPlan plan={plan} />
      </div>

      <div className="mt-4">
        <AdaptivePlan
          plan={plan}
          weekDates={Array.from({ length: 7 }, (_, i) => {
            const d = mondayOf(new Date())
            d.setDate(d.getDate() + i)
            return iso(d)
          })}
          onApplied={(before) => {
            setUndo(before)
            setTimeout(() => setUndo((u) => (u === before ? null : u)), 5000)
          }}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {days.map(({ i, date, d, tasks }) => {
          const isToday = date === today()
          const allDone = tasks.length > 0 && tasks.every((t) => s.planDone[`${date}:${t.id}`])
          return (
            <motion.section layout key={date} className={`card p-4 transition-shadow ${isToday ? 'ring-2 ring-jg-500' : ''} ${allDone ? 'bg-gradient-to-b from-jg-50 to-card' : ''}`}>
              <p className="flex items-center justify-between text-[13px]">
                <span className="font-semibold">{d.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                <span className={isToday ? 'rounded-full bg-jg-500 px-2 py-0.5 text-[11px] font-semibold text-white' : 'text-moss'}>{isToday ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </p>
              {tasks.length === 0 && !editing && <p className="mt-3 rounded-xl bg-cream px-3 py-4 text-center text-[12.5px] text-moss">Rest day 🌿</p>}
              <Reorder.Group axis="y" values={tasks} onReorder={(next) => editing && setDay(i, next)} className="mt-3 space-y-2">
                <AnimatePresence initial={false}>
                  {tasks.map((t) => {
                    const k = `${date}:${t.id}`
                    const ok = !!s.planDone[k]
                    return (
                      <Reorder.Item key={t.id} value={t} dragListener={editing} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -20, height: 0 }} className={`relative flex items-start gap-2.5 overflow-hidden rounded-xl border bg-card p-2.5 transition-colors duration-300 ${ok && !editing ? 'border-jg-500/30 bg-jg-50/60' : 'border-line'} ${editing ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                        <span className={`absolute inset-y-0 left-0 w-1 ${KINDS[t.kind].color}`} />
                        {editing ? (
                          <GripVertical className="mt-0.5 size-4 shrink-0 text-moss/60" />
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            aria-label={ok ? 'Mark not done' : 'Mark done'}
                            onClick={() => setStore((x) => ({ ...x, planDone: { ...x.planDone, [k]: !ok } }))}
                            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors ${ok ? 'border-jg-500 bg-jg-500 text-white' : 'border-line-strong hover:border-jg-500'}`}
                          >
                            {ok && (
                              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                                <Check className="size-3.5" strokeWidth={3} />
                              </motion.span>
                            )}
                          </motion.button>
                        )}
                        <div className="min-w-0 flex-1">
                          {editing ? (
                            <input
                              defaultValue={t.title}
                              onBlur={(e) => e.target.value.trim() && e.target.value !== t.title && setDay(i, tasks.map((x) => (x.id === t.id ? { ...x, title: e.target.value.trim().slice(0, 90) } : x)))}
                              className="w-full rounded-md bg-cream/60 px-1.5 py-0.5 text-[13px] leading-snug focus:bg-cream focus:outline-none"
                            />
                          ) : (
                            <Link to={KINDS[t.kind].to(t)} className={`block text-[13px] leading-snug hover:text-jg-700 ${ok ? 'text-moss line-through' : ''}`}>
                              {t.title}
                            </Link>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-moss">
                            {editing && (
                              <button aria-label="5 minutes less" onClick={() => bump(i, t.id, -5)} className="grid size-5 place-items-center rounded-md bg-cream hover:bg-soft">
                                <Minus className="size-3" />
                              </button>
                            )}
                            <span className="tabular-nums">{t.min} min</span>
                            {editing && (
                              <button aria-label="5 minutes more" onClick={() => bump(i, t.id, 5)} className="grid size-5 place-items-center rounded-md bg-cream hover:bg-soft">
                                <Plus className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {editing && (
                          <button aria-label="Remove task" onClick={() => remove(i, t.id)} className="rounded-md p-1 text-moss hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </Reorder.Item>
                    )
                  })}
                </AnimatePresence>
              </Reorder.Group>
              {editing && (
                <div className="mt-2">
                  <AddTask weak={weak} onAdd={(t) => setDay(i, [...tasks, t])} />
                </div>
              )}
              {!editing && tasks.length > 0 && (
                <p className="mt-2.5 text-right text-[11px] text-moss">{tasks.reduce((a, t) => a + t.min, 0)} min</p>
              )}
            </motion.section>
          )
        })}
      </div>

      <AnimatePresence>
        {undo && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-pine py-2 pl-5 pr-2 text-[13px] text-cream shadow-xl md:bottom-8">
            Plan changed
            <button
              onClick={() => {
                applyPlan(undo)
                setUndo(null)
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20"
            >
              <Undo2 className="size-3.5" /> Undo
            </button>
            <button aria-label="Dismiss" onClick={() => setUndo(null)} className="rounded-full p-1 text-cream/60 hover:text-cream">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
