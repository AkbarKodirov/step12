import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, Check, FolderPlus, Play, Plus, StickyNote, Trash2, X } from 'lucide-react'
import { plainMath, resolveRef, setStore, stripHtml, useStore, type QRef, type Resolved } from '../store'
import { refOf } from '../practice/Runner'
import { EmptyState } from '../components/EmptyState'
import { HumoDrawer } from '../components/HumoDrawer'
import { studentContext } from '../humoContext'
import { uid } from '../plan'

type Row = { ref: QRef; r: Resolved | null; at: number }
const TABS = [
  ['saved', 'Saved questions'],
  ['mistakes', 'Mistakes log'],
  ['notes', 'Notes'],
  ['collections', 'Collections'],
] as const
type TabId = (typeof TABS)[number][0]

function useRows(refs: (QRef & { at: number })[]) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const sig = refs.map((r) => r.key).join(',')
  useEffect(() => {
    let alive = true
    Promise.all(refs.map(async (ref) => ({ ref, r: await resolveRef(ref), at: ref.at }))).then((x) => alive && setRows(x))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
  return rows
}

function CollectionMenu({ k, onClose }: { k: string; onClose: () => void }) {
  const s = useStore()
  const [name, setName] = useState('')
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-10 z-20 w-64 rounded-2xl border border-line bg-card p-2 shadow-xl">
      {s.collections.map((c) => {
        const on = c.keys.includes(k)
        return (
          <button key={c.id} onClick={() => setStore((x) => ({ ...x, collections: x.collections.map((y) => (y.id === c.id ? { ...y, keys: on ? y.keys.filter((z) => z !== k) : [...y.keys, k] } : y)) }))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-cream">
            <span className={`grid size-4 place-items-center rounded border ${on ? 'border-pine bg-pine text-cream' : 'border-line-strong'}`}>{on && <Check className="size-3" />}</span>
            <span className="flex-1 truncate">{c.name}</span>
            <span className="text-[11px] text-moss">{c.keys.length}</span>
          </button>
        )
      })}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          setStore((x) => ({ ...x, collections: [...x.collections, { id: uid(), name: name.trim().slice(0, 40), keys: [k], createdAt: Date.now() }] }))
          setName('')
          onClose()
        }}
        className="mt-1 flex gap-1 border-t border-line pt-2"
      >
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection…" className="min-w-0 flex-1 rounded-lg bg-cream px-2.5 py-1.5 text-[12.5px] focus:outline-none" />
        <button className="grid size-8 place-items-center rounded-lg bg-pine text-cream">
          <Plus className="size-4" />
        </button>
      </form>
    </motion.div>
  )
}

