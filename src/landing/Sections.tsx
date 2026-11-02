import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { GoogleButton } from '../auth/GoogleButton'
import { Reveal, Spotlight } from '../components/motion'
import { motion } from 'framer-motion'
import { HumoLogo } from '../brand/HumoLogo'

export const UNIVERSITIES: [string, string][] = [
  ['Westminster International University in Tashkent', 'wiut.uz'],
  ['Inha University in Tashkent', 'inha.uz'],
  ['New York University Abu Dhabi', 'nyuad.nyu.edu'],
  ['KAIST', 'kaist.ac.kr'],
  ['University of Toronto', 'utoronto.ca'],
  ["King's College London", 'kcl.ac.uk'],
  ['Seoul National University', 'snu.ac.kr'],
  ['Technical University of Munich', 'tum.de'],
  ['National University of Singapore', 'nus.edu.sg'],
  ['Turin Polytechnic University in Tashkent', 'polito.uz'],
]
/** University crest via Google's public favicon service (loaded by the visitor's browser). */
export const uniLogo = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

export function Proof() {
  const row = [...UNIVERSITIES, ...UNIVERSITIES]
  return (
    <section className="border-t border-white/[0.07] py-12" aria-label="Universities our students aim for">
      <p className="mx-auto max-w-7xl px-4 text-[13px] text-white/40 sm:px-6">Humo AI students aim for universities like these</p>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <ul className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
          {row.map(([u, d], i) => (
            <li key={i} aria-hidden={i >= UNIVERSITIES.length} className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-2.5 pr-5 transition hover:border-white/20 hover:bg-white/[0.06]">
              <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white">
                <img src={uniLogo(d)} alt="" loading="lazy" className="size-7 object-contain" referrerPolicy="no-referrer" />
              </span>
              <span className="whitespace-nowrap text-[15px] font-medium tracking-tight text-white/70">{u}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function HowItWorks() {
  const steps = [
    ['Take a 40-minute diagnostic', 'A short, timed mix of every Digital SAT domain. You get an estimated score right away.'],
    ['Humo builds your plan', 'Your test date, target score and weak spots become a week-by-week schedule.'],
    ['Practice and review daily', 'Short sets from the question bank. Every mistake goes to your notebook with an explanation.'],
    ['Sit full mocks before test day', 'Timed, adaptive mocks show whether you are on track — and what to fix in the last weeks.'],
  ]
  return (
    <section className="border-t border-white/[0.07] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <h2 className="display max-w-2xl text-[clamp(2.1rem,4.4vw,3.5rem)]">From first login to test day.</h2>
        </Reveal>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, b], i) => (
            <motion.li key={t} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="bg-ink p-6 sm:p-7">
              <span className="grid size-8 place-items-center rounded-full border border-jg-500/40 text-[13px] font-semibold tabular-nums text-jg-300">{i + 1}</span>
              <h3 className="mt-6 text-[17px] font-semibold tracking-tight">{t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/50">{b}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const PLANS = [
  {
    name: 'Free',
    price: '0',
    unit: "so'm",
    note: 'For trying Humo AI',
    cta: 'Start free',
    features: ['300 practice questions', '1 full Digital SAT mock', '20 Humo messages a day', 'Mistake notebook'],
  },
  {
    name: 'Pro',
    price: '149 000',
    unit: "so'm / month",
    note: 'For students with a test date',
    cta: 'Start with Pro',
    featured: true,
    features: ['Full question bank', 'Unlimited full SAT mocks', 'Unlimited Humo', 'Personal study plan', 'Detailed analytics by skill'],
  },
  {
    name: 'Academy',
    price: 'Included',
    unit: 'with your course',
    note: 'For Humo AI students',
    cta: 'Join with academy code',
    features: ['Everything in Pro', 'Your teacher sees your progress', 'Weekly mock with group ranking', 'Speaking practice with teachers'],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-white/[0.07] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="display text-[clamp(2.1rem,4.4vw,3.5rem)]">Less than one private lesson a month.</h2>
          <p className="mt-5 text-[16px] leading-relaxed text-white/55">Start free. Upgrade when your test date gets close.</p>
        </div>
        <div className="mt-14 grid gap-3 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              key={p.name}
              className={`relative flex flex-col rounded-[24px] p-7 ${p.featured ? 'border border-jg-500/40 bg-gradient-to-b from-jg-500/[0.12] via-jg-500/[0.03] to-transparent' : 'panel'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold">{p.name}</h3>
                {p.featured && <span className="rounded-full bg-jg-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">Most chosen</span>}
              </div>
              <p className="mt-1 text-[13px] text-white/45">{p.note}</p>
              <p className="mt-7 flex items-baseline gap-2">
                <span className="text-[40px] font-semibold tracking-tight tabular-nums">{p.price}</span>
                <span className="text-[13px] text-white/45">{p.unit}</span>
              </p>
              <ul className="mt-7 flex-1 space-y-3 text-[14px] text-white/75">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-jg-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`mt-8 h-11 rounded-full text-center text-[14px] font-medium leading-[44px] transition ${
                  p.featured ? 'bg-jg-500 text-white hover:bg-jg-400' : 'border border-white/15 hover:border-white/30 hover:bg-white/[0.04]'
                }`}
              >
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FAQ = [
  ['Is Humo AI the same as the official SAT?', 'No. Our questions and mocks follow the official formats and timing closely, but they are written by Humo AI teachers. Use the official Bluebook practice tests as well before test day.'],
  ['How accurate are the score estimates?', 'Estimates are most reliable after a full mock. A single practice set gives a rough range; Humo tells you how confident the estimate is.'],
  ['Can Humo explain in Uzbek or Russian?', "Yes. Ask in O'zbekcha or Русский and Humo will answer in that language, while keeping exam terms in English so they match the real test."],
  ['Does Humo just give me the answers?', 'When you are practising, Humo starts with a hint and only shows the full solution if you ask. In review mode it explains the full reasoning.'],
  ['I study at the academy. Do I pay separately?', 'No. Academy students get full access with the code from their teacher.'],
  ['Can I cancel Pro at any time?', 'Yes. Pro is monthly, and you keep access until the end of the month you paid for.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-20 border-t border-white/[0.07] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 className="display text-[clamp(2.1rem,4.4vw,3.5rem)]">Questions students ask us.</h2>
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q}>
                <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 py-5 text-left text-[16px] font-medium">
                  {q}
                  <Plus className={`size-4 shrink-0 text-white/50 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] pb-5 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <p className="overflow-hidden pr-10 text-[15px] leading-relaxed text-white/55">{a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.07] py-28 sm:py-36">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-jg-500/[0.13] blur-[140px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-jg-500/20" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
        <img src="/humo-mark-512.png" alt="" className="size-16 rounded-2xl shadow-[0_20px_60px_-20px_rgba(200,16,63,0.7)]" />
        <h2 className="display mt-8 pb-2 text-[clamp(2.4rem,6vw,4.6rem)]">Humo is ready <span className="gold-text">when you are</span>.</h2>
        <p className="mt-5 max-w-md text-[16px] text-white/55">Take the diagnostic today and see where you stand in 40 minutes.</p>
        <div className="mt-9">
          <GoogleButton />
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <span className="flex items-center gap-2.5">
            <HumoLogo className="h-9" />
          </span>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/45">Humo AI, the digital SAT platform from Tashkent — full-length practice, a smart question bank and Humo, your AI tutor.</p>
        </div>
        {[
          ['Product', [['Try Humo', '#try'], ['Features', '#features'], ['Pricing', '#pricing']]],
          ['Legal', [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']]],
        ].map(([h, links]) => (
          <div key={h as string}>
            <p className="text-[13px] font-medium">{h as string}</p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/45">
              {(links as string[][]).map(([l, href]) => (
                <li key={l}>
                  <a href={href} className="hover:text-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.07]">
        <p className="mx-auto max-w-7xl px-4 py-6 text-[11px] leading-relaxed text-white/30 sm:px-6">
          © {new Date().getFullYear()} Humo AI. SAT® is a trademark of the College Board, which is not affiliated with and does not endorse this product.
        </p>
      </div>
    </footer>
  )
}

const INSIDE = [
  ['Exam, practice & sprint modes', 'Take any full test the way you need today: real timing, instant feedback, or less time to build pacing.'],
  ['Humo in every screen', 'A hint while you practise, an explanation above every reviewed question, and a chat that knows your answers.'],
  ['Desmos & reference sheet', 'The same graphing calculator and formula sheet you get in Bluebook, built into every Math test.'],
  ['Weekly study plan', 'A schedule that counts down to your test date, with tasks you tick off.'],
  ['Drills & daily question', 'Short sets with instant explanations, plus one new question every day.'],
  ['Vocabulary you own', '120 SAT words with spaced repetition, a spelling mode, and your own words from the passages you read.'],
  ['Strategy lessons', 'Words in Context, Transitions, Command of Evidence, linear equations and more — then drill them straight away.'],
  ['Analytics & predicted score', 'Accuracy and pacing by section, a 12-week activity map, and a predicted SAT range.'],
]

export function Inside() {
  return (
    <section className="border-t border-white/[0.07] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <h2 className="display max-w-2xl text-[clamp(2.1rem,4.4vw,3.5rem)]">Built like a tutor, not a question dump.</h2>
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {INSIDE.map(([t, b], i) => (
            <motion.div key={t} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: (i % 4) * 0.08, duration: 0.6 }} className="bg-ink">
              <Spotlight className="h-full p-6">
                <h3 className="relative text-[16px] font-semibold tracking-tight">{t}</h3>
                <p className="relative mt-2 text-[14px] leading-relaxed text-white/50">{b}</p>
              </Spotlight>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
