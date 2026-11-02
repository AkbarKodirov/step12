import type { useStore } from './store'
import { generatePlan } from './plan'

type S = ReturnType<typeof useStore>
const LANG = { en: 'English', uz: "O'zbekcha", ru: 'Русский' }

/** Everything Humo should know about the student, as compact text for the system context. */
export function studentContext(s: S, page?: string) {
  const p = s.profile
  const last = s.attempts[s.attempts.length - 1]
  const cur = s.plan ?? generatePlan(s.profile, s.weakSkills)
  const plan = cur ? JSON.stringify({ days: cur.days.map((d) => d.map(({ kind, title, min, skill }) => ({ kind, title, min, ...(skill ? { skill } : {}) }))) }) : ''
  return [
    page ? `The student is on ${page}.` : '',
    `Goal: target ${p.target}${p.current ? `, current ${p.current}` : ''}${p.testDate ? `, SAT on ${p.testDate}` : ', no test date set'}${p.aim ? `, aim: ${p.aim}` : ''}${p.level ? `, level: ${p.level}` : ''}.`,
    p.studyDays ? `Studies ${p.studyDays.length} days a week, about ${p.minutesPerDay ?? 60} min a day, usually at ${p.studyTime ?? '18:00'}.` : '',
    s.weakSkills.length || p.focus?.length ? `Weak skills: ${[...new Set([...(s.weakSkills ?? []), ...(p.focus ?? [])])].slice(0, 5).join(', ')}.` : '',
    last ? `Last test: ${last.testName}, ${last.raw}/${last.total} (${last.scaled}) in ${last.mode} mode.` : 'No tests taken yet.',
    `${s.mistakes.filter((m) => !m.cleared).length} open mistakes; ${Object.values(s.vocab).filter((v) => v.reps >= 3).length} vocab words mastered; ${Object.values(s.desmosLab).filter((d) => d.solved).length} Desmos Lab questions solved.`,
    `Preferred language: ${LANG[s.settings.language]}. Explanation style: ${s.settings.humoStyle === 'hint' ? 'hint first, full solution when asked' : 'full solution straight away'}.`,
    s.settings.desmosFirst ? 'For math questions, always solve the Desmos way with a desmos screen block.' : 'Solve math with algebra first; include a desmos block only when asked.',
    `Current study plan JSON: ${plan}`,
  ]
    .filter(Boolean)
    .join('\n')
}
