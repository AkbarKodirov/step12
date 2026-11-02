import { useCallback, useEffect, useState } from 'react'
import type { DesmosScreen as DesmosScreenData } from '../../shared/desmos-render.js'

/* ---------------- types ---------------- */

export type TestMeta = { id: string; name: string; type: 'EBRW' | 'MATH'; modules: number; questions: number; minutesPerModule: number }
export type TestQuestion = {
  passage: string | null
  passageImage: string | null
  image: string | null
  question: string
  format: 'mc' | 'sa'
  options: string[]
  correct: number | null
  answer: string | null
}
/** `title` and `minutes` are optional per-module overrides (used by exam papers, e.g. paper-SAT sections). */
export type Test = { id: string; name: string; type: 'EBRW' | 'MATH'; description: string; modules: { title?: string; minutes?: number; questions: TestQuestion[] }[] }

export type Mode = 'exam' | 'practice' | 'sprint'

export type AttemptAnswer = { module: number; index: number; value: string | null; correct: boolean; seconds: number; flagged: boolean }
export type Attempt = {
  id: string
  testId: string
  testName: string
  type: 'EBRW' | 'MATH'
  mode: Mode
  startedAt: number
  finishedAt: number
  answers: AttemptAnswer[]
  raw: number
  total: number
  scaled: number
}

export type VocabProgress = { ease: number; interval: number; reps: number; due: number; seen: number; correct: number }

export type Profile = {
  target: number
  current: number | null
  testDate: string | null
  aim?: string
  level?: 'new' | 'some' | 'retake'
  rw?: number | null
  math?: number | null
  studyDays?: number[] // 0 = Monday … 6 = Sunday
  minutesPerDay?: number
  studyTime?: string // "18:00"
  focus?: string[]
}

export type PlanKind = 'drill-rw' | 'drill-math' | 'skill' | 'vocab' | 'mistakes' | 'lesson' | 'blitz' | 'test' | 'review' | 'desmos' | 'custom'
export type PlanTask = { id: string; kind: PlanKind; title: string; min: number; skill?: string }
export type WeekPlan = { days: PlanTask[][] }

export type ChatMsg = { role: 'user' | 'humo'; text: string; desmos?: DesmosScreenData[]; plan?: WeekPlan | null; at?: number; images?: string[]; error?: boolean }
export type Chat = { id: string; title: string; createdAt: number; updatedAt: number; pinned?: boolean; space?: 'humo' | 'desmos'; msgs: ChatMsg[] }

export type Highlight = { start: number; end: number; color: 'yellow' | 'blue' | 'pink' | 'underline'; note?: string }
export type Session = { at: number; seconds: number; kind: string; subject?: 'EBRW' | 'MATH' }
export type Settings = { language: 'en' | 'uz' | 'ru'; humoStyle: 'hint' | 'full'; dailyGoal: number; reminders: boolean; sounds: boolean; desmosFirst: boolean; theme: 'system' | 'light' | 'dark' }

/* Question bank */
export type BankQ = TestQuestion & {
  id: string
  set: string
  setName: string
  section: 'EBRW' | 'MATH'
  domain: string
  skill: Skill
  difficulty: 'Easy' | 'Medium' | 'Hard'
  challenge?: boolean
  topic?: string
  explanation?: string
  bankId?: string
  solution?: { hints: string[]; desmos: string[]; look_for: string; why: string; trap: string; rule: string; topic: string }
}
export type BankProgress = { tries: number; correct: boolean; chosen: string | null; at: number; seconds: number }
export type Collection = { id: string; name: string; keys: string[]; createdAt: number }

type State = {
  profile: Profile
  attempts: Attempt[]
  vocab: Record<string, VocabProgress>
  activeDays: string[] // yyyy-mm-dd
  studySeconds: number
  practice: { solved: number; correct: number }
  blitzBest: number
  mistakes: { key: string; testId: string; module: number; index: number; addedAt: number; cleared: boolean; bankId?: string }[]
  customWords: CustomWord[]
  saved: { key: string; testId: string; module: number; index: number; at: number; bankId?: string }[]
  weakSkills: string[]
  planDone: Record<string, boolean>
  drills: { at: number; subject: 'EBRW' | 'MATH'; n: number; correct: number; seconds: number }[]
  onboarded: boolean
  plan: WeekPlan | null
  chats: Chat[]
  highlights: Record<string, Highlight[]>
  sessions: Session[]
  settings: Settings
  desmosLab: Record<string, { tries: number; solved: boolean; at: number }>
  qbank: Record<string, BankProgress>
  notes: Record<string, string>
  collections: Collection[]
  lessonsDone: Record<string, number>
  updatedAt?: number
}
export type CustomWord = { word: string; pos: 'adj' | 'verb' | 'noun' | 'adv'; def: string; ex: string; syn: string[]; level: 'mine'; addedAt: number }

