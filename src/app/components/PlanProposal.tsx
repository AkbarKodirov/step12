import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarCheck, Check } from 'lucide-react'
import { useStore, type WeekPlan } from '../store'
import { applyPlan, DAY_NAMES, KINDS, planDiff, planMinutes } from '../plan'

/** Humo's suggested week, shown inside a chat message with an Apply button. */
export function PlanProposal({ plan }: { plan: WeekPlan }) {
  const s = useStore()
  const [applied, setApplied] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="my-3 overflow-hidden rounded-2xl border border-jg-500/30 bg-gradient-to-b from-jg-50 to-card">
      <div className="flex items-center gap-2 border-b border-jg-500/15 px-4 py-2.5">
        <CalendarCheck className="size-4 text-jg-700" />
        <p className="flex-1 text-[13px] font-semibold text-pine">Humo's plan · {Math.round(planMinutes(plan) / 6) / 10} h/week</p>
        <span className="text-[11px] text-moss">{planDiff(s.plan, plan)}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 p-3">
        {plan.days.map((d, i) => (
          <div key={i} className="min-w-0">
            <p className="text-center text-[10.5px] font-semibold text-moss">{DAY_NAMES[i].slice(0, 2)}</p>
            <div className="mt-1 space-y-1">
              {d.length === 0 && <span className="block h-5 rounded-md bg-soft" title="Rest day" />}
              {d.map((t) => (
                <span key={t.id} title={`${t.title} · ${t.min} min`} className={`block rounded-md ${KINDS[t.kind].color}`} style={{ height: Math.max(8, Math.min(40, t.min / 2)) }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 pb-3">
        {applied ? (
          <Link to="/app/plan" className="btn btn-green h-9 flex-1 px-4 text-[13px]">
            <Check className="size-4" /> Applied — open plan
          </Link>
        ) : (
          <button
            onClick={() => {
              applyPlan(plan)
              setApplied(true)
            }}
            className="btn btn-dark h-9 flex-1 px-4 text-[13px]"
          >
            Apply to my study plan
          </button>
        )}
      </div>
    </motion.div>
  )
}
