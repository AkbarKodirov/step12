import { useEffect, useState } from 'react'
import { stripHtml, type TestQuestion } from './store'

/**
 * What the student is looking at right now, so Humo "sees the screen".
 * Practice pages publish it; the floating Humo button and side panels read it.
 * Practice tests and exam papers never publish (no AI help during a test).
 */
export type Screen = { title: string; text: string; wrong?: boolean; key?: string } | null

let current: Screen = null
const subs = new Set<() => void>()

export function setScreen(s: Screen) {
  current = s
  subs.forEach((f) => f())
}
export const getScreen = () => current

export function useScreen() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  }, [])
  return current
}

/** Publish a screen while the component is mounted. */
export function usePublishScreen(s: Screen) {
  const sig = s ? `${s.key}|${s.wrong}|${s.text.length}|${s.text.slice(-120)}` : ''
  useEffect(() => {
    setScreen(s)
    return () => setScreen(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
}

const L = ['A', 'B', 'C', 'D']
/** Plain-text picture of a question and the student's attempt, for Humo. */
export function describeQuestion(q: TestQuestion, opts: { chosen?: string | null; checked?: boolean; correct?: boolean; seconds?: number; where?: string; skill?: string } = {}) {
  const chosen = opts.chosen == null || opts.chosen === '' ? null : q.format === 'mc' ? `${L[Number(opts.chosen)]}) ${stripHtml(q.options[Number(opts.chosen)])}` : opts.chosen
  const right = q.format === 'mc' ? `${L[q.correct ?? 0]}) ${stripHtml(q.options[q.correct ?? 0])}` : q.answer
  return [
    opts.where ? `Screen: ${opts.where}${opts.skill ? ` · skill: ${opts.skill}` : ''}` : '',
    q.passage ? `Passage:\n${stripHtml(q.passage)}` : '',
    q.passageImage || q.image ? '(The question includes a figure the student can see.)' : '',
    `Question: ${q.question || '(question shown as an image)'}`,
    q.format === 'mc' ? `Choices:\n${q.options.map((o, i) => `${L[i]}) ${stripHtml(o)}`).join('\n')}` : 'Student-produced response (no choices).',
    chosen ? `Student's answer: ${chosen}` : 'The student has not answered yet.',
    opts.checked ? `Checked: ${opts.correct ? 'CORRECT' : 'INCORRECT'}. Correct answer: ${right}.` : 'Not checked yet — if asked for help, give a hint first and do not reveal the answer unless the student asks for it.',
    opts.seconds != null ? `Time on this question: ${opts.seconds}s.` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
