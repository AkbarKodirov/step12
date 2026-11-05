import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, FileText, Lock } from 'lucide-react'

type PaperTest = { id: string; name: string; type: 'EBRW' | 'MATH'; year: number; month: number; region: string; questions: number; minutesPerModule: number }

/**
 * Exam papers library. Real past SAT papers belong to the College Board, so this shelf only lists
 * papers Humo AI has the right to publish; until those are added it points to the free
 * official Bluebook tests and to Humo AI's own full-length tests.
 */
export default function ExamPapers() {
  // exam papers are ordinary tests (public/tests/<id>.json, 2 modules each); public/papers/index.json says which ones sit on this shelf
  const [papers, setPapers] = useState<PaperTest[]>([])
  useEffect(() => {
    let alive = true
    fetch('/papers/index.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<PaperTest[]>) : []))
      .then((x) => alive && setPapers(x))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  const years = [...new Set(papers.map((p) => p.year))].sort((a, b) => b - a)
  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return (
    <div>
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Exam papers</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-moss">Full papers in the real Digital SAT format. Humo AI adds papers here as they're cleared for publishing.</p>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <a href="https://bluebook.collegeboard.org/" target="_blank" rel="noreferrer" className="card card-hover flex flex-col p-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-jg-50 text-jg-700">
            <FileText className="size-5" />
          </span>
          <p className="mt-4 font-serif text-[22px]">Official practice tests in Bluebook</p>
          <p className="mt-1.5 flex-1 text-[13.5px] text-moss">The College Board's free full-length Digital SAT practice tests run in the Bluebook app — the same app you'll use on test day. Take at least two before your exam.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-jg-700">
            Open Bluebook <ExternalLink className="size-3.5" />
          </span>
        </a>
        <Link to="/app/tests" className="card card-hover flex flex-col p-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-cream text-pine">
            <FileText className="size-5" />
          </span>
          <p className="mt-4 font-serif text-[22px]">Humo AI full-length tests</p>
          <p className="mt-1.5 flex-1 text-[13.5px] text-moss">Ten full sections written by Humo AI teachers, with exam, practice and sprint modes and Humo explanations for every question.</p>
          <span className="mt-4 text-[13px] font-semibold text-jg-700">Go to practice tests</span>
        </Link>
      </div>

      {years.map((y) => (
        <div key={y}>
          <h2 className="mt-10 text-[15px] font-semibold">{y}</h2>
          <p className="mt-1 text-[13px] text-moss">Reading & Writing is 54 questions in 2 modules, Math is 44 questions in 2 modules, like the real exam.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {papers
              .filter((p) => p.year === y)
              .map((p) => (
                <div key={p.id} className="card flex flex-col p-5">
                  <span className="grid size-10 place-items-center rounded-2xl bg-jg-50 text-jg-700">
                    <FileText className="size-5" />
                  </span>
                  <p className="mt-3 font-serif text-[20px]">
                    {MONTHS[p.month]} {p.year} · {p.region}
                  </p>
                  <p className="mt-1 text-[13.5px] text-moss">{p.type === 'EBRW' ? 'Reading & Writing' : 'Math'}</p>
                  <p className="mt-1 flex-1 text-[13px] text-moss">
                    {p.questions} questions · 2 modules · {p.minutesPerModule} min each
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link to={`/app/tests/${p.id}/take?mode=exam`} className="btn btn-dark h-10 flex-1 text-[13.5px]">
                      Start exam
                    </Link>
                    <Link to={`/app/tests/${p.id}/take?mode=practice`} className="btn btn-ghost h-10 px-4 text-[13.5px]">
                      Practice
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      <h2 className="mt-10 text-[15px] font-semibold">Coming to this shelf</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {['Humo AI Mock — November', 'Humo AI Mock — December', 'Academy Final — Winter', 'Academy Final — Spring'].map((t) => (
          <div key={t} className="card flex items-center gap-3 p-4 opacity-70">
            <Lock className="size-4 text-moss" />
            <span className="text-[13.5px]">{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