const initial: State = {
  profile: { target: 1450, current: null, testDate: null },
  attempts: [],
  vocab: {},
  activeDays: [],
  studySeconds: 0,
  practice: { solved: 0, correct: 0 },
  blitzBest: 0,
  mistakes: [],
  customWords: [],
  saved: [],
  weakSkills: [],
  planDone: {},
  drills: [],
  onboarded: false,
  plan: null,
  chats: [],
  highlights: {},
  sessions: [],
  settings: { language: 'en', humoStyle: 'hint', dailyGoal: 20, reminders: true, sounds: false, desmosFirst: true, theme: 'system' },
  desmosLab: {},
  qbank: {},
  notes: {},
  collections: [],
  lessonsDone: {},
}

/* ---------------- tiny global store (per user, localStorage) ---------------- */

let uid = 'guest'
let state: State = initial
const listeners = new Set<() => void>()
// Progress is keyed by the account EMAIL, so the same student always finds their data again —
// even if the server forgot their account id.
const keyFor = (id: string) => `step12.progress.${id}`
/** Progress saved before the STEP12 rebrand used this prefix; it is moved over on first load. */
const oldKeyFor = (id: string) => `jamals.progress.${id}`

function hydrate(saved: Partial<State> | null): State {
  // returning students who already used the app skip onboarding
  return saved
    ? { ...initial, onboarded: !!(saved.attempts?.length || saved.drills?.length || saved.chats?.length || saved.plan), ...saved, highlights: {}, settings: { ...initial.settings, ...saved.settings }, profile: { ...initial.profile, ...saved.profile } }  // highlights are session-only now (src/app/highlights.ts): old saved ones are dropped
    : initial
}

/** Older builds saved progress under a random account id. Find it once and move it to the email key. */
function legacy(oldId?: string): string | null {
  try {
    if (oldId) {
      const raw = localStorage.getItem(keyFor(oldId)) ?? localStorage.getItem(oldKeyFor(oldId))
      if (raw) return raw
    }
    let best: string | null = null
    let bestAt = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      if (!(k.startsWith('step12.progress.') || k.startsWith('jamals.progress.')) || k.includes('@')) continue
      const raw = localStorage.getItem(k)!
      const j = JSON.parse(raw)
      const at = Math.max(j.updatedAt ?? 0, ...(j.chats ?? []).map((c: Chat) => c.updatedAt), ...(j.attempts ?? []).map((a: Attempt) => a.finishedAt), ...(j.sessions ?? []).map((x: Session) => x.at), 0)
      if (at >= bestAt) {
        best = raw
        bestAt = at
      }
    }
    return best
  } catch {
    return null
  }
}

function load(key: string, oldId?: string) {
  uid = key
  try {
    let raw = localStorage.getItem(keyFor(key))
    if (!raw) {
      raw = localStorage.getItem(oldKeyFor(key)) ?? legacy(oldId)
      if (raw) localStorage.setItem(keyFor(key), raw)
    }
    state = hydrate(raw ? JSON.parse(raw) : null)
  } catch {
    state = initial
  }
  listeners.forEach((l) => l())
}

function save() {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(state))
  } catch {
    /* storage full or blocked */
  }
}

export function setStore(fn: (s: State) => State) {
  state = { ...fn(state), updatedAt: Date.now() }
  save()
  listeners.forEach((l) => l())
  scheduleSync()
}

export function useStore() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return state
}

/** Loads this user's saved progress synchronously, before anything reads the store. */
export function useBindStore(user: { id: string; email: string } | null | undefined) {
  const key = user?.email?.trim().toLowerCase()
  if (key && key !== uid) load(key, user!.id)
}

/* ---------------- cloud sync: progress follows the student to any device ---------------- */
let token: string | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let syncing = false

/** What goes to the server: everything except photo bytes in chats (those stay on this device). */
function forCloud(s: State) {
  return { ...s, chats: s.chats.map((c) => ({ ...c, msgs: c.msgs.map((m) => (m.images?.length ? { ...m, images: undefined, text: `${m.text}${m.text ? ' ' : ''}[photo]` } : m)) })) }
}

