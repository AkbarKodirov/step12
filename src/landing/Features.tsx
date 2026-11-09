import { Flag } from 'lucide-react'
import { Reveal, Spotlight } from '../components/motion'
import { DesmosScreen } from '../desmos/DesmosScreen'
import type { DesmosScreen as Screen } from '../../shared/desmos-render.js'
import sample from './desmosSample.json'

function Card({ className = '', title, body, children }: { className?: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <Spotlight className={`panel flex flex-col overflow-hidden rounded-[24px] p-6 transition-[border-color] duration-300 hover:border-jg-500/30 sm:p-7 ${className}`}>
      <h3 className="relative text-[19px] font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-2 max-w-sm text-[14.5px] leading-relaxed text-white/50">{body}</p>
      {children && <div className="relative mt-6 flex-1">{children}</div>}
    </Spotlight>
  )
}

function MockPreview() {
  const answered = new Set([0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12])
  return (
    <div className="rounded-2xl border border-white/10 bg-ink/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-white/10 p-1 text-[12px]">
          {['R&W 1', 'R&W 2', 'Math 1', 'Math 2'].map((m, i) => (
            <span key={m} className={`rounded-full px-3 py-1 ${i === 2 ? 'bg-cream text-ink' : 'text-white/45'}`}>
              {m}
            </span>
          ))}
        </div>
        <span className="rounded-full bg-jg-500/10 px-3 py-1 text-[13px] font-semibold tabular-nums text-jg-300">31:42</span>
      </div>
      <div className="mt-5 grid grid-cols-11 gap-1.5">
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            className={`relative grid aspect-square place-items-center rounded-md text-[10px] tabular-nums ${
              i === 13 ? 'bg-cream text-ink' : answered.has(i) ? 'bg-jg-500/80 text-white' : 'border border-white/10 text-white/35'
            }`}
          >
            {i + 1}
            {i === 9 && <Flag className="absolute -right-1 -top-1 size-3 fill-red-400 text-red-400" />}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between text-[12px] text-white/40">
        <span>11 of 22 answered, 1 flagged</span>
        <span>Module 2 adapts to this score</span>
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="display text-[clamp(2.1rem,4.4vw,3.5rem)]">Everything between you and test day, in one place.</h2>
          <p className="mt-5 text-[16px] leading-relaxed text-white/55">Practice, full mocks, review and planning share one record of your progress, so Humo always knows what to give you next.</p>
        </Reveal>

        <div className="mt-9 grid gap-3 md:grid-cols-6">
          <Card className="md:col-span-6 border-[#2d70b3]/30" title="Humo solves Math the Desmos way — only in Uzbekistan" body="Send any Math question. Humo turns it into Desmos lines, graphs it on a real Desmos screen and checks every number before you see it. Open it live in one click, or train on 132 hard questions in the Desmos Lab.">
            <div className="grid items-center gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <ol className="space-y-2 font-mono text-[13px] text-white/75">
                {['1  y = 3(x − 2)', '2  y = 2x + 5', '→  intersection (11, 27)', '✓  x = 11, checked by plugging back'].map((l, i) => (
                  <li key={l} className={`rounded-xl border px-3.5 py-2.5 ${i === 3 ? 'border-jg-500/40 bg-jg-500/10 text-jg-200' : 'border-white/[0.08] bg-white/[0.03]'}`}>
                    {l}
                  </li>
                ))}
              </ol>
              <DesmosScreen screen={{ ...(sample as unknown as Screen), title: 'Humo · Desmos solve' }} compact />
            </div>
          </Card>

          <Card
            className="md:col-span-4 md:row-span-2"
            title="Full Digital SAT mocks"
            body="Two modules per section, real timing, and a second module that adapts to how you did on the first — scored the way the real test is."
          >
            <MockPreview />
          </Card>

          <Card className="md:col-span-2" title="Question bank by skill" body="Drill the exact SAT domain you're weakest in.">
            <div className="flex flex-wrap gap-1.5">
              {['Algebra', 'Advanced math', 'Geometry & trig', 'Craft & structure', 'Standard English', 'Problem solving'].map((t, i) => (
                <span key={t} className={`rounded-full border px-2.5 py-1 text-[12px] ${i === 1 ? 'border-jg-500/50 bg-jg-500/10 text-jg-200' : 'border-white/10 text-white/55'}`}>
                  {t}
                </span>
              ))}
            </div>
          </Card>

          <Card className="md:col-span-2" title="Mistake notebook" body="Every miss is saved with Humo's explanation and comes back until you get it right twice.">
            <ul className="space-y-2 text-[13px]">
              {[
                ['Partial distribution', 'Algebra', '2 left'],
                ['Transition words', 'Craft & structure', '1 left'],
              ].map(([a, b, c]) => (
                <li key={a} className="flex items-center justify-between rounded-xl border border-white/[0.07] px-3 py-2">
                  <span>
                    {a} <span className="text-white/35">in {b}</span>
                  </span>
                  <span className="text-jg-300/80">{c}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="md:col-span-3" title="A study plan Humo can rewrite" body="Answer six questions and Humo builds your week. Edit any task, ask Humo to change it in your own words, and send it to Google Calendar.">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px]">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                <div key={d} className={`rounded-xl border px-1 py-2.5 ${i === 2 ? 'border-jg-500/50 bg-jg-500/10' : 'border-white/[0.07]'}`}>
                  <p className="text-white/40">{d}</p>
                  <p className={`mt-1.5 font-medium ${i === 5 ? 'text-jg-300' : 'text-white/80'}`}>{['Algebra', 'Reading', 'Grammar', 'Geometry', 'Vocab', 'Mock', 'Review'][i]}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="md:col-span-3" title="Analytics that tell you what to fix" body="Predicted score, accuracy by domain and skill, pacing, study time and a practice calendar — every chart free, no Pro wall.">
            <div className="space-y-2.5">
              {[
                ['Words in context', 82],
                ['Command of evidence', 64],
                ['Transitions', 71],
                ['Algebra', 88],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-40 shrink-0 text-white/55">{k}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <span className="block h-full rounded-full bg-gradient-to-r from-jg-700 to-jg-300" style={{ width: `${v}%` }} />
                  </span>
                  <span className="w-9 text-right tabular-nums text-white/80">{v}%</span>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-white/30">Sample analytics</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
