import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Globe2, GraduationCap, Rocket, Sparkles, Trophy } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { setStore, SKILLS, useStore, type Profile } from './store'
import { DAY_NAMES, generatePlan, KINDS, planMinutes } from './plan'
import { exciteHumo } from '../three/humoMood'
import { hello } from './greetings'
import { HumoLogo } from '../brand/HumoLogo'

const HumoScene = lazy(() => import('../three/HumoScene'))

// College Board dates (US + international), Oct 2026 – Aug 2027
const SAT_DATES = [
  ['2026-11-07', 'Nov 7, 2026'],
  ['2026-12-05', 'Dec 5, 2026'],
  ['2027-03-06', 'Mar 6, 2027'],
  ['2027-05-01', 'May 1, 2027'],
  ['2027-06-05', 'Jun 5, 2027'],
  ['2027-08-28', 'Aug 28, 2027'],
].filter(([d]) => d > new Date().toISOString().slice(0, 10))

const AIMS = [
  { id: 'Top US university', icon: Trophy, sub: 'Ivy League, MIT, Stanford · 1500+', target: 1520 },
  { id: 'Scholarship abroad', icon: Globe2, sub: 'US, UK, Korea, Europe · 1400+', target: 1430 },
  { id: 'University in Uzbekistan', icon: GraduationCap, sub: 'Westminster, INHA, Webster…', target: 1250 },
  { id: 'Just exploring', icon: Rocket, sub: 'See where I stand first', target: 1300 },
]
const LEVELS = [
  { id: 'new' as const, title: "I haven't taken a practice test yet", sub: "Humo will start you with a diagnostic" },
  { id: 'some' as const, title: "I've done some practice tests", sub: 'Tell Humo your latest score' },
  { id: 'retake' as const, title: "I've taken the real SAT", sub: 'Retaking to raise my score' },
]
const STEPS = ['Hello', 'Aim', 'Date', 'Level', 'Focus', 'Schedule', 'Plan']

const slide = {
  enter: (d: number) => ({ x: d * 60, opacity: 0, filter: 'blur(6px)' }),
  center: { x: 0, opacity: 1, filter: 'blur(0px)' },
  exit: (d: number) => ({ x: d * -60, opacity: 0, filter: 'blur(6px)' }),
}

