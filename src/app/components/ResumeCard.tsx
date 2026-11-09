import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Calculator, Layers, Trash2 } from 'lucide-react'
import { clearRun, type SavedRun } from '../store'

const MODE_NAME = { exam: 'Exam mode', practice: 'Practice mode', sprint: 'Sprint mode' } as const

export function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} day${d > 1 ? 's' : ''} ago`
}

export const answeredIn = (run: SavedRun) => run.answers.reduce((n, row) => n + row.filter((x) => x.value != null && x.value !== '').length, 0)

/** Where the student stopped, in words: "Math · Module 1 · question 7" */
export function whereIn(run: SavedRun) {
  const full = run.type === 'FULL'
  const math = full ? run.mod >= 2 : run.type === 'MATH'
  const modNum = full ? (run.mod % 2) + 1 : run.mod + 1
  const sec = full ? (math ? 'Math' : 'Reading & Writing') : ''
  const pos = run.phase === 'break' ? 'On a break' : run.phase === 'review' ? 'Checking answers' : `Question ${run.idx + 1}`
  return [sec, `Module ${modNum}`, pos].filter(Boolean).join(' · ')
}

/** A saved test: where the student stopped, how much is done, and a button to continue exactly there. */
export function ResumeCard({ run, title, subtitle, delay = 0 }: { run: SavedRun; title?: string; subtitle?: string; delay?: number }) {
  const [ask, setAsk] = useState(false)
  const done = answeredIn(run)
  const pct = Math.round((done / Math.max(1, run.totalQuestions)) * 100)
  const Icon = run.type === 'FULL' ? Layers : run.type === 'MATH' ? Calculator : BookOpen
  const kind = run.type === 'FULL' ? 'Full test' : run.type === 'MATH' ? 'Math' : 'Reading & Writing'
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: [0.22, 1, 0.36, 1] }}>
      <article className="card flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-jg-50 text-jg-700">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-serif text-[21px] leading-tight">{title ?? run.name}</h3>
            <p className="mt-0.5 text-[12.5px] text-moss">
              {subtitle ?? kind} · {MODE_NAME[run.mode]}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] font-medium">{whereIn(run)}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Questions answered">
          <div className="h-full rounded-full bg-jg-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[12px] text-moss">
          {done} of {run.totalQuestions} answered · saved {ago(run.savedAt)}
        </p>
        <div className="mt-auto flex gap-2 pt-5">
          {ask ? (
            <>
              <button onClick={() => clearRun(run.testId)} className="btn h-11 flex-1 bg-red-600 text-[14px] text-white hover:bg-red-700">
                Yes, delete it
              </button>
              <button onClick={() => setAsk(false)} className="btn btn-ghost h-11 px-4 text-[13px]">
                Keep
              </button>
            </>
          ) : (
            <>
              <Link to={`/app/tests/${run.testId}/take?mode=${run.mode}&resume=1`} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
                Resume <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
              </Link>
              <button onClick={() => setAsk(true)} aria-label="Delete saved progress" title="Delete saved progress" className="btn btn-ghost h-11 w-11 px-0 text-moss">
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </article>
    </motion.div>
  )
}
