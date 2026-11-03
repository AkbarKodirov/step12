import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Award, Check, RotateCcw, X } from 'lucide-react'
import { setStore, useStore } from '../store'
import { fmtTime, type VideoLesson } from './videos'

const PASS = 0.8

/** Five quick questions after a video lesson. A wrong answer links back to the chapter that teaches it. */
export function MasteryCheck({ storeKey, video, onRewatch }: { storeKey: string; video: VideoLesson; onRewatch: (chapterId: string) => void }) {
  const s = useStore()
  const qs = video.mastery
  const best = s.mastery?.[storeKey]
  const [i, setI] = useState(-1) // -1 = start screen, qs.length = results
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])

  const start = () => (setI(0), setPicked(null), setResults([]))
  const choose = (n: number) => {
    if (picked != null) return
    setPicked(n)
    setResults((r) => [...r, n === qs[i].answer])
  }
  const next = () => {
    if (i + 1 < qs.length) return (setI(i + 1), setPicked(null))
    const score = results.filter(Boolean).length
    setStore((x) => {
      const prev = x.mastery?.[storeKey]
      const mastered = score / qs.length >= PASS
      return {
        ...x,
        mastery: { ...x.mastery, [storeKey]: { best: Math.max(score, prev?.best ?? 0), total: qs.length, at: Date.now() } },
        lessonsDone: mastered && !x.lessonsDone[storeKey] ? { ...x.lessonsDone, [storeKey]: Date.now() } : x.lessonsDone,
      }
    })
    setI(qs.length)
  }

  const Dots = () => (
    <div className="flex gap-1.5">
      {qs.map((_, k) => (
        <span key={k} className={`h-1.5 w-6 rounded-full sm:w-7 ${k < results.length ? (results[k] ? 'bg-emerald-600' : 'bg-jg-500') : k === i ? 'bg-jg-300' : 'bg-soft'}`} />
      ))}
    </div>
  )

  if (i < 0)
    return (
      <section className="card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-jg-50 text-jg-500">
          <Award className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold">Mastery Check</h2>
          <p className="mt-0.5 text-[14px] text-moss">
            {qs.length} quick questions on this video. Get {Math.ceil(qs.length * PASS)} right to master the lesson.
            {best && (
              <>
                {' '}
                Your best: <b className={best.best / best.total >= PASS ? 'text-emerald-600' : 'text-pine'}>{best.best}/{best.total}</b>
              </>
            )}
          </p>
        </div>
        <button onClick={start} className="btn btn-green h-11 px-5 text-[14px]">
          {best ? 'Try again' : 'Start'} <ArrowRight className="size-4" />
        </button>
      </section>
    )

  if (i >= qs.length) {
    const score = results.filter(Boolean).length
    const passed = score / qs.length >= PASS
    const missed = qs.filter((_, k) => !results[k])
    return (
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[19px] font-bold">{passed ? 'Lesson mastered!' : 'Almost there'}</h2>
          <Dots />
        </div>
        <p className="display mt-3 text-[44px] leading-none">
          {score}
          <span className="text-[24px] text-moss">/{qs.length}</span>
        </p>
        <p className="mt-2 text-[14px] text-moss">{passed ? 'You can read these road signs. The lesson is marked as mastered.' : `You need ${Math.ceil(qs.length * PASS)} to master it. Rewatch the parts below, then try again.`}</p>
        {missed.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {[...new Set(missed.map((q) => q.chapter))].map((id) => {
              const c = video.chapters.find((x) => x.id === id)
              return (
                c && (
                  <button key={id} onClick={() => onRewatch(id)} className="btn btn-ghost h-9 px-3.5 text-[13px]">
                    <RotateCcw className="size-3.5" /> {c.title} ({fmtTime(c.t)})
                  </button>
                )
              )
            })}
          </div>
        )}
        <button onClick={start} className="btn btn-dark mt-5 h-11 px-5 text-[14px]">
          <RotateCcw className="size-4" /> Try again
        </button>
      </motion.section>
    )
  }

  const q = qs[i]
  const ch = video.chapters.find((x) => x.id === q.chapter)
  return (
    <motion.section key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="card grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold sm:text-[19px]">
          Mastery Check · Question {i + 1} of {qs.length}
        </h2>
        <Dots />
      </div>
      {q.text && <p className="rounded-2xl bg-soft p-4 font-serif text-[16.5px] leading-relaxed">{q.text}</p>}
      {q.notes && (
        <div className="rounded-2xl bg-soft p-4 font-serif text-[15.5px] leading-relaxed">
          <p className="font-sans text-[12.5px] text-moss">While researching a topic, a student has taken the following notes:</p>
          <ul className="mt-2 space-y-1.5">
            {q.notes.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-pine/60" />
                {n}
              </li>
            ))}
          </ul>
          {q.goal && <p className="mt-3 font-sans text-[14px] font-medium">{q.goal}</p>}
        </div>
      )}
      <p className="text-[15px] font-medium">{q.question}</p>
      <div className={`grid gap-2 ${q.notes ? '' : 'sm:grid-cols-2'}`}>
        {q.choices.map((c, n) => {
          const right = picked != null && n === q.answer
          const wrong = picked === n && n !== q.answer
          return (
            <button
              key={c}
              onClick={() => choose(n)}
              disabled={picked != null}
              className={`flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-3 text-left text-[14.5px] transition-colors ${right ? 'border-emerald-600 bg-emerald-600/[0.07]' : wrong ? 'border-jg-500 bg-jg-50' : picked != null ? 'border-line opacity-60' : 'border-line bg-card hover:border-line-strong hover:bg-cream'}`}
            >
              <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-[12.5px] font-bold ${right ? 'bg-emerald-600 text-white' : wrong ? 'bg-jg-500 text-white' : 'bg-soft'}`}>{right ? <Check className="size-4" /> : wrong ? <X className="size-4" /> : 'ABCD'[n]}</span>
              <span className="min-w-0">{c}</span>
            </button>
          )
        })}
      </div>
      {picked != null && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
          <p className={`border-l-[3px] pl-3 text-[14px] text-moss ${picked === q.answer ? 'border-emerald-600' : 'border-jg-500'}`}>
            <b className="text-pine">{picked === q.answer ? 'Correct. ' : `The answer is ${'ABCD'[q.answer]}. `}</b>
            {q.why}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={next} className="btn btn-green h-11 px-5 text-[14px]">
              {i + 1 < qs.length ? 'Next question' : 'See my score'} <ArrowRight className="size-4" />
            </button>
            {picked !== q.answer && ch && (
              <button onClick={() => onRewatch(ch.id)} className="btn btn-ghost h-11 px-4 text-[13.5px]">
                <RotateCcw className="size-4" /> Rewatch "{ch.title}" ({fmtTime(ch.t)})
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.section>
  )
}