function Choice({ on, onClick, children, className = '' }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative rounded-2xl border p-4 text-left transition-colors ${on ? 'border-jg-400 bg-jg-500/15 shadow-[0_0_0_4px_rgb(98_185_104/.12)]' : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'} ${className}`}
    >
      {children}
      <AnimatePresence>
        {on && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-jg-400 text-white">
            <Check className="size-3.5" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

const BUILD = ['Measuring the gap to your target', 'Ranking your weak skills', 'Spacing full tests before test day', 'Adding Desmos Lab for hard Math', 'Balancing vocabulary and review', 'Fitting it into your week']

export default function Onboarding() {
  const { user } = useAuth()
  const s = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [p, setP] = useState<Profile>({ ...s.profile, studyDays: s.profile.studyDays ?? [0, 1, 2, 3, 4, 5], minutesPerDay: s.profile.minutesPerDay ?? 60, studyTime: s.profile.studyTime ?? '18:00', focus: s.profile.focus ?? [] })
  const [built, setBuilt] = useState(0)
  const first = user?.name?.split(' ')[0] ?? 'there'
  const [hi] = useState(() => hello(first))
  const up = (x: Partial<Profile>) => setP((o) => ({ ...o, ...x }))
  const go = (d: number) => {
    setDir(d)
    setStep((x) => Math.max(0, Math.min(STEPS.length - 1, x + d)))
  }
  const plan = generatePlan(p, [])

  useEffect(() => {
    if (step !== 6) return
    exciteHumo(true)
    setBuilt(0)
    const t = setInterval(() => setBuilt((b) => (b >= BUILD.length ? b : b + 1)), 520)
    return () => {
      clearInterval(t)
      exciteHumo(false)
    }
  }, [step])

  const canNext = [true, !!p.aim, true, !!p.level, true, (p.studyDays?.length ?? 0) > 0, true][step]
  const weeks = p.testDate ? Math.max(1, Math.ceil((new Date(p.testDate).getTime() - Date.now()) / (7 * 86400000))) : null
  const gap = p.current ? Math.max(0, p.target - p.current) : null

  function finish(to: string) {
    setStore((x) => ({ ...x, profile: { ...x.profile, ...p }, plan, onboarded: true, weakSkills: x.weakSkills.length ? x.weakSkills : (p.focus ?? []) }))
    nav(to)
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink text-cream">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-20 size-[520px] rounded-full bg-jg-500/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 size-[420px] rounded-full bg-amber-400/10 blur-[120px]" />
      </div>
      <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col px-5 py-6 sm:px-8">
        {/* progress */}
        <div className="flex items-center gap-4">
          <HumoLogo className="h-7" />
          <div className="flex flex-1 gap-1.5">
            {STEPS.map((l, i) => (
              <div key={l} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-jg-500 to-jg-300" initial={false} animate={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            ))}
          </div>
          <span className="w-10 text-right text-[12px] tabular-nums text-cream/50">
            {step + 1}/{STEPS.length}
          </span>
        </div>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Humo */}
          <div className="relative hidden h-[460px] overflow-hidden rounded-[32px] ring-1 ring-white/[0.06] lg:block">
            <Suspense fallback={null}>
              <HumoScene layout="compact" bg="#050e19" />
            </Suspense>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }} className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-pine/80 p-4 text-[14px] leading-relaxed backdrop-blur">
                <span className="text-jg-300">Humo · </span>
                {
                  [
                    `${hi} I'll ask six quick questions, then build a plan that fits your week.`,
                    'Your aim decides how high we aim — and how hard I push.',
                    weeks ? `${weeks} weeks. That's enough time if we use it well.` : 'No date yet? Fine — I will plan in 12-week blocks.',
                    'Be honest — a good plan starts from where you really are.',
                    'Pick what feels hard. Your test results will sharpen this later.',
                    "I'll send this schedule to your Google Calendar if you want.",
                    built >= BUILD.length ? 'Done! Here is your week. You can edit anything, or just ask me to change it.' : 'Building your plan…',
                  ][step]
                }
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative min-h-[460px]">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}>
                {step === 0 && (
                  <div>
                    <img src="/brand/humo-mark.svg" alt="" className="size-16 rounded-2xl lg:hidden" />
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-[12.5px] text-jg-300 lg:mt-0">
                      <Sparkles className="size-3.5" /> Welcome to Humo AI
                    </p>
                    <h1 className="display mt-5 text-[clamp(2.4rem,5vw,4rem)] leading-[1.02]">
                      {hi}<br />
                      <span className="gold-text">Let's plan your SAT.</span>
                    </h1>
                    <p className="mt-5 max-w-md text-[16px] text-cream/70">Six quick questions. Humo turns your answers into a week-by-week plan you can edit, send to Google Calendar, or change just by asking.</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <button onClick={() => go(1)} className="btn btn-green h-13 px-7 text-[15px]">
                        Build my plan <ArrowRight className="size-4" />
                      </button>
                      <button onClick={() => finish('/app')} className="h-13 px-4 text-[14px] text-cream/50 hover:text-cream">
                        Skip for now
                      </button>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">What is your aim?</h2>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {AIMS.map(({ id, icon: Icon, sub, target }, i) => (
                        <motion.div key={id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <Choice on={p.aim === id} onClick={() => up({ aim: id, target })} className="w-full">
                            <Icon className="size-6 text-jg-300" />
                            <p className="mt-3 text-[15.5px] font-semibold">{id}</p>
                            <p className="mt-0.5 text-[12.5px] text-cream/55">{sub}</p>
                          </Choice>
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <div className="flex items-baseline justify-between">
                        <p className="text-[13.5px] text-cream/70">Target score</p>
                        <motion.p key={p.target} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-serif text-[40px] leading-none tabular-nums text-jg-300">
                          {p.target}
                        </motion.p>
                      </div>
                      <input type="range" min={900} max={1600} step={10} value={p.target} onChange={(e) => up({ target: Number(e.target.value) })} className="mt-4 w-full accent-[#e0456b]" />
                      <div className="mt-1 flex justify-between text-[11px] text-cream/40">
                        <span>900</span>
                        <span>1200</span>
                        <span>1400</span>
                        <span>1600</span>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">When is your SAT?</h2>
                    <p className="mt-2 text-[14px] text-cream/60">Official Digital SAT dates (same worldwide).</p>
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {SAT_DATES.map(([d, label], i) => {
                        const w = Math.ceil((new Date(d).getTime() - Date.now()) / (7 * 86400000))
                        return (
                          <motion.div key={d} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                            <Choice on={p.testDate === d} onClick={() => up({ testDate: d })} className="w-full">
                              <p className="text-[15px] font-semibold">{label}</p>
                              <p className="mt-1 text-[12px] text-cream/55">in {w} weeks</p>
                            </Choice>
                          </motion.div>
                        )
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-cream/70">
                        Other date
                        <input type="date" value={p.testDate ?? ''} onChange={(e) => up({ testDate: e.target.value || null })} className="bg-transparent text-cream [color-scheme:dark] focus:outline-none" />
                      </label>
                      <button onClick={() => up({ testDate: null })} className={`rounded-xl px-3 py-2 text-[13px] ${p.testDate == null ? 'bg-white/15 text-cream' : 'text-cream/55 hover:text-cream'}`}>
                        I haven't decided yet
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">Where are you now?</h2>
                    <div className="mt-6 space-y-3">
                      {LEVELS.map((l, i) => (
                        <motion.div key={l.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                          <Choice on={p.level === l.id} onClick={() => up({ level: l.id, current: l.id === 'new' ? null : (p.rw ?? 570) + (p.math ?? 570) })} className="w-full">
                            <p className="text-[15px] font-semibold">{l.title}</p>
                            <p className="mt-0.5 text-[12.5px] text-cream/55">{l.sub}</p>
                          </Choice>
                        </motion.div>
                      ))}
                    </div>
                    <AnimatePresence>
                      {p.level && p.level !== 'new' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {(
                              [
                                ['rw', 'Reading & Writing'],
                                ['math', 'Math'],
                              ] as const
                            ).map(([k, label]) => (
                              <div key={k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <div className="flex items-baseline justify-between">
                                  <p className="text-[13px] text-cream/70">{label}</p>
                                  <p className="font-serif text-[26px] tabular-nums">{p[k] ?? 570}</p>
                                </div>
                                <input
                                  type="range"
                                  min={200}
                                  max={800}
                                  step={10}
                                  value={p[k] ?? 570}
                                  onChange={(e) => {
                                    const v = Number(e.target.value)
                                    const other = k === 'rw' ? (p.math ?? 570) : (p.rw ?? 570)
                                    up({ [k]: v, current: v + other })
                                  }}
                                  className="mt-3 w-full accent-[#e0456b]"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-[13px] text-cream/60">
                            Total <span className="font-semibold text-cream">{p.current}</span>
                            {p.current != null && p.target > p.current && (
                              <>
                                {' '}
                                · <span className="text-jg-300">+{p.target - p.current}</span> to your target
                              </>
                            )}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">What feels hardest?</h2>
                    <p className="mt-2 text-[14px] text-cream/60">Pick any. Humo adds extra practice for these.</p>
                    {(
                      [
                        ['Reading & Writing', SKILLS.slice(0, 8)],
                        ['Math', SKILLS.slice(8)],
                      ] as const
                    ).map(([g, list]) => (
                      <div key={g} className="mt-5">
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-cream/40">{g}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {list.map((sk, i) => {
                            const on = p.focus?.includes(sk)
                            return (
                              <motion.button
                                key={sk}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => up({ focus: on ? p.focus!.filter((x) => x !== sk) : [...(p.focus ?? []), sk] })}
                                className={`rounded-full border px-3.5 py-2 text-[13px] transition-colors ${on ? 'border-jg-400 bg-jg-500 text-white' : 'border-white/12 bg-white/[0.04] text-cream/80 hover:border-white/30'}`}
                              >
                                {on && <Check className="-ml-0.5 mr-1 inline size-3.5" strokeWidth={3} />}
                                {sk}
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {step === 5 && (
                  <div>
                    <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">Your study week</h2>
                    <p className="mt-5 text-[13px] text-cream/60">Which days can you study?</p>
                    <div className="mt-2 grid grid-cols-7 gap-2">
                      {DAY_NAMES.map((d, i) => {
                        const on = p.studyDays?.includes(i)
                        return (
                          <motion.button key={d} whileTap={{ scale: 0.9 }} onClick={() => up({ studyDays: on ? p.studyDays!.filter((x) => x !== i) : [...(p.studyDays ?? []), i].sort() })} className={`rounded-2xl py-3 text-[13px] font-semibold transition-colors ${on ? 'bg-jg-500 text-white' : 'bg-white/[0.05] text-cream/60 hover:bg-white/10'}`}>
                            {d.slice(0, 3)}
                          </motion.button>
                        )
                      })}
                    </div>
                    <p className="mt-6 text-[13px] text-cream/60">How long each day?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[30, 45, 60, 90, 120].map((m) => (
                        <button key={m} onClick={() => up({ minutesPerDay: m })} className={`rounded-full px-4 py-2 text-[13.5px] ${p.minutesPerDay === m ? 'bg-cream text-ink' : 'bg-white/[0.06] text-cream/70 hover:bg-white/10'}`}>
                          {m < 60 ? `${m} min` : `${m / 60} h`}
                        </button>
                      ))}
                    </div>
                    <p className="mt-6 text-[13px] text-cream/60">Usual start time (for reminders and Google Calendar)</p>
                    <input type="time" value={p.studyTime} onChange={(e) => up({ studyTime: e.target.value })} className="mt-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-[16px] [color-scheme:dark] focus:border-jg-400 focus:outline-none" />
                    <p className="mt-5 text-[13px] text-cream/55">
                      ≈ <span className="font-semibold text-cream">{Math.round(((p.studyDays?.length ?? 0) * (p.minutesPerDay ?? 60)) / 6) / 10} hours</span> a week
                      {weeks ? ` · ${Math.round(((p.studyDays?.length ?? 0) * (p.minutesPerDay ?? 60) * weeks) / 60)} hours before test day` : ''}
                    </p>
                  </div>
                )}

                {step === 6 && (
                  <div>
                    <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">{built >= BUILD.length ? 'Your plan is ready' : 'Humo is building your plan'}</h2>
                    <ul className="mt-6 space-y-2.5">
                      {BUILD.map((b, i) => (
                        <motion.li key={b} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= built ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 text-[14.5px]">
                          <span className={`grid size-6 place-items-center rounded-full transition-colors ${i < built ? 'bg-jg-500 text-white' : 'bg-white/10'}`}>
                            {i < built ? <Check className="size-3.5" strokeWidth={3} /> : i === built ? <span className="size-3 animate-spin rounded-full border-2 border-jg-300 border-t-transparent" /> : null}
                          </span>
                          {b}
                        </motion.li>
                      ))}
                    </ul>
                    <AnimatePresence>
                      {built >= BUILD.length && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mt-7 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                          <div className="grid grid-cols-3 gap-3 text-center">
                            {[
                              [weeks ? `${weeks}` : '12', 'weeks'],
                              [`${Math.round(planMinutes(plan) / 6) / 10}`, 'hours / week'],
                              [gap != null ? `+${gap}` : `${p.target}`, gap != null ? 'points to gain' : 'target'],
                            ].map(([v, l], i) => (
                              <motion.div key={l} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300, damping: 18 }}>
                                <p className="font-serif text-[30px] leading-none text-jg-300">{v}</p>
                                <p className="mt-1 text-[11.5px] text-cream/55">{l}</p>
                              </motion.div>
                            ))}
                          </div>
                          <div className="mt-5 grid grid-cols-7 gap-1.5">
                            {plan.days.map((d, i) => (
                              <div key={i}>
                                <p className="text-center text-[10.5px] text-cream/50">{DAY_NAMES[i].slice(0, 2)}</p>
                                <div className="mt-1 space-y-1">
                                  {d.length === 0 && <span className="block h-4 rounded bg-white/[0.06]" />}
                                  {d.map((t, j) => (
                                    <motion.span key={t.id} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.3 + i * 0.05 + j * 0.04 }} title={t.title} style={{ height: Math.max(8, t.min / 2.2), originY: 0 }} className={`block rounded ${KINDS[t.kind].color}`} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {step > 0 && (
          <div className="flex items-center justify-between border-t border-white/10 pt-5">
            <button onClick={() => go(-1)} className="inline-flex items-center gap-2 text-[14px] text-cream/60 hover:text-cream">
              <ArrowLeft className="size-4" /> Back
            </button>
            {step < 6 ? (
              <button disabled={!canNext} onClick={() => go(1)} className="btn btn-green h-12 px-7 text-[15px] disabled:opacity-40">
                {step === 5 ? 'Build my plan' : 'Continue'} <ArrowRight className="size-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button disabled={built < BUILD.length} onClick={() => finish('/app')} className="btn h-12 border border-white/15 px-5 text-[14px] text-cream disabled:opacity-40">
                  Dashboard
                </button>
                <button disabled={built < BUILD.length} onClick={() => finish('/app/plan')} className="btn btn-green h-12 px-6 text-[15px] disabled:opacity-40">
                  Open my plan <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
