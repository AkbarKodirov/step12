import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, History, ImagePlus, MessageSquarePlus, Mic, Pencil, Pin, PinOff, Search, Send, Square, Trash2, X } from 'lucide-react'
import { HumoMessages, useHumoChat } from '../components/HumoDrawer'
import { setStore, useStore, type Chat, type ChatMsg } from '../store'
import { studentContext } from '../humoContext'
import { uid } from '../plan'
import { hello } from '../greetings'
import { useAuth } from '../../lib/auth'
import { UsageLine } from '../components/Upgrade'

type Space = 'humo' | 'desmos'
const COPY: Record<Space, { greeting: string; starters: string[]; title: string; sub: string; placeholder: string }> = {
  humo: {
    greeting: "I'm Humo. Send me any SAT question — I'll solve math the Desmos way with a real Desmos screen — or ask me to build or change your study plan.",
    starters: ['Solve x² − 5x + 6 = 0 with Desmos', 'Make my weekends lighter in my plan', 'Ikkinchi darajali tenglamalarni tushuntir', 'What should I study after my last test?'],
    title: 'Humo',
    sub: 'Digital SAT tutor · Desmos solves · edits your plan · English, O\'zbekcha, Русский',
    placeholder: 'Ask Humo or paste a math question…',
  },
  desmos: {
    greeting: 'Send me a photo or screenshot of any SAT Math question. I read it, type it into Desmos, check every number, and show you the Desmos screen step by step.',
    starters: ['How do I solve systems in Desmos?', 'Teach me list regression [ ] ~ [ ]', 'When should I NOT use Desmos?', 'Solve: for what k does x² + kx + 9 = 0 have one solution?'],
    title: 'Desmos Lab',
    sub: 'Upload a question photo · Humo solves it on a real Desmos screen · only in Uzbekistan',
    placeholder: 'Add a photo, paste a screenshot, or type the question…',
  },
}

/** Photos are big: keep a smaller copy in history and drop pictures from the oldest chats when storage gets full. */
function shrink(src: string, max: number, q: number) {
  return new Promise<string>((res) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      res(c.toDataURL('image/jpeg', q))
    }
    img.onerror = () => res(src)
    img.src = src
  })
}

