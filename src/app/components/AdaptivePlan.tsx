import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Crosshair, Sparkles } from 'lucide-react'
import { useStore, type WeekPlan } from '../store'
import { applyPlan, KINDS, planDiff, planMinutes } from '../plan'
import { useAccount } from '../account'
import { adaptOptions, focusReasonText, readSignals, UI, type Option } from '../planAdapt'

/** Humo's plan options, built from the student's own progress: lighter weeks, a focus area, mistakes, a harder week. */
export function AdaptivePlan({ plan, weekDates, onApplied }: { plan: WeekPlan; weekDates: string[]; onApplied: (before: WeekPlan) => void }) {
  const s = useStore()
  const { pro } = useAccount()
  const lang = s.settings.language
  const t = UI(lang)
  const [pick, setPick] = useState<Option | null>(null)
  const openMistakes = s.mistakes.filter((m) => !m.cleared).length
  const g = useMemo(
    () => readSignals({ weakSkills: s.weakSkills, focus: s.profile.focus, attempts: s.attempts, openMistakes, plan, planDone: s.planDone, weekDates }),
    [s.weakSkills, s.profile.focus, s.attempts, openMistakes, plan, s.planDone, weekDates],
  )
  const options = useMemo(() => adaptOptions(plan, g, lang, pro), [plan, g, lang, pro])
  const hasTasks = plan.days.some((d) => d.length)
  const focusLink = `/app/practice/run?skills=${encodeURIComponent(g.skill)}&status=unsolved&order=random&n=10`

  return (
    <div className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-jg-400/15 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <img src="/brand/humo-mark.svg" alt="" className="size-10 rounded-xl" />
        <p className="text-[15px] font-semibold">{t.title}</p>
      </div>

      <div className="relative mt-4 flex items-start gap-3 rounded-2xl bg-jg-50 p-4">
        <Crosshair className="mt-0.5 size-5 shrink-0 text-jg-700" />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-jg-700">{t.focusTitle}</p>
          <p className="mt-0.5 text-[17px] font-semibold leading-snug">{g.skill}</p>
          <p className="mt-1 text-[12.5px] text-moss">
            {focusReasonText(g, lang)}
            {g.openMistakes > 0 ? ` · ${t.mistakesOpen(g.openMistakes)}` : ''}
          </p>
          <Link to={focusLink} className="btn btn-dark mt-3 h-9 px-4 text-[12.5px]">
            {t.focusCta}
          </Link>
        </div>
      </div>

      {!hasTasks ? (
        <p className="relative mt-4 text-[13px] text-moss">{t.noTasks}</p>
      ) : (
        <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => setPick(pick?.id === o.id ? null : o)}
              className={`rounded-2xl border p-3.5 text-left transition-colors ${pick?.id === o.id ? 'border-jg-500 bg-jg-50' : 'border-line bg-card hover:border-jg-500'}`}
            >
              <span className="flex items-center gap-2 text-[13.5px] font-semibold">
                <Sparkles className="size-4 shrink-0 text-jg-600" />
                <span className="min-w-0 flex-1">{o.label}</span>
              </span>
              {o.recommended && <span className="mt-1 inline-block rounded-full bg-jg-500 px-2 py-0.5 text-[10.5px] font-semibold text-white">{t.recommended}</span>}
              <span className="mt-1 block text-[12px] leading-snug text-moss">{o.reason}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {pick && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative overflow-hidden">
            <div className="mt-3 rounded-2xl bg-jg-50 p-4">
              <p className="text-[13.5px] text-pine">{pick.note}</p>
              <p className="mt-2 text-[12px] font-semibold text-jg-700">
                {planDiff(plan, pick.plan)} · {t.perWeek(Math.round(planMinutes(pick.plan) / 6) / 10, Math.round(planMinutes(plan) / 6) / 10)}
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {pick.plan.days.map((d, i) => (
                  <div key={i} className="min-w-0">
                    <p className="text-center text-[10.5px] font-semibold text-moss">{t.weekDay(i)}</p>
                    <div className="mt-1 space-y-1">
                      {d.length === 0 && <span className="block truncate rounded-md bg-white/70 py-1 text-center text-[9.5px] text-moss">{t.rest}</span>}
                      {d.map((x) => (
                        <span key={x.id} title={`${x.title} · ${x.min} min`} className={`block truncate rounded-md px-1 py-0.5 text-[9.5px] font-medium text-white ${KINDS[x.kind].color}`}>
                          {x.min}m
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    onApplied(plan)
                    applyPlan(pick.plan)
                    setPick(null)
                  }}
                  className="btn btn-green h-10 flex-1 text-[13.5px]"
                >
                  <Check className="size-4" /> {t.apply}
                </button>
                <button onClick={() => setPick(null)} className="btn btn-ghost h-10 px-4 text-[13px]">
                  {t.discard}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
