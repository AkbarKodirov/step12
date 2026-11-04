import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Check, Crown, Lock, Sparkles } from 'lucide-react'
import { PRO_FEATURES } from '../../../shared/plans.js'
import { priceLabel, resetIn, useAccount, type Feature } from '../account'

/** Small gold "Pro" tag. */
export function ProTag({ className = '' }: { className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-300 to-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3a2400] ${className}`}>
    <Crown className="size-3" /> Pro
  </span>
}

/** Full-page paywall shown instead of a Pro-only page. */
export function ProLock({ title, blurb }: { title: string; blurb: string }) {
  const a = useAccount()
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-[28px] bg-[#03244a] p-6 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#bb0937]/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-10 size-64 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative">
          <span className="inline-grid size-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Lock className="size-6 text-amber-300" />
          </span>
          <p className="mt-5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-amber-300">
            <Sparkles className="size-3.5" /> Humo Pro
          </p>
          <h1 className="display mt-2 text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.05]">Unlock {title} with Pro</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">{blurb}</p>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5 text-[14px] text-white/85">
                <Check className="mt-0.5 size-4 shrink-0 text-amber-300" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/app/upgrade" className="btn h-12 bg-gradient-to-r from-amber-300 to-amber-500 px-7 text-[15px] text-[#3a2400] shadow-lg shadow-amber-500/20 hover:brightness-105">
              <Crown className="size-4" /> Upgrade to Pro
            </Link>
            <p className="text-[13px] text-white/60">
              <span className="text-[17px] font-semibold text-white">{priceLabel(a)}</span> / month · about ${a.billing.priceUsd}
            </p>
          </div>
        </div>
      </div>
      <Link to="/app/practice" className="card card-hover mt-3 flex items-center gap-4 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-pine">
          <BookOpen className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Keep practicing for free</span>
          <span className="block text-[13px] text-moss">The full question bank stays free: 3,000+ questions with explanations.</span>
        </span>
      </Link>
    </motion.div>
  )
}

/** Card shown in a chat when today's free question is used up. */
export function LimitCard({ feature }: { feature: Feature | 'pro' }) {
  const a = useAccount()
  const what = feature === 'desmos' ? 'Desmos Lab solve' : 'question to Humo'
  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-[#03244a] p-4 text-white">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold">
        <Crown className="size-4 text-amber-300" /> {feature === 'pro' ? 'This is part of Humo Pro' : `That was today's free ${what}`}
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-white/70">
        Pro gives you unlimited Humo and Desmos Lab, every practice test and all lessons for {priceLabel(a)} a month.
        {feature !== 'pro' && a.resetAt ? ` Your free ${what} comes back in ${resetIn(a.resetAt)}.` : ''}
      </p>
      <Link to="/app/upgrade" className="btn mt-3 h-9 bg-gradient-to-r from-amber-300 to-amber-500 px-4 text-[13px] text-[#3a2400]">
        Go Pro
      </Link>
    </div>
  )
}

/** "1 free question left today" line above a chat box (Free plan only). */
export function UsageLine({ feature }: { feature: Feature }) {
  const a = useAccount()
  if (a.pro || !a.loaded) return null
  const left = a.left(feature)
  const name = feature === 'desmos' ? 'Desmos Lab solve' : 'Humo question'
  return (
    <div className={`mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2 text-[12.5px] ${left ? 'bg-soft text-moss' : 'bg-amber-50 text-amber-800'}`}>
      <span className="flex-1">
        {left ? (
          <>
            <b className="text-pine">{left} free {name}{left > 1 ? 's' : ''}</b> left today
          </>
        ) : (
          <>Today's free {name} is used{a.resetAt ? ` · back in ${resetIn(a.resetAt)}` : ''}</>
        )}
      </span>
      <Link to="/app/upgrade" className="inline-flex items-center gap-1 font-semibold text-jg-700 hover:text-jg-600">
        <Crown className="size-3.5" /> Unlimited with Pro
      </Link>
    </div>
  )
}