async function saveChat(id: string, msgs: ChatMsg[], space: Space) {
  if (msgs.filter((m) => m.role === 'user').length === 0) return
  const first = msgs.find((m) => m.role === 'user')!
  const read = msgs.find((m) => m.role === 'humo' && /I read:/i.test(m.text))?.text.match(/I read:\s*\**\s*([^\n]+)/i)?.[1]
  const firstQ = first.text || (read ? read.replace(/[*"“”]/g, '').trim() : first.images?.length ? 'Question photo' : 'Chat')
  const stored = await Promise.all(msgs.map(async (m) => (m.images?.length ? { ...m, images: await Promise.all(m.images.map((x) => (x.length > 90000 ? shrink(x, 720, 0.7) : x))) } : m)))
  setStore((s) => {
    const existing = s.chats.find((c) => c.id === id)
    const chat: Chat = existing
      ? { ...existing, msgs: stored, updatedAt: Date.now(), title: existing.title === 'Question photo' && read ? firstQ.slice(0, 52) : existing.title }
      : { id, space, title: firstQ.replace(/\s+/g, ' ').slice(0, 52) + (firstQ.length > 52 ? '…' : ''), createdAt: Date.now(), updatedAt: Date.now(), msgs: stored }
    let chats = [chat, ...s.chats.filter((c) => c.id !== id)].slice(0, 80)
    // keep pictures in at most the 12 newest chats so local storage never fills up
    let withPics = 0
    chats = chats.map((c) => {
      if (!c.msgs.some((m) => m.images?.length)) return c
      return ++withPics <= 12 ? c : { ...c, msgs: c.msgs.map((m) => (m.images ? { ...m, images: undefined, text: `${m.text} [photo]`.trim() } : m)) }
    })
    return { ...s, chats }
  })
}

function groupOf(t: number) {
  const d = new Date(t)
  const now = new Date()
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'Previous 7 days'
  if (days < 30) return 'Previous 30 days'
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function HistoryList({ active, onPick, onNew, space }: { active: string; onPick: (id: string) => void; onNew: () => void; space: Space }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const list = s.chats.filter((c) => (c.space ?? 'humo') === space).filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()) || c.msgs.some((m) => m.text.toLowerCase().includes(q.toLowerCase())))
  const pinned = list.filter((c) => c.pinned)
  const rest = list.filter((c) => !c.pinned).sort((a, b) => b.updatedAt - a.updatedAt)
  const groups: [string, Chat[]][] = []
  for (const c of rest) {
    const g = groupOf(c.updatedAt)
    const last = groups[groups.length - 1]
    if (last && last[0] === g) last[1].push(c)
    else groups.push([g, [c]])
  }
  if (pinned.length) groups.unshift(['Pinned', pinned])

  return (
    <div className="flex h-full flex-col">
      <button onClick={onNew} className="btn btn-dark h-10 w-full text-[13.5px]">
        <MessageSquarePlus className="size-4" /> New chat
      </button>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 focus-within:border-jg-500">
        <Search className="size-3.5 text-moss" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="w-full bg-transparent text-[13px] focus:outline-none" />
      </label>
      <div className="-mx-1 mt-3 flex-1 overflow-y-auto px-1">
        {groups.length === 0 && <p className="px-2 py-6 text-center text-[12.5px] text-moss">{q ? 'No chats match.' : 'Your conversations with Humo will appear here.'}</p>}
        {groups.map(([g, chats]) => (
          <div key={g} className="mb-3">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-moss/80">{g}</p>
            <AnimatePresence initial={false}>
              {chats.map((c) => (
                <motion.div key={c.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className={`group relative flex items-center rounded-xl ${c.id === active ? 'bg-card shadow-[0_4px_14px_-8px_rgb(27_41_37/.35)] ring-1 ring-line' : 'hover:bg-white/70'}`}>
                  {editing === c.id ? (
                    <input
                      autoFocus
                      defaultValue={c.title}
                      onBlur={(e) => {
                        const t = e.target.value.trim()
                        if (t) setStore((x) => ({ ...x, chats: x.chats.map((y) => (y.id === c.id ? { ...y, title: t.slice(0, 60) } : y)) }))
                        setEditing(null)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="m-1 w-full rounded-lg border border-jg-500 px-2 py-1.5 text-[13px] focus:outline-none"
                    />
                  ) : (
                    <button onClick={() => onPick(c.id)} className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-[13px]">
                      {c.msgs.some((m) => m.desmos?.length) && <span className="mr-1.5 inline-grid size-4 place-items-center rounded bg-[#2d70b3] align-[-2px] text-[9px] font-bold text-white">D</span>}
                      {c.title}
                    </button>
                  )}
                  {editing !== c.id && (
                    <span className="mr-1 hidden shrink-0 items-center group-hover:flex">
                      <button aria-label={c.pinned ? 'Unpin' : 'Pin'} onClick={() => setStore((x) => ({ ...x, chats: x.chats.map((y) => (y.id === c.id ? { ...y, pinned: !y.pinned } : y)) }))} className="rounded-md p-1 text-moss hover:bg-cream">
                        {c.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                      </button>
                      <button aria-label="Rename" onClick={() => setEditing(c.id)} className="rounded-md p-1 text-moss hover:bg-cream">
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        aria-label="Delete chat"
                        onClick={() => {
                          setStore((x) => ({ ...x, chats: x.chats.filter((y) => y.id !== c.id) }))
                          if (c.id === active) onNew()
                        }}
                        className="rounded-md p-1 text-moss hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <p className="border-t border-line pt-2 text-[11px] text-moss">Saved on this device · {s.chats.filter((c) => (c.space ?? 'humo') === space).length} chats</p>
    </div>
  )
}

/** Speak instead of typing: browser speech recognition in the student's language (hidden where unsupported). */
function useDictation(lang: string, onText: (t: string) => void) {
  const Rec = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null
  const [on, setOn] = useState(false)
  const rec = useRef<any>(null)
  function toggle() {
    if (!Rec) return
    if (on) {
      rec.current?.stop()
      return
    }
    const r = new Rec()
    r.lang = lang
    r.interimResults = false
    r.continuous = false
    r.onresult = (e: any) => onText(Array.from(e.results as ArrayLike<any>).map((x: any) => x[0].transcript).join(' '))
    r.onend = () => setOn(false)
    r.onerror = () => setOn(false)
    rec.current = r
    setOn(true)
    r.start()
  }
  return { supported: !!Rec, on, toggle }
}

function ChatPane({ id, initial, space }: { id: string; initial?: ChatMsg[]; space: Space }) {
  const s = useStore()
  const { user } = useAuth()
  const c = COPY[space]
  const context = studentContext(s, space === 'desmos' ? 'the Desmos Lab (photo questions)' : 'the Ask Humo page')
  const [hi] = useState(() => `${hello(user?.name?.split(' ')[0], s.settings.language)} ${c.greeting}`)
  const { msgs, busy, send, retry, stop } = useHumoChat(hi, context, { initial, onChange: (m) => saveChat(id, m, space), space })
  const [input, setInput] = useState('')
  const [pics, setPics] = useState<string[]>([])
  const [drag, setDrag] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const cam = useRef<HTMLInputElement>(null)
  const dictation = useDictation({ en: 'en-US', uz: 'uz-UZ', ru: 'ru-RU' }[s.settings.language] ?? 'en-US', (t) =>
    setInput((v) => (v.trim() ? `${v.trim()} ${t}` : t)),
  )

  async function addFiles(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 3 - pics.length)
    const urls = await Promise.all(
      list.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader()
            r.onload = () => res(String(r.result))
            r.readAsDataURL(f)
          }),
      ),
    )
    const small = await Promise.all(urls.map((u) => shrink(u, 1600, 0.85)))
    setPics((p) => [...p, ...small].slice(0, 3))
  }
  function submit() {
    if (!input.trim() && !pics.length) return
    send(input, pics)
    setInput('')
    setPics([])
    if (box.current) box.current.style.height = 'auto'
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        addFiles(e.dataTransfer.files)
      }}
    >
      <div className="card flex-1 overflow-y-auto bg-cream/40 p-4 sm:p-5">
        <HumoMessages msgs={msgs} busy={busy} onRetry={retry} />
        {msgs.length === 1 && (
          <>
            {space === 'desmos' && (
              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => file.current?.click()} className="mt-6 flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-[#2d70b3]/35 bg-[#2d70b3]/[0.04] px-6 py-10 text-center transition hover:border-[#2d70b3] hover:bg-[#2d70b3]/[0.07]">
                <span className="grid size-14 place-items-center rounded-2xl bg-[#2d70b3] text-white shadow-lg shadow-[#2d70b3]/30">
                  <ImagePlus className="size-7" />
                </span>
                <span className="mt-2 text-[16px] font-semibold text-pine">Upload a question photo</span>
                <span className="text-[13px] text-moss">Screenshot, phone photo or a page from a book · drag and drop or paste works too</span>
              </motion.button>
            )}
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {c.starters.map((t, i) => (
                <motion.button key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} onClick={() => send(t)} className="rounded-2xl border border-line bg-card px-4 py-3 text-left text-[13.5px] transition hover:-translate-y-0.5 hover:border-jg-500">
                  {t}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>
      <AnimatePresence>
        {drag && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-[24px] border-2 border-dashed border-[#2d70b3] bg-[#2d70b3]/10 text-[15px] font-semibold text-[#2d70b3]">
            Drop the question photo
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-3">
        <UsageLine feature={space} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="rounded-2xl border border-line bg-card p-1.5 focus-within:border-jg-500"
      >
        {pics.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2">
            {pics.map((p, i) => (
              <span key={i} className="relative">
                <img src={p} alt="" className="h-20 rounded-xl object-cover ring-1 ring-line" />
                <button type="button" aria-label="Remove photo" onClick={() => setPics((x) => x.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-pine text-cream">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <button type="button" aria-label="Add a photo" onClick={() => file.current?.click()} className={`grid size-11 shrink-0 place-items-center rounded-xl hover:bg-cream ${space === 'desmos' ? 'text-[#2d70b3]' : 'text-moss'}`}>
            <ImagePlus className="size-5" />
          </button>
          <button type="button" aria-label="Take a photo" onClick={() => cam.current?.click()} className="grid size-11 shrink-0 place-items-center rounded-xl text-moss hover:bg-cream sm:hidden">
            <Camera className="size-5" />
          </button>
          <textarea
            ref={box}
            rows={1}
            value={input}
            onPaste={(e) => {
              const f = [...e.clipboardData.files]
              if (f.length) {
                e.preventDefault()
                addFiles(f)
              }
            }}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(160, e.target.scrollHeight)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={c.placeholder}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-[14.5px] placeholder:text-moss/60 focus:outline-none"
          />
          {dictation.supported && (
            <button type="button" aria-label={dictation.on ? 'Stop listening' : 'Speak your question'} onClick={dictation.toggle} className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${dictation.on ? 'bg-jg-500 text-white' : 'text-moss hover:bg-cream'}`}>
              {dictation.on && <span className="absolute inset-0 animate-ping rounded-xl bg-jg-500/40" />}
              <Mic className="relative size-5" />
            </button>
          )}
          {busy ? (
            <button type="button" aria-label="Stop" onClick={stop} className="grid size-11 place-items-center rounded-xl bg-jg-500 text-white">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button aria-label="Send" disabled={!input.trim() && !pics.length} className={`grid size-11 place-items-center rounded-xl text-cream disabled:opacity-40 ${space === 'desmos' ? 'bg-[#2d70b3]' : 'bg-pine'}`}>
              <Send className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default function HumoChat({ space = 'humo' }: { space?: Space }) {
  const c = COPY[space]
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const fresh = useMemo(() => uid(), [])
  const [newId, setNewId] = useState(fresh)
  const active = params.get('c') || newId
  const chat = s.chats.find((c) => c.id === active)
  const [drawer, setDrawer] = useState(false)

  const pick = (id: string) => {
    setParams({ c: id })
    setDrawer(false)
  }
  const startNew = () => {
    const id = uid()
    setNewId(id)
    setParams({})
    setDrawer(false)
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-13rem)] max-w-6xl gap-5 md:h-[calc(100svh-8rem)]">
      <aside className="hidden w-64 shrink-0 lg:block">
        <HistoryList active={active} onPick={pick} onNew={startNew} space={space} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 pb-4">
          {space === 'desmos' ? <span className="grid size-11 place-items-center rounded-2xl bg-[#2d70b3] font-serif text-[22px] font-bold text-white">D</span> : <img src="/brand/humo-mark.svg" alt="" className="size-11 rounded-2xl" />}
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-[26px] leading-none">{chat?.title ?? c.title}</h1>
            <p className="mt-1 hidden text-[12.5px] text-moss sm:block">{c.sub}</p>
          </div>
          <button onClick={() => setDrawer(true)} className="btn btn-ghost h-10 px-3 text-[13px] lg:hidden">
            <History className="size-4" /> History
          </button>
          <button onClick={startNew} aria-label="New chat" className="btn btn-ghost h-10 px-3 text-[13px] lg:hidden">
            <MessageSquarePlus className="size-4" />
          </button>
        </div>
        <ChatPane key={active} id={active} initial={chat?.msgs} space={space} />
      </div>
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-pine/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed inset-y-0 left-0 z-50 w-[82%] max-w-xs bg-cream p-4 lg:hidden">
              <button onClick={() => setDrawer(false)} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-moss">
                <X className="size-5" />
              </button>
              <p className="mb-3 text-[15px] font-semibold">Chat history</p>
              <div className="h-[calc(100%-2.5rem)]">
                <HistoryList active={active} onPick={pick} onNew={startNew} space={space} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
