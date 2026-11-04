import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, CreditCard, Crown, Lock, MessageCircle, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { FREE_FEATURES, PRO_FEATURES } from '../../../shared/plans.js'
import { useAuth } from '../../lib/auth'
import { priceLabel, refreshAccount, useAccount } from '../account'

const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

const FAQ: [string, string][] = [
  ['What stays free?', 'The whole question bank, with explanations, plus one Ask Humo question and one Desmos Lab solve every day. The free questions come back at midnight Tashkent time.'],
  ['Will my card be charged every month?', 'No. One payment gives you 30 days of Pro. Nothing renews by itself; pay again when you want another month.'],
  ['Can I pay in so\'m with Click, Payme, Uzcard or Humo?', 'Yes. Message our manager on Telegram with the email you use on Humo AI. After you pay, the manager turns Pro on for your account, usually within minutes.'],
  ['When does Pro start?', 'Right after a card payment. Reload the page if it does not show at once.'],
]

export default function Upgrade() {
  const a = useAccount()
  const { user, token } = useAuth()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)

  // back from the card payment page
  useEffect(() => {
    const id = params.get('session_id')
    if (params.get('cancelled')) {
      setNote({ ok: false, text: 'The payment was cancelled. Nothing was charged.' })
      setParams({}, { replace: true })
    }
    if (!id || !token) return
    setNote({ ok: true, text: 'Checking your payment…' })
    fetch('/api/billing/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ sessionId: id }) })
      .then((r) => r.json())
      .then((d) => setNote(d.plan?.tier === 'pro' ? { ok: true, text: 'Payment received. Welcome to Humo Pro!' } : { ok: false, text: d.error || 'We could not see the payment yet. It usually appears within a minute; reload this page.' }))
      .catch(() => setNote({ ok: false, text: 'We could not check the payment yet. Reload this page in a minute.' }))
      .finally(() => {
        refreshAccount()
        setParams({}, { replace: true })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function payCard() {
    setBusy(true)
    setNote(null)
    try {
      const r = await fetch('/api/billing/checkout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json().catch(() => ({}))
      if (d.url) {
        location.href = d.url
        return
      }
      setNote({ ok: false, text: d.error || 'The card payment page could not open. Try again in a minute.' })
    } catch {
      setNote({ ok: false, text: 'No connection. Check your internet and try again.' })
    }
    setBusy(false)
  }

  const tg = a.billing.telegram
  const tgText = encodeURIComponent(`Hi! I want Humo AI Pro (${priceLabel(a)} / month). My account email: ${user?.email ?? ''}`)
  const tgHref = tg ? `${tg}${tg.includes('?') ? '&' : '?'}text=${tgText}` : ''

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] bg-[#03244a] px-6 py-9 text-white sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#bb0937]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-amber-300">
            <Sparkles className="size-3.5" /> Humo Pro
          </p>
          {a.pro ? (
            <>
              <h1 className="display mt-3 text-[clamp(2rem,5.5vw,3.2rem)] leading-[1.03]">You have every Humo AI feature.</h1>
              <p className="mt-4 text-[15px] text-white/70">{a.plan.until ? `Pro is active until ${fmtDate(a.plan.until)}.` : 'Pro is active with no end date.'} Unlimited Humo, Desmos Lab, tests and lessons are all yours.</p>
            </>
          ) : (
            <>
              <h1 className="display mt-3 text-[clamp(2rem,5.5vw,3.2rem)] leading-[1.03]">Your 1600 plan, without limits.</h1>
              <p className="mt-4 text-[15px] leading-relaxed text-white/70">Unlimited Humo, every practice test, all video lessons and a study plan built for your test date. Less than one private lesson a month.</p>
            </>
          )}
          <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[44px] font-semibold tracking-tight tabular-nums">{priceLabel(a).replace(" so'm", '')}</span>
            <span className="text-[15px] text-white/60">so'm / month · about ${a.billing.priceUsd}</span>
          </p>
        </div>
      </motion.div>

      {note && <p className={`mt-4 rounded-2xl px-4 py-3 text-[14px] font-medium ${note.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{note.text}</p>}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Free</h2>
            {!a.pro && <span className="rounded-full bg-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-moss">Your plan</span>}
          </div>
          <p className="mt-1 text-[13px] text-moss">0 so'm · for getting started</p>
          <ul className="mt-5 space-y-2.5 text-[14px]">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {f}
              </li>
            ))}
            {['Practice tests and exam papers', 'Video lessons, vocabulary and Blitz', 'Study plan and analytics'].map((f) => (
              <li key={f} className="flex gap-2.5 text-moss">
                <Lock className="mt-0.5 size-4 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative overflow-hidden rounded-[24px] border-2 border-amber-400/70 bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold">
              <Crown className="size-5 text-amber-500" /> Pro
            </h2>
            <span className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-0.5 text-[11.5px] font-bold text-[#3a2400]">{a.pro ? 'Your plan' : 'Most chosen'}</span>
          </div>
          <p className="mt-1 text-[13px] text-moss">
            {priceLabel(a)} / month · about ${a.billing.priceUsd}
          </p>
          <ul className="mt-5 space-y-2.5 text-[14px]">
            {['Everything in Free', ...PRO_FEATURES].map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-amber-500" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section id="pay" className="mt-5 card p-6 sm:p-7">
        <h2 className="display text-[26px]">{a.pro ? 'Add another month' : 'Choose how to pay'}</h2>
        <p className="mt-1 text-[13.5px] text-moss">Pro is turned on for {user?.email}. One payment = {a.billing.days} days. No automatic renewals.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-line p-5">
            <span className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-[#1a1f71] text-[13px] font-black italic tracking-tight text-white">VISA</span>
              <span>
                <span className="block text-[15px] font-semibold">Visa card</span>
                <span className="block text-[12.5px] text-moss">Pay ${a.billing.priceUsd} online, Pro starts at once</span>
              </span>
            </span>
            <button onClick={payCard} disabled={busy} className="btn btn-dark mt-5 h-11 text-[14px] disabled:opacity-60">
              <CreditCard className="size-4" /> {busy ? 'Opening the payment page…' : `Pay $${a.billing.priceUsd} with Visa`}
            </button>
            <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-moss">
              <ShieldCheck className="size-3.5" /> Secure card page. Humo AI never sees your card number.
            </p>
          </div>
          <div className="flex flex-col rounded-2xl border border-line p-5">
            <span className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-[#229ED9] text-white">
                <Send className="size-5" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold">Click, Payme, Uzcard, Humo</span>
                <span className="block text-[12.5px] text-moss">Pay {priceLabel(a)} through our manager</span>
              </span>
            </span>
            {tgHref ? (
              <a href={tgHref} target="_blank" rel="noreferrer" className="btn mt-5 h-11 bg-[#229ED9] text-[14px] text-white hover:brightness-105">
                <MessageCircle className="size-4" /> Message our manager on Telegram
              </a>
            ) : (
              <span className="btn mt-5 h-11 cursor-not-allowed bg-soft text-[14px] text-moss">
                <MessageCircle className="size-4" /> Manager's Telegram coming soon
              </span>
            )}
            <p className="mt-2.5 text-[11.5px] text-moss">Send your email; the manager turns Pro on, usually within minutes.</p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2">
        {FAQ.map(([q, ans]) => (
          <div key={q} className="card p-5">
            <p className="text-[14.5px] font-semibold">{q}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-moss">{ans}</p>
          </div>
        ))}
      </section>

      {!a.pro && (
        <p className="mt-6 text-center text-[13px] text-moss">
          Not ready yet?{' '}
          <Link to="/app/practice" className="font-semibold text-jg-700">
            Keep practicing in the free question bank
          </Link>
        </p>
      )}
    </div>
  )
}
