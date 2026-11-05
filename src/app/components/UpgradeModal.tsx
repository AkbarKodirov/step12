import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight, Copy, CreditCard, Crown, Loader2, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { PRO_FEATURES } from '../../../shared/plans.js'
import { useAuth } from '../../lib/auth'
import { closeUpgrade, priceLabel, refreshAccount, useAccount, useUpgradeWindow } from '../account'

type Step = 'plan' | 'pay' | 'telegram' | 'done'
const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

/** The Go Pro window: one card at a time (plan → how to pay → Telegram), closed with X, Esc or a tap outside. */
export function UpgradeModal() {
  const win = useUpgradeWindow()
  const a = useAccount()
  const { user, token } = useAuth()
  const [step, setStep] = useState<Step>('plan')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // fresh start each time it opens; back from the card page → check the payment
  useEffect(() => {
    if (!win.open) return
    setNote(null)
    setBusy(false)
    setStep(a.pro ? 'done' : 'plan')
    if (win.cancelled) setNote({ ok: false, text: 'The payment was cancelled. Nothing was charged.' })
    if (win.sessionId && token) {
      setStep('done')
      setBusy(true)
      fetch('/api/billing/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ sessionId: win.sessionId }) })
        .then((r) => r.json())
        .then((d) => (d.plan?.tier === 'pro' ? setNote({ ok: true, text: 'Payment received.' }) : (setStep('plan'), setNote({ ok: false, text: d.error || 'We could not see the payment yet. It usually appears within a minute.' }))))
        .catch(() => (setStep('plan'), setNote({ ok: false, text: 'We could not check the payment yet. Try again in a minute.' })))
        .finally(() => {
          setBusy(false)
          refreshAccount()
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.open, win.sessionId])

  useEffect(() => {
    if (!win.open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeUpgrade()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [win.open])

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
      setNote({ ok: false, text: d.code === 'card_off' ? 'Card payments open very soon. For now, pay through our manager with Click, Payme, Uzcard or Humo.' : d.error || 'The card page could not open. Try again in a minute.' })
    } catch {
      setNote({ ok: false, text: 'No connection. Check your internet and try again.' })
    }
    setBusy(false)
  }

  const tg = a.billing.telegram
  const msg = `Hi! I want Humo AI Pro (${priceLabel(a)} / month). My account email: ${user?.email ?? ''}`
  const tgHref = tg ? `${tg}${tg.includes('?') ? '&' : '?'}text=${encodeURIComponent(msg)}` : ''

  return (
    <AnimatePresence>
      {win.open && (
        <motion.div key="upgrade" className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[#020a14]/70 backdrop-blur-sm" onClick={closeUpgrade} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Humo Pro"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className="relative max-h-[92svh] w-full overflow-y-auto rounded-t-[28px] bg-card text-pine shadow-2xl sm:max-w-[440px] sm:rounded-[28px]"
          >
            {/* top bar: back on the left, X on the right */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              {step === 'pay' || step === 'telegram' ? (
                <button onClick={() => (setNote(null), setStep(step === 'telegram' ? 'pay' : 'plan'))} aria-label="Back" className="grid size-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur hover:bg-black/35">
                  <ArrowLeft className="size-4" />
                </button>
              ) : (
                <span />
              )}
              <button onClick={closeUpgrade} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur hover:bg-black/35">
                <X className="size-4" />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                {/* navy header shared by every card */}
                <div className="relative overflow-hidden bg-[#03244a] px-6 pb-6 pt-14 text-white">
                  <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-[#bb0937]/45 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-amber-400/20 blur-3xl" />
                  <div className="relative">
                    <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                      <Sparkles className="size-3.5" /> Humo Pro
                    </p>
                    <h2 className="display mt-2 text-[28px] leading-[1.08]">
                      {step === 'plan' && 'Everything. Unlimited.'}
                      {step === 'pay' && 'How would you like to pay?'}
                      {step === 'telegram' && 'Pay with Click, Payme, Uzcard or Humo'}
                      {step === 'done' && (busy ? 'Checking your payment…' : 'You are Pro')}
                    </h2>
                    {step !== 'done' && (
                      <p className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-[30px] font-semibold tabular-nums">{priceLabel(a).replace(" so'm", '')}</span>
                        <span className="text-[13px] text-white/60">so'm / month · about ${a.billing.priceUsd}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {note && <p className={`mb-4 rounded-2xl px-4 py-3 text-[13px] font-medium ${note.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{note.text}</p>}

                  {step === 'plan' && (
                    <>
                      <ul className="space-y-3">
                        {PRO_FEATURES.map((f) => (
                          <li key={f} className="flex gap-3 text-[14px]">
                            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => (setNote(null), setStep('pay'))} className="btn mt-6 h-12 w-full bg-gradient-to-r from-amber-300 to-amber-500 text-[15px] text-[#3a2400] shadow-lg shadow-amber-500/25 hover:brightness-105">
                        <Crown className="size-4" /> Get Pro
                      </button>
                      <p className="mt-3 text-center text-[12px] text-moss">One payment = {a.billing.days} days. Nothing renews by itself.</p>
                    </>
                  )}

                  {step === 'pay' && (
                    <div className="space-y-3">
                      <button onClick={payCard} disabled={busy} className="group flex w-full items-center gap-4 rounded-2xl border border-line p-4 text-left transition hover:-translate-y-0.5 hover:border-[#1a1f71] hover:shadow-[0_10px_30px_-18px_rgb(26_31_113/.6)] disabled:opacity-60">
                        <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-[#1a1f71] text-[13px] font-black italic tracking-tight text-white">VISA</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">Visa card</span>
                          <span className="block text-[12.5px] text-moss">Pay ${a.billing.priceUsd} online · Pro starts at once</span>
                        </span>
                        {busy ? <Loader2 className="size-5 animate-spin text-moss" /> : <ChevronRight className="size-5 text-moss transition group-hover:translate-x-0.5" />}
                      </button>
                      <button onClick={() => (setNote(null), setStep('telegram'))} className="group flex w-full items-center gap-4 rounded-2xl border border-line p-4 text-left transition hover:-translate-y-0.5 hover:border-[#229ED9] hover:shadow-[0_10px_30px_-18px_rgb(34_158_217/.7)]">
                        <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-[#229ED9] text-white">
                          <Send className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">Click, Payme, Uzcard, Humo</span>
                          <span className="block text-[12.5px] text-moss">Pay {priceLabel(a)} through our manager</span>
                        </span>
                        <ChevronRight className="size-5 text-moss transition group-hover:translate-x-0.5" />
                      </button>
                      <p className="flex items-center justify-center gap-1.5 pt-1 text-[11.5px] text-moss">
                        <ShieldCheck className="size-3.5" /> Secure payment. Humo AI never sees your card number.
                      </p>
                    </div>
                  )}

                  {step === 'telegram' && (
                    <>
                      <ol className="space-y-3 text-[14px]">
                        {['Message our manager on Telegram.', `Pay ${priceLabel(a)} with Click, Payme, Uzcard or Humo.`, 'The manager turns Pro on for your account, usually within minutes.'].map((t, i) => (
                          <li key={t} className="flex gap-3">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#229ED9]/12 text-[12px] font-bold text-[#229ED9]">{i + 1}</span>
                            {t}
                          </li>
                        ))}
                      </ol>
                      <div className="mt-5 flex items-center gap-2 rounded-xl bg-soft px-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] text-moss">Your account email</span>
                          <span className="block truncate text-[13.5px] font-medium">{user?.email}</span>
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(user?.email ?? '')
                              setCopied(true)
                              setTimeout(() => setCopied(false), 1500)
                            } catch {
                              /* clipboard blocked */
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-pine hover:bg-card"
                        >
                          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      {tgHref ? (
                        <a href={tgHref} target="_blank" rel="noreferrer" className="btn mt-5 h-12 w-full bg-[#229ED9] text-[15px] text-white hover:brightness-105">
                          <Send className="size-4" /> Open Telegram
                        </a>
                      ) : (
                        <span className="btn mt-5 h-12 w-full cursor-not-allowed bg-soft text-[14px] text-moss">Manager's Telegram coming soon</span>
                      )}
                    </>
                  )}

                  {step === 'done' &&
                    (busy ? (
                      <div className="grid h-24 place-items-center">
                        <Loader2 className="size-6 animate-spin text-jg-500" />
                      </div>
                    ) : (
                      <>
                        <p className="text-[14.5px] leading-relaxed">
                          {a.plan.until ? `Pro is active until ${fmtDate(a.plan.until)}.` : 'Pro is active with no end date.'} Unlimited Humo, Desmos Lab, every test and lesson are yours.
                        </p>
                        {a.plan.source !== 'owner' && (
                          <button onClick={() => setStep('pay')} className="btn btn-ghost mt-5 h-11 w-full text-[14px]">
                            <CreditCard className="size-4" /> Add another month
                          </button>
                        )}
                        <button onClick={closeUpgrade} className="btn btn-dark mt-2 h-11 w-full text-[14px]">
                          Start studying
                        </button>
                      </>
                    ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
