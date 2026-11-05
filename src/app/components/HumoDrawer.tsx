import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, RotateCcw, Send, X } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { askHumo, HumoLimit, HumoOffline, HumoStopped, streamingText, type ChatMsg } from '../humo'
import { LimitCard, UsageLine } from './Upgrade'
import { RichText } from './RichText'
import { DesmosScreen } from '../../desmos/DesmosScreen'
import { PlanProposal } from './PlanProposal'

/** Humo's text with its checked Desmos screens and plan proposals placed where Humo put them. */
export function HumoReply({ msg }: { msg: ChatMsg }) {
  const parts = msg.text.split(/(\[\[(?:desmos:\d+|plan)\]\])/g)
  const used = new Set<number>()
  return (
    <>
      {parts.map((part, i) => {
        const d = part.match(/^\[\[desmos:(\d+)\]\]$/)
        if (d) {
          const sc = msg.desmos?.[Number(d[1])]
          if (!sc) return null
          used.add(Number(d[1]))
          return <DesmosScreen key={i} screen={sc} />
        }
        if (part === '[[plan]]') return msg.plan ? <PlanProposal key={i} plan={msg.plan} /> : null
        return part.trim() ? <RichText key={i} text={part.replace(/^\n+|\n+$/g, '')} /> : null
      })}
      {msg.desmos?.map((sc, i) => (used.has(i) ? null : <DesmosScreen key={`x${i}`} screen={sc} />))}
      {msg.plan && !msg.text.includes('[[plan]]') && <PlanProposal plan={msg.plan} />}
    </>
  )
}

/** Copy / try-again row under Humo's latest reply. */
function ReplyActions({ msg, onRetry }: { msg: ChatMsg; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text.replace(/\[\[(?:desmos:\d+|plan)\]\]/g, '').replace(/\n{3,}/g, '\n\n').trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }
  return (
    <div className="mt-1.5 flex items-center gap-1 pl-9 text-[12px] text-moss">
      {msg.error ? (
        onRetry && !msg.limit && (
          <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-full bg-jg-500 px-3 py-1 font-semibold text-white hover:bg-jg-600">
            <RotateCcw className="size-3.5" /> Try again
          </button>
        )
      ) : (
        <>
          <button onClick={copy} aria-label="Copy reply" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-soft hover:text-pine">
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} {copied ? 'Copied' : 'Copy'}
          </button>
          {onRetry && (
            <button onClick={onRetry} aria-label="Answer again" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-soft hover:text-pine">
              <RotateCcw className="size-3.5" /> Answer again
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function HumoMessages({ msgs, busy, onRetry }: { msgs: ChatMsg[]; busy: boolean; onRetry?: () => void }) {
  const end = useRef<HTMLDivElement>(null)
  const lastIdx = msgs.length - 1
  const showActions = !busy && lastIdx > 0 && msgs[lastIdx]?.role === 'humo' && msgs.slice(0, lastIdx).some((m) => m.role === 'user')
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, busy])
  return (
    <div className="space-y-4">
      {msgs.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: m.role === 'user' ? 'bottom right' : 'bottom left' }}
          className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}
        >
          {m.role === 'humo' && <img src="/brand/humo-mark.svg" alt="" className="mt-0.5 size-7 shrink-0 rounded-lg" />}
          <div className={`rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${m.role === 'user' ? 'max-w-[82%] bg-pine text-cream' : `border border-line bg-card text-pine ${m.desmos?.length || m.plan ? 'w-full max-w-[94%]' : 'max-w-[82%]'}`}`}>
            {m.role === 'humo' ? (
              <>
                <HumoReply msg={m} />
                {m.limit && <LimitCard feature={m.limit} />}
              </>
            ) : (
              <>
                {m.images?.length ? (
                  <span className="mb-1.5 flex flex-wrap gap-1.5">
                    {m.images.map((src, k) => (
                      <img key={k} src={src} alt="Question photo" className="max-h-48 rounded-xl ring-1 ring-white/20" />
                    ))}
                  </span>
                ) : null}
                {m.text}
              </>
            )}
          </div>
        </motion.div>
      ))}
      {showActions && <ReplyActions msg={msgs[lastIdx]} onRetry={onRetry} />}
      {busy && msgs[msgs.length - 1]?.role === 'user' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
          <span className="relative">
            <span className="absolute inset-0 animate-ping rounded-lg bg-jg-400/40" />
            <img src="/brand/humo-mark.svg" alt="" className="relative size-7 rounded-lg" />
          </span>
          <span className="flex items-center gap-1 rounded-2xl border border-line bg-card px-4 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-bounce rounded-full bg-jg-500" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </span>
        </motion.div>
      )}
      <div ref={end} />
    </div>
  )
}

