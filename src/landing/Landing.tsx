import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import { CountUp } from '../components/motion'
import { GoogleButton } from '../auth/GoogleButton'
import { useAuth } from '../lib/auth'
import { TryHumo } from './TryHumo'
import { Features } from './Features'
import { Proof, HowItWorks, Inside, Pricing, Faq, FinalCta, Footer } from './Sections'
import { HumoLogo } from '../brand/HumoLogo'

const HumoScene = lazy(() => import('../three/HumoScene'))

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <HumoLogo className="h-8" />
      {!compact && (
        <span className="hidden border-l border-white/15 pl-2.5 text-[11px] font-medium uppercase leading-tight tracking-[0.14em] text-cream/55 sm:block">
          Digital
          <br />
          SAT
        </span>
      )}
    </span>
  )
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })
  const { user } = useAuth()
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const links = [
    ['Try Humo', '#try'],
    ['Features', '#features'],
    ['Pricing', '#pricing'],
    ['FAQ', '#faq'],
  ]
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled ? 'border-b border-white/[0.07] bg-ink/75 backdrop-blur-xl' : ''}`}>
      <motion.div className="absolute inset-x-0 bottom-0 h-px origin-left bg-jg-400" style={{ scaleX: progress, opacity: scrolled ? 1 : 0 }} />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Humo AI home">
          <Logo />
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="rounded-full px-4 py-1.5 text-[13px] text-white/65 transition hover:bg-white/[0.06] hover:text-white">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/app" className="h-9 rounded-full bg-white px-4 text-[13px] font-medium leading-9 text-ink hover:bg-white">
              Open app
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden h-9 px-3 text-[13px] leading-9 text-white/70 hover:text-white sm:block">
                Log in
              </Link>
              <Link to="/signup" className="h-9 rounded-full bg-white px-4 text-[13px] font-medium leading-9 text-ink hover:bg-white">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Hero() {
  const [ready, setReady] = useState(false)
  const item = {
    hidden: { opacity: 0, y: 18 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.25 + i * 0.09, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } }),
  }
  return (
    <section className="relative isolate flex min-h-svh items-end overflow-hidden md:items-center">
      {/* 3D stage */}
      <div className={`absolute inset-0 -z-10 transition-opacity duration-[1600ms] ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <Suspense fallback={null}>
          <SceneReady onReady={() => setReady(true)} />
        </Suspense>
      </div>
      {/* warm glow while WebGL loads, and a floor fade into the page */}
      <div className="pointer-events-none absolute right-[-10%] top-[10%] -z-20 size-[60vmin] rounded-full bg-jg-500/15 blur-[120px] md:right-[8%]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 -z-10 hidden w-1/2 bg-gradient-to-r from-ink/80 to-transparent md:block" />

      <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-[52vh] sm:px-6 md:pb-20 md:pt-32">
        <div className="max-w-[38rem]">
          <motion.a
            href="#try"
            custom={0}
            initial="hidden"
            animate="show"
            variants={item}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3.5 text-[13px] text-white/70 backdrop-blur hover:border-jg-500/40"
          >
            <span className="rounded-full bg-jg-500 px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
            Meet Humo, your AI SAT tutor
          </motion.a>

          <h1 className="display text-[clamp(2.75rem,min(7.2vw,11vh),5.9rem)]" aria-label="Your SAT score, raised by Humo.">
            {['Your', 'SAT', 'score,', 'raised', 'by'].map((w, i) => (
              <span key={w} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
                <motion.span className="inline-block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.3 + i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
                  {w}&nbsp;
                </motion.span>
              </span>
            ))}
            <span className="inline-block overflow-hidden pb-[0.14em] align-bottom" aria-hidden>
              <motion.span className="inline-block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.65, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
                <span className="brush brush-draw">Humo</span>.
              </motion.span>
            </span>
          </h1>

          <motion.p custom={2} initial="hidden" animate="show" variants={item} className="mt-6 max-w-[31rem] text-[17px] leading-relaxed text-white/60">
            Everything you need in one platform: real Digital SAT practice, timed mocks, and Humo — an AI tutor that shows you why you missed a question, in English, O'zbekcha or Русский.
          </motion.p>

          <motion.div custom={3} initial="hidden" animate="show" variants={item} className="mt-9 flex flex-wrap items-center gap-3">
            <GoogleButton />
            <a href="#try" className="inline-flex h-13 items-center rounded-full border border-white/15 px-6 text-[15px] text-white/85 transition hover:border-white/30 hover:bg-white/[0.04]">
              Try a question first
            </a>
          </motion.div>
          <motion.p custom={4} initial="hidden" animate="show" variants={item} className="mt-4 text-[13px] text-white/40">
            Free to start. No card needed.
          </motion.p>

          <motion.dl custom={5} initial="hidden" animate="show" variants={item} className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {/* real numbers from the app: question bank, practice tests + exam papers, Desmos Lab walkthroughs */}
            {[
              [4100, 'questions in the bank', '+'],
              [97, 'full tests: practice + real exams', ''],
              [132, 'Desmos walkthroughs', ''],
            ].map(([v, l, plus]) => (
              <div key={l}>
                <dt className="font-serif text-[28px] tracking-tight">
                  <CountUp to={v as number} duration={1.8} format={(n) => `${Math.round(n).toLocaleString('en-US')}${plus}`} />
                </dt>
                <dd className="mt-1 text-[12px] leading-snug text-white/45">{l}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </div>
    </section>
  )
}

/** Mounts the WebGL scene and reports once its chunk has loaded. */
function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const t = setTimeout(onReady, 120)
    return () => clearTimeout(t)
  }, [onReady])
  return <HumoScene layout="hero" />
}

export default function Landing() {
  return (
    <div className="min-h-svh bg-ink text-white">
      <Nav />
      <main>
        <Hero />
        <Proof />
        <TryHumo />
        <Features />
        <Inside />
        <HowItWorks />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