async function push() {
  if (!token || token === 'google-offline' || token === 'demo' || syncing) return
  syncing = true
  try {
    const res = await fetch('/api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ data: forCloud(state), updatedAt: state.updatedAt ?? Date.now() }) })
    if (res.status === 409) {
      const j = await res.json()
      if (j.progress) replaceFromCloud(j.progress)
    }
  } catch {
    /* offline — try again on the next change */
  } finally {
    syncing = false
  }
}
function scheduleSync() {
  if (!token) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(push, 4000)
}
function replaceFromCloud(data: Partial<State>) {
  // keep photos that only exist on this device
  const local = new Map(state.chats.map((c) => [c.id, c]))
  const chats = (data.chats ?? []).map((c) => {
    const l = local.get(c.id)
    return l && l.msgs.length === c.msgs.length ? { ...c, msgs: c.msgs.map((m, i) => (l.msgs[i].images ? { ...m, images: l.msgs[i].images, text: l.msgs[i].text } : m)) } : c
  })
  state = hydrate({ ...data, chats })
  save()
  listeners.forEach((l) => l())
}

/** Called once per sign-in: pull the newer copy (server or this device) and keep them in step. */
export async function startSync(t: string | null) {
  token = t
  if (!t || t === 'google-offline' || t === 'demo') return
  try {
    const res = await fetch('/api/progress', { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) return
    const j = (await res.json()) as { progress: Partial<State> | null; updatedAt: number }
    const localAt = state.updatedAt ?? 0
    if (j.progress && j.updatedAt > localAt) replaceFromCloud(j.progress)
    else if (!j.progress || localAt > j.updatedAt) push()
  } catch {
    /* offline: local data keeps working */
  }
}

/* ---------------- helpers ---------------- */

export const today = () => new Date().toISOString().slice(0, 10)

export function markActive(seconds = 0, kind = 'practice', subject?: 'EBRW' | 'MATH') {
  setStore((s) => ({
    ...s,
    activeDays: s.activeDays.includes(today()) ? s.activeDays : [...s.activeDays, today()].slice(-400),
    studySeconds: s.studySeconds + seconds,
    sessions: seconds > 0 ? [...s.sessions, { at: Date.now(), seconds, kind, subject }].slice(-3000) : s.sessions,
  }))
}

/** Read the whole store once (for export / Sensai context). */
export const getStore = () => state
export function resetStore() {
  setStore(() => ({ ...initial }))
}

export function streak(days: string[]) {
  const set = new Set(days)
  let n = 0
  const d = new Date()
  // today not done yet doesn't break the streak
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (set.has(d.toISOString().slice(0, 10))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

/** Approximate Digital SAT section scale (200–800) from raw percentage. Practice estimate only. */
export function scaleSection(raw: number, total: number) {
  if (!total) return 200
  const p = raw / total
  // gentle S-curve that matches typical published conversions within ~30 points
  const curved = p < 0.5 ? p * 0.92 : 0.46 + (p - 0.5) * 1.08
  return Math.max(200, Math.min(800, Math.round((200 + curved * 600) / 10) * 10))
}

export function isCorrect(q: TestQuestion, value: string | null) {
  if (value == null || value === '') return false
  if (q.format === 'mc') return Number(value) === q.correct
  const norm = (s: string) => s.replace(/\s/g, '').replace(/^\+/, '')
  const toNum = (s: string) => {
    const t = norm(s)
    if (/^-?\d+\/\d+$/.test(t)) {
      const [a, b] = t.split('/').map(Number)
      return b ? a / b : NaN
    }
    return Number(t)
  }
  const accepted = (q.answer || '').split(/[|,;]| or /).map((a) => a.trim()).filter(Boolean)
  return accepted.some((a) => norm(a) === norm(value) || Math.abs(toNum(a) - toNum(value)) < 1e-4)
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    run()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e.message || e)))
    return () => {
      alive = false
    }
  }, [run])
  return { data, error }
}