export function useHumoChat(greeting: string, context?: string, opts: { initial?: ChatMsg[]; onChange?: (msgs: ChatMsg[]) => void; space?: 'humo' | 'desmos' } = {}) {
  const { token } = useAuth()
  const [msgs, setMsgsRaw] = useState<ChatMsg[]>(() => opts.initial ?? [{ role: 'humo', text: greeting }])
  const [busy, setBusy] = useState(false)
  const ctl = useRef<AbortController | null>(null)
  const onChange = useRef(opts.onChange)
  onChange.current = opts.onChange
  const setMsgs = (fn: (m: ChatMsg[]) => ChatMsg[]) =>
    setMsgsRaw((m) => {
      const next = fn(m)
      queueMicrotask(() => onChange.current?.(next))
      return next
    })
  async function send(text: string, images?: string[]) {
    const t = text.trim()
    if ((!t && !images?.length) || busy) return
    await run([...msgs, { role: 'user' as const, text: t, at: Date.now(), ...(images?.length ? { images } : {}) }])
  }
  /** Asks the student's last question again (after an error, or for a fresh explanation). */
  async function retry() {
    if (busy) return
    let i = msgs.length - 1
    while (i >= 0 && msgs[i].role !== 'user') i--
    if (i < 0) return
    await run(msgs.slice(0, i + 1))
  }
  async function run(history: ChatMsg[]) {
    setMsgs(() => history)
    setBusy(true)
    const at = Date.now()
    // the streaming reply is the message right after `history`; it is replaced by the checked answer at the end
    const put = (msg: ChatMsg) => setMsgs((m) => [...m.slice(0, history.length), msg])
    ctl.current = new AbortController()
    try {
      const r = await askHumo(history, token, context, opts.space, (t) => put({ role: 'humo', text: streamingText(t), at }), ctl.current.signal)
      put({ role: 'humo', text: r.reply, desmos: r.desmos?.length ? r.desmos : undefined, plan: r.plan ?? undefined, at })
    } catch (e) {
      if (e instanceof HumoStopped) {
        const kept = streamingText(e.partial)
        put({ role: 'humo', text: kept ? `${kept}\n\n*Stopped.*` : '*Stopped.*', at })
        return
      }
      if (e instanceof HumoLimit) return put({ role: 'humo', error: true, limit: e.feature, text: e.message, at: Date.now() })
      put({ role: 'humo', error: true, text: e instanceof HumoOffline ? e.message : (e as Error).message, at: Date.now() })
    } finally {
      ctl.current = null
      setBusy(false)
    }
  }
  /** Stops the reply Humo is writing; what it wrote so far stays. */
  function stop() {
    ctl.current?.abort()
  }
  function reset(next: ChatMsg[]) {
    setMsgsRaw(next)
  }
  return { msgs, busy, send, reset, retry, stop }
}

/** Slide-over chat with Humo that already knows the test the student just took. */
export function HumoDrawer({ open, onClose, context, greeting, suggestions, prefill, subtitle = 'Your Digital SAT tutor', autoSend }: { open: boolean; onClose: () => void; context: string; greeting: string; suggestions: string[]; prefill?: string; subtitle?: string; autoSend?: string | null }) {
  const { msgs, busy, send, retry } = useHumoChat(greeting, context)
  const [input, setInput] = useState('')
  const sent = useRef<string | null>(null)
  useEffect(() => {
    if (open && autoSend && sent.current !== autoSend) {
      sent.current = autoSend
      send(autoSend)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoSend])
  useEffect(() => {
    if (open && prefill) setInput(prefill)
  }, [open, prefill])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-pine/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label="Chat with Humo"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cream"
          >
            <div className="flex items-center gap-3 border-b border-line bg-card px-5 py-4">
              <img src="/brand/humo-mark.svg" alt="" className="size-10 rounded-xl" />
              <div className="flex-1">
                <p className="text-[15px] font-semibold">Humo</p>
                <p className="text-[12px] text-moss">{subtitle}</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-moss hover:bg-cream">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <HumoMessages msgs={msgs} busy={busy} onRetry={retry} />
            </div>
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-2 px-5 pb-3">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] text-pine hover:border-jg-500">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="mx-4">
              <UsageLine feature="humo" />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
                setInput('')
              }}
              className="m-4 mt-0 flex gap-2 rounded-2xl border border-line bg-card p-1.5 focus-within:border-jg-500"
            >
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about any question…" className="flex-1 bg-transparent px-3 text-[14.5px] placeholder:text-moss/60 focus:outline-none" />
              <button aria-label="Send" disabled={busy || !input.trim()} className="grid size-10 place-items-center rounded-xl bg-pine text-cream disabled:opacity-40">
                <Send className="size-4" />
              </button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
