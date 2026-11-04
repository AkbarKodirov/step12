import { getStore, stripHtml, type ChatMsg, type Profile, type TestQuestion, type WeekPlan } from './store'
import type { DesmosScreen } from '../../shared/desmos-render.js'
import { markLimit, noteUse, refreshAccount } from './account'

export type { ChatMsg }

export class HumoOffline extends Error {}
/** The Free plan's daily question is used up (or the feature is Pro only). */
export class HumoLimit extends Error {
  constructor(message: string, public feature: 'humo' | 'desmos' | 'pro', public resetAt?: number) {
    super(message)
  }
}

async function call<T>(url: string, body: unknown, token: string | null): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  } catch {
    throw new HumoOffline('Humo can’t be reached right now. Check your internet connection and try again in a moment.')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 503) throw new HumoOffline(data.error || 'Humo needs a Gemini API key.')
  if (res.status === 402) throw limitError(data)
  if (!res.ok) throw new Error(data.error || 'Humo could not answer. Try again.')
  return data as T
}

function limitError(data: { error?: string; feature?: 'humo' | 'desmos'; resetAt?: number; code?: string }) {
  const f = data.code === 'limit' ? (data.feature ?? 'humo') : 'pro'
  if (f !== 'pro') markLimit(f)
  return new HumoLimit(data.error || 'This is part of Humo Pro.', f, data.resetAt)
}

export type HumoAnswer = { reply: string; desmos?: DesmosScreen[]; plan?: WeekPlan | null }

/** Ask Humo. With `onText`, the reply streams in: `onText` gets the text written so far, then the checked answer resolves. */
/** Thrown when the student presses Stop; carries what Humo had written so far. */
export class HumoStopped extends Error {
  constructor(public partial: string) {
    super('stopped')
  }
}

export async function askHumo(messages: ChatMsg[], token: string | null, context?: string, space?: 'humo' | 'desmos', onText?: (text: string) => void, signal?: AbortSignal): Promise<HumoAnswer> {
  // text and the latest question photos go to the model; Desmos screens, plans and error notes stay on this device
  let photos = 0
  const slim = messages
    .filter((m) => !m.error)
    .slice(-14)
    .reverse()
    .map((m) => {
      const keep = !!m.images?.length && photos++ < 2
      return { role: m.role, text: m.text, ...(keep ? { images: m.images } : m.images?.length ? { text: `${m.text} [photo of a question sent earlier]`.trim() } : {}) }
    })
    .reverse()
  // the last two weeks of question-bank answers (ids only): the server turns them into per-skill accuracy for Humo
  const since = Date.now() - 14 * 86400000
  const recent = Object.entries(getStore().qbank)
    .filter(([, v]) => v.at >= since)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, 200)
    .map(([id, v]) => [id, v.correct ? 1 : 0])
  const body = { messages: slim, context, space, recent }
  if (!onText) return call<HumoAnswer>('/api/chat', body, token).finally(() => refreshAccount())
  let res: Response
  try {
    res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...body, stream: true }), signal })
  } catch {
    if (signal?.aborted) throw new HumoStopped('')
    throw new HumoOffline('Humo can’t be reached right now. Check your internet connection and try again in a moment.')
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}))
    if (res.status === 503) throw new HumoOffline(data.error || 'Humo needs a Gemini API key.')
    if (res.status === 402) throw limitError(data)
    if (res.status === 401) throw new Error('Your session has expired. Log out and log in again to chat with Humo.')
    throw new Error(data.error || 'Humo could not answer. Try again.')
  }
  noteUse(space === 'desmos' ? 'desmos' : 'humo')
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  let text = ''
  for (;;) {
    let chunk: ReadableStreamReadResult<string>
    try {
      chunk = await reader.read()
    } catch (e) {
      if (signal?.aborted) throw new HumoStopped(text)
      throw e
    }
    const { value, done } = chunk
    if (done) break
    buf += value
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      const o = JSON.parse(line)
      if (o.error) throw new Error(o.error)
      if (o.done) return o as HumoAnswer
      if (o.status && !text) onText(`*${o.status}*`)
      if (o.reset) text = ''
      text += o.delta || ''
      if (o.delta) onText(text)
    }
  }
  throw new Error('Humo stopped mid-answer. Try again.')
}

/** What to show while a reply is still streaming: Desmos and plan blocks appear only once they are checked. */
export function streamingText(text: string) {
  const shown = text.replace(/```(desmos|plan)[\s\S]*?```/g, '').replace(/```(desmos|plan)[\s\S]*$/, '')
  const building = /```desmos/.test(text)
  return shown.replace(/\n{3,}/g, '\n\n').trim() + (building ? '\n\n*Building the Desmos screen…*' : '')
}

export type Similar = { passage: string; question: string; options: string[]; correct: number; explanation: string }
export function similarQuestion(q: TestQuestion, skill: string, section: string, token: string | null) {
  const p = questionPayload(q, null)
  return call<Similar>('/api/similar', { passage: p.passage, question: p.question, options: p.options, skill, section }, token)
}

export type DesmosSolve = { text: string; desmos: DesmosScreen[] }
const solves = new Map<string, Promise<DesmosSolve>>()
/** Humo's Desmos walkthrough + checked Desmos screen. Bank questions by id, any other question by payload. */
export function desmosSolve(body: { bankId: string } | ({ id: string } & ReturnType<typeof questionPayload>), token: string | null) {
  const key = 'bankId' in body ? body.bankId : body.id
  if (!solves.has(key)) {
    const p = call<DesmosSolve>('/api/desmos/solve', body, token)
    p.catch(() => solves.delete(key))
    solves.set(key, p)
  }
  return solves.get(key)!
}

export function editPlan(plan: WeekPlan, profile: Profile, instruction: string, token: string | null) {
  return call<{ plan: WeekPlan; note: string }>('/api/plan', { plan, profile, instruction }, token)
}

export function questionPayload(q: TestQuestion, chosen: string | null) {
  const letters = ['A', 'B', 'C', 'D']
  return {
    passage: stripHtml(q.passage),
    question: q.question,
    options: q.options.map((o, i) => `${letters[i]}) ${stripHtml(o)}`),
    correct: q.format === 'mc' ? letters[q.correct ?? 0] : q.answer,
    chosen: chosen == null || chosen === '' ? null : q.format === 'mc' ? letters[Number(chosen)] : chosen,
    format: q.format,
  }
}

const memo = new Map<string, Promise<string>>()
/** One explanation per question, cached on the server for every student and in memory here. */
export function explain(testId: string, key: string, q: TestQuestion, token: string | null) {
  const id = `${testId}:${key}`
  if (!memo.has(id)) {
    const p = call<{ explanation: string }>('/api/explain', { id, ...questionPayload(q, null) }, token).then((d) => d.explanation)
    p.catch(() => memo.delete(id))
    memo.set(id, p)
  }
  return memo.get(id)!
}