const testCache = new Map<string, Promise<Test>>()
export function loadTest(id: string) {
  if (!testCache.has(id)) testCache.set(id, fetch(`/tests/${id}.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('Test not found')))))
  return testCache.get(id)!
}
let bankP: Promise<BankQ[]> | null = null
/** The whole Question Bank (STEP12's own sets + the Desmos collection), loaded once. */
export const loadBank = (): Promise<BankQ[]> => (bankP ??= fetch('/bank/bank.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('Question bank unavailable')))))

/** Saved / mistake entries point at either a test question or a bank question. */
export type QRef = { key: string; testId: string; module: number; index: number; bankId?: string }
export type Resolved = { q: TestQuestion; section: 'EBRW' | 'MATH'; source: string; skill: Skill; topic?: string; difficulty: string; bank?: BankQ }
export async function resolveRef(r: QRef): Promise<Resolved | null> {
  if (r.bankId) {
    const b = (await loadBank()).find((x) => x.id === r.bankId)
    return b ? { q: b, section: b.section, source: b.setName, skill: b.skill, topic: b.topic, difficulty: b.difficulty, bank: b } : null
  }
  const t = await loadTest(r.testId).catch(() => null)
  const q = t?.modules[r.module]?.questions[r.index]
  return t && q ? { q, section: t.type, source: `${t.name} · M${r.module + 1} Q${r.index + 1}`, skill: skillOf(q, t.type), difficulty: 'Test', bank: undefined } : null
}

/** Records a Question Bank answer: progress, activity, and the mistakes log. */
export function recordBank(b: BankQ, chosen: string, correct: boolean, seconds: number) {
  const key = `bank:${b.id}`
  setStore((s) => ({
    ...s,
    qbank: { ...s.qbank, [b.id]: { tries: (s.qbank[b.id]?.tries ?? 0) + 1, correct, chosen, at: Date.now(), seconds } },
    mistakes: correct
      ? s.mistakes.map((m) => (m.key === key ? { ...m, cleared: true } : m))
      : s.mistakes.some((m) => m.key === key && !m.cleared)
        ? s.mistakes
        : [...s.mistakes.filter((m) => m.key !== key), { key, testId: 'bank', module: 0, index: 0, bankId: b.id, addedAt: Date.now(), cleared: false }],
    practice: { solved: s.practice.solved + 1, correct: s.practice.correct + (correct ? 1 : 0) },
  }))
  markActive(seconds, 'practice', b.section)
}

export function toggleSavedBank(id: string) {
  const key = `bank:${id}`
  setStore((s) => ({ ...s, saved: s.saved.some((x) => x.key === key) ? s.saved.filter((x) => x.key !== key) : [{ key, testId: 'bank', module: 0, index: 0, bankId: id, at: Date.now() }, ...s.saved] }))
}

export const loadIndex = () => fetch('/tests/index.json', { cache: 'no-cache' }).then((r) => r.json() as Promise<TestMeta[]>)

export const stripHtml = (h: string | null) => (h || '').replace(/<li>/g, '\n• ').replace(/<[^>]+>/g, ' ').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim()

export function toggleSaved(testId: string, module: number, index: number) {
  const key = `${testId}:${module}:${index}`
  setStore((s) => ({ ...s, saved: s.saved.some((x) => x.key === key) ? s.saved.filter((x) => x.key !== key) : [{ key, testId, module, index, at: Date.now() }, ...s.saved] }))
}

/* ---------- Digital SAT skill from the question's own wording ---------- */
export const SKILLS = [
  'Standard English conventions',
  'Words in context',
  'Transitions',
  'Rhetorical synthesis',
  'Command of evidence',
  'Central ideas & details',
  'Text structure & purpose',
  'Inferences',
  'Algebra',
  'Advanced math',
  'Geometry & trigonometry',
  'Problem solving & data',
] as const
export type Skill = (typeof SKILLS)[number]

export function skillOf(q: TestQuestion, type: 'EBRW' | 'MATH'): Skill {
  const t = q.question.toLowerCase()
  if (type === 'MATH') {
    if (/\b(angles?|triangles?|circles?|radius|parallel|transversal|perimeter|area|volume|sin|cos|tan|polygons?|rays?|diameter|arc|chord|hypotenuse|rectangle|square|cylinder|cone|sphere|cube)\b|°/.test(t)) return 'Geometry & trigonometry'
    if (/scatterplot|percent|%|\bmean\b|median|probability|data set|line of best fit|survey|sample|\brate\b|ratio|standard deviation|margin of error|table/.test(t)) return 'Problem solving & data'
    if (/x²|\^2|quadratic|exponential|f\(x\)|polynomial|root|parabola|\(.*\)²/.test(t)) return 'Advanced math'
    return 'Algebra'
  }
  if (t.includes('conventions of standard english')) return 'Standard English conventions'
  if (t.includes('logical and precise word')) return 'Words in context'
  if (t.includes('logical transition')) return 'Transitions'
  if (t.includes('relevant information from the notes') || t.includes("student's goal") || t.includes('student wants')) return 'Rhetorical synthesis'
  if (/support|weaken|undermine|illustrate|data from the (table|graph)|quotation/.test(t)) return 'Command of evidence'
  if (/main idea|according to the text|based on the text/.test(t)) return 'Central ideas & details'
  if (/function of the underlined|overall structure|main purpose|cross-text|text 2/.test(t)) return 'Text structure & purpose'
  if (/most logically completes|suggests/.test(t)) return 'Inferences'
  return 'Central ideas & details'
}

export type SkillStat = { skill: Skill; right: number; total: number }
export function skillBreakdown(rows: { q: TestQuestion; type: 'EBRW' | 'MATH'; correct: boolean }[]): SkillStat[] {
  const m = new Map<Skill, SkillStat>()
  for (const r of rows) {
    const k = skillOf(r.q, r.type)
    const s = m.get(k) ?? { skill: k, right: 0, total: 0 }
    s.total++
    if (r.correct) s.right++
    m.set(k, s)
  }
  return [...m.values()].sort((a, b) => a.right / a.total - b.right / b.total)
}