function RowCard({ row, i, onOpen, tab }: { row: Row; i: number; onOpen: () => void; tab: TabId }) {
  const s = useStore()
  const [menu, setMenu] = useState(false)
  const { r, ref } = row
  if (!r) return null
  const p = ref.bankId ? s.qbank[ref.bankId] : null
  const mistake = s.mistakes.find((m) => m.key === ref.key)
  const status = p ? (p.correct ? 'Correct' : 'Incorrect') : mistake ? (mistake.cleared ? 'Fixed' : 'Incorrect') : null
  const saved = s.saved.some((x) => x.key === ref.key)
  const stem = plainMath(r.q.question) || stripHtml(r.q.passage).slice(0, 160) || 'Question with a figure'
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: Math.min(i, 12) * 0.03 }} onClick={onOpen} className="group relative cursor-pointer border-b border-line px-5 py-4 last:border-b-0 hover:bg-cream/40">
      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium">
        <span className="rounded-md bg-cream px-2 py-0.5">{r.section === 'MATH' ? 'Math' : 'Reading & Writing'}</span>
        {r.difficulty !== 'Test' && <span className={`rounded-md px-2 py-0.5 ${r.difficulty === 'Hard' ? 'bg-rose-50 text-rose-700' : r.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{r.difficulty}</span>}
        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-violet-700">{r.topic ?? r.skill}</span>
        {saved && (
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-orange-700">
            <Bookmark className="size-3 fill-current" /> Saved
          </span>
        )}
        {status && <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${status === 'Incorrect' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{status === 'Incorrect' ? <X className="size-3" /> : <Check className="size-3" />} {status}</span>}
        {s.notes[ref.key] && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-amber-700">
            <StickyNote className="size-3" /> Note
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 pr-20 text-[14.5px]">{stem}</p>
      {tab === 'notes' && s.notes[ref.key] && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{s.notes[ref.key]}</p>}
      <p className="mt-1 text-[11.5px] text-moss">{r.source}</p>
      <div className="absolute right-4 top-4 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button aria-label="Add to collection" onClick={() => setMenu((m) => !m)} className="grid size-8 place-items-center rounded-lg text-moss hover:bg-card">
            <FolderPlus className="size-4" />
          </button>
          <AnimatePresence>{menu && <CollectionMenu k={ref.key} onClose={() => setMenu(false)} />}</AnimatePresence>
        </div>
        {tab === 'saved' && (
          <button aria-label="Unsave" onClick={() => setStore((x) => ({ ...x, saved: x.saved.filter((y) => y.key !== ref.key) }))} className="grid size-8 place-items-center rounded-lg text-orange-500 hover:bg-card">
            <Bookmark className="size-4 fill-current" />
          </button>
        )}
        {tab === 'mistakes' && (
          <button aria-label="Remove from log" onClick={() => setStore((x) => ({ ...x, mistakes: x.mistakes.filter((y) => y.key !== ref.key) }))} className="grid size-8 place-items-center rounded-lg text-moss hover:bg-card hover:text-red-600">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </motion.li>
  )
}

export default function Mistakes() {
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as TabId) || 'saved'
  const [sec, setSec] = useState<'' | 'EBRW' | 'MATH'>('')
  const [diff, setDiff] = useState('')
  const [showFixed, setShowFixed] = useState(false)
  const [coll, setColl] = useState<string | null>(null)
  const [humo, setHumo] = useState(false)
  const nav = useNavigate()

  const refs = useMemo(() => {
    if (tab === 'saved') return s.saved.map((x) => ({ ...(x.bankId ? refOf(x.key) : { key: x.key, testId: x.testId, module: x.module, index: x.index }), at: x.at }))
    if (tab === 'mistakes')
      return s.mistakes
        .filter((m) => showFixed || !m.cleared)
        .slice()
        .reverse()
        .map((m) => ({ ...(m.bankId ? refOf(m.key) : { key: m.key, testId: m.testId, module: m.module, index: m.index }), at: m.addedAt }))
    if (tab === 'notes') return Object.keys(s.notes).map((k) => ({ ...refOf(k), at: 0 }))
    const c = s.collections.find((x) => x.id === coll)
    return c ? c.keys.map((k) => ({ ...refOf(k), at: 0 })) : []
  }, [tab, s.saved, s.mistakes, s.notes, s.collections, coll, showFixed])
  const rows = useRows(refs)
  const shown = (rows ?? []).filter((r) => r.r && (!sec || r.r.section === sec) && (!diff || r.r.difficulty === diff))
  const runUrl = (start = 0) => `/app/practice/run?keys=${shown.map((r) => r.ref.key).join(',')}&start=${start}&back=${encodeURIComponent(`/app/mistakes?tab=${tab}`)}`
  const counts = { saved: s.saved.length, mistakes: s.mistakes.filter((m) => !m.cleared).length, notes: Object.keys(s.notes).length, collections: s.collections.length }

  const mistakeSkills = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) if (r.r && tab === 'mistakes') m.set(r.r.skill, (m.get(r.r.skill) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows, tab])

  return (
    <div>
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Saved & mistakes</h1>
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setParams({ tab: k })} className={`relative shrink-0 px-4 pb-3 pt-1 text-[14px] font-medium ${tab === k ? 'text-pine' : 'text-moss hover:text-pine'}`}>
            {l} <span className="ml-1 rounded-md bg-cream px-1.5 py-0.5 text-[11px] tabular-nums">{counts[k]}</span>
            {tab === k && <motion.span layoutId="mtab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-pine" />}
          </button>
        ))}
      </div>

      {tab === 'collections' && !coll ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.collections.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState title="No collections yet" body="Group questions your way — “Hard transitions”, “Circles”, “Before test day”. Use the folder button on any saved question or mistake." action={{ to: '/app/mistakes?tab=saved', label: 'Go to saved questions' }} />
            </div>
          )}
          {s.collections.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card card-hover flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                  <FolderPlus className="size-5" />
                </span>
                <button aria-label="Delete collection" onClick={() => setStore((x) => ({ ...x, collections: x.collections.filter((y) => y.id !== c.id) }))} className="rounded-lg p-1.5 text-moss hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-3 text-[16px] font-semibold">{c.name}</p>
              <p className="text-[12.5px] text-moss">{c.keys.length} questions</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setColl(c.id)} className="btn btn-ghost h-9 flex-1 text-[13px]">
                  Open
                </button>
                {c.keys.length > 0 && (
                  <Link to={`/app/practice/run?keys=${c.keys.join(',')}&back=${encodeURIComponent('/app/mistakes?tab=collections')}`} className="btn btn-dark h-9 flex-1 text-[13px]">
                    <Play className="size-3.5" /> Practice
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {coll && (
              <button onClick={() => setColl(null)} className="rounded-full bg-cream px-3.5 py-1.5 text-[13px]">
                ← Collections
              </button>
            )}
            <select value={sec} onChange={(e) => setSec(e.target.value as typeof sec)} className="rounded-full bg-card px-3.5 py-1.5 text-[13px] ring-1 ring-line focus:outline-none">
              <option value="">Both sections</option>
              <option value="EBRW">Reading & Writing</option>
              <option value="MATH">Math</option>
            </select>
            <select value={diff} onChange={(e) => setDiff(e.target.value)} className="rounded-full bg-card px-3.5 py-1.5 text-[13px] ring-1 ring-line focus:outline-none">
              <option value="">All difficulties</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
            {tab === 'mistakes' && (
              <label className="flex items-center gap-2 text-[13px] text-moss">
                <input type="checkbox" checked={showFixed} onChange={(e) => setShowFixed(e.target.checked)} className="accent-[#0b1d36]" /> Show fixed
              </label>
            )}
            <span className="ml-auto flex gap-2">
              {tab === 'mistakes' && shown.length > 0 && (
                <button onClick={() => setHumo(true)} className="btn btn-ghost h-10 px-4 text-[13px]">
                  <img src="/brand/humo-mark.svg" alt="" className="size-5 rounded-md" /> Find my patterns
                </button>
              )}
              {shown.length > 0 && (
                <Link to={runUrl()} className="btn btn-dark h-10 px-4 text-[13px]">
                  <Play className="size-4" /> {tab === 'mistakes' ? 'Retry' : 'Practice'} all {shown.length}
                </Link>
              )}
            </span>
          </div>
          {tab === 'mistakes' && mistakeSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {mistakeSkills.slice(0, 6).map(([k, n]) => (
                <span key={k} className="rounded-full bg-red-50 px-2.5 py-1 text-[12px] text-red-700">
                  {k} · {n}
                </span>
              ))}
            </div>
          )}
          {!rows ? (
            <div className="skeleton mt-4 h-60 rounded-[24px]" />
          ) : shown.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title={tab === 'saved' ? 'No saved questions yet' : tab === 'mistakes' ? 'No mistakes to fix' : tab === 'notes' ? 'No notes yet' : 'This collection is empty'}
                body={tab === 'saved' ? 'Tap Save on any question in the Question Bank or a test review.' : tab === 'mistakes' ? 'Every question you miss in tests or the Question Bank lands here until you get it right.' : tab === 'notes' ? 'Use the Note button on any question to write down the trick you want to remember.' : 'Add questions with the folder button.'}
                action={{ to: '/app/practice', label: 'Open the Question Bank' }}
              />
            </div>
          ) : (
            <ul className="card mt-4 overflow-hidden">
              <AnimatePresence initial={false}>
                {shown.map((row, i) => (
                  <RowCard key={row.ref.key} row={row} i={i} tab={tab} onOpen={() => nav(runUrl(i))} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}
      <HumoDrawer
        open={humo}
        onClose={() => setHumo(false)}
        context={`${studentContext(s, 'their mistakes log')}\n\nOPEN MISTAKES BY SKILL: ${mistakeSkills.map(([k, n]) => `${k} ×${n}`).join(', ')}\nSAMPLE OF MISSED QUESTIONS:\n${shown
          .slice(0, 8)
          .map((r) => `- [${r.r?.skill}] ${(r.r?.q.question || stripHtml(r.r?.q.passage ?? '')).slice(0, 160)}`)
          .join('\n')}`}
        greeting="I've looked through your mistakes log. Want me to name the patterns and give you a fix for each?"
        suggestions={['What patterns do you see?', 'Which mistake costs me the most points?', 'Make me a 20-minute fix plan']}
        subtitle="Reading your mistakes"
      />
    </div>
  )
}
