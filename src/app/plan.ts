import { lessonFor } from './learn/courses'
import { setStore, type PlanKind, type PlanTask, type Profile, type WeekPlan } from './store'

export const KINDS: Record<PlanKind, { label: string; to: (t: PlanTask) => string; min: number; color: string }> = {
  'drill-rw': { label: 'Reading & Writing practice', to: () => '/app/practice/run?section=EBRW&status=unsolved&order=random&n=20', min: 30, color: 'bg-jg-500' },
  'drill-math': { label: 'Math practice', to: () => '/app/practice/run?section=MATH&status=unsolved&order=random&n=20', min: 30, color: 'bg-sky-500' },
  skill: { label: 'Weak-skill practice', to: (t) => `/app/practice/run?skills=${encodeURIComponent(t.skill || '')}&status=unsolved&order=random&n=10`, min: 20, color: 'bg-violet-500' },
  vocab: { label: 'Vocabulary', to: () => '/app/vocab', min: 15, color: 'bg-amber-500' },
  mistakes: { label: 'Fix mistakes', to: () => '/app/mistakes', min: 25, color: 'bg-rose-500' },
  lesson: { label: 'Lesson', to: (t) => lessonFor(t.skill ?? '')?.to ?? '/app/learn/rw', min: 20, color: 'bg-teal-500' },
  blitz: { label: 'Blitz', to: () => '/app/blitz', min: 15, color: 'bg-orange-500' },
  test: { label: 'Full practice test', to: () => '/app/tests', min: 70, color: 'bg-pine' },
  review: { label: 'Review with Humo', to: () => '/app/results', min: 30, color: 'bg-emerald-600' },
  desmos: { label: 'Desmos practice', to: () => '/app/practice/run?set=desmos&status=unsolved&order=random&n=5', min: 20, color: 'bg-[#2d70b3]' },
  custom: { label: 'Custom task', to: () => '/app/plan', min: 20, color: 'bg-stone-400' },
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const uid = () => Math.random().toString(36).slice(2, 10)
export const task = (kind: PlanKind, title: string, min = KINDS[kind].min, skill?: string): PlanTask => ({ id: uid(), kind, title, min, ...(skill ? { skill } : {}) })

const MATH_SKILLS = ['Algebra', 'Advanced math', 'Problem solving & data', 'Geometry & trigonometry']

/** Builds a first week from the onboarding answers: study days, minutes per day, weak skills and level. */
export function generatePlan(p: Profile, weak: string[] = []): WeekPlan {
  const days = p.studyDays?.length ? p.studyDays : [0, 1, 2, 3, 4, 5]
  const budget = p.minutesPerDay ?? 60
  const focus = [...(p.focus ?? []), ...weak].filter((v, i, a) => a.indexOf(v) === i)
  const rwFocus = focus.filter((f) => !MATH_SKILLS.includes(f))
  const mFocus = focus.filter((f) => MATH_SKILLS.includes(f))
  const weekend = days.filter((d) => d >= 5)
  const testDay = weekend[0] ?? days[days.length - 1]
  const reviewDay = days.find((d) => d > testDay) ?? null
  let fi = 0
  const nextFocus = (math: boolean) => {
    const list = math ? mFocus : rwFocus
    return list.length ? list[fi++ % list.length] : null
  }

  const plan: PlanTask[][] = Array.from({ length: 7 }, () => [])
  const r5 = (n: number) => Math.max(10, Math.round(n / 5) * 5)
  let alt = 0
  for (const d of days) {
    if (d === testDay && budget >= 45) {
      plan[d] = [task('test', 'Full practice test in exam mode', Math.max(70, budget))]
      continue
    }
    if (d === reviewDay) {
      plan[d] = [task('review', 'Review your weekend test with Humo', r5(budget * 0.5)), task('mistakes', 'Fix 10 mistakes from your notebook', r5(budget * 0.5))]
      continue
    }
    const math = alt++ % 2 === 1
    const skill = nextFocus(math)
    const core = r5(budget * (skill ? 0.4 : 0.55))
    const out: PlanTask[] = [math ? task('drill-math', 'Math practice, 20 questions', core) : task('drill-rw', 'Reading & Writing practice, 20 questions', core)]
    if (skill) out.push(task('skill', `Practice your weak skill: ${skill}`, r5(budget * 0.2), skill))
    if (budget >= 45) out.push(math ? task('desmos', 'Desmos collection: hard Math the Desmos way', r5(budget * 0.2)) : task('lesson', 'One strategy lesson', r5(budget * 0.2)))
    out.push(task('vocab', 'Daily 20 words', 10))
    if (p.level === 'new' && budget >= 90) out.push(task('blitz', 'One Blitz run for pacing', 10))
    plan[d] = out
  }
  return { days: plan }
}

export function applyPlan(plan: WeekPlan) {
  setStore((s) => ({ ...s, plan }))
}

/* ---------------- calendar export ---------------- */
const pad = (n: number) => String(n).padStart(2, '0')
const icsDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')

function startOn(dayIndex: number, time: string) {
  const now = new Date()
  const d = new Date(now)
  const diff = (dayIndex - ((now.getDay() + 6) % 7) + 7) % 7
  d.setDate(now.getDate() + diff)
  const [h, m] = (time || '18:00').split(':').map(Number)
  d.setHours(h || 18, m || 0, 0, 0)
  return d
}

/** One weekly recurring event per study day (all of that day's tasks), repeating until the SAT. */
export function planToIcs(plan: WeekPlan, profile: Profile, origin: string) {
  const until = profile.testDate ? `;UNTIL=${profile.testDate.replace(/-/g, '')}T235959Z` : ';COUNT=12'
  const ev = plan.days.flatMap((tasks, d) => {
    if (!tasks.length) return []
    const start = startOn(d, profile.studyTime || '18:00')
    const mins = tasks.reduce((a, t) => a + t.min, 0)
    const end = new Date(start.getTime() + mins * 60000)
    return [
      'BEGIN:VEVENT',
      `UID:step12-${d}-${start.getTime()}@step12.uz`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `RRULE:FREQ=WEEKLY${until}`,
      `SUMMARY:${esc(`SAT study · ${tasks.length} task${tasks.length > 1 ? 's' : ''} (${mins} min)`)}`,
      `DESCRIPTION:${esc(tasks.map((t) => `• ${t.title} — ${t.min} min`).join('\n') + `\n\nOpen Humo AI: ${origin}/app/plan`)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:SAT study with Humo in 15 minutes',
      'END:VALARM',
      'END:VEVENT',
    ]
  })
  const exam = profile.testDate
    ? ['BEGIN:VEVENT', `UID:step12-sat-${profile.testDate}@step12.uz`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART;VALUE=DATE:${profile.testDate.replace(/-/g, '')}`, 'SUMMARY:Digital SAT test day 🎯', 'END:VEVENT']
    : []
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Humo AI//Study plan//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Humo AI · SAT plan', ...ev, ...exam, 'END:VCALENDAR'].join('\r\n')
}

export function downloadIcs(plan: WeekPlan, profile: Profile) {
  const blob = new Blob([planToIcs(plan, profile, location.origin)], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'step12-study-plan.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Google Calendar "add event" link for one study day, repeating weekly — no Google permissions needed. */
export function googleCalendarLink(tasks: PlanTask[], dayIndex: number, profile: Profile) {
  const start = startOn(dayIndex, profile.studyTime || '18:00')
  const mins = tasks.reduce((a, t) => a + t.min, 0)
  const end = new Date(start.getTime() + mins * 60000)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `SAT study · ${DAY_NAMES[dayIndex]} (${mins} min)`,
    dates: `${icsDate(start)}/${icsDate(end)}`,
    details: `${tasks.map((t) => `• ${t.title} — ${t.min} min`).join('\n')}\n\nOpen Humo AI: ${location.origin}/app/plan`,
    recur: `RRULE:FREQ=WEEKLY${profile.testDate ? `;UNTIL=${profile.testDate.replace(/-/g, '')}` : ';COUNT=12'}`,
  })
  return `https://calendar.google.com/calendar/render?${q}`
}

export function planMinutes(plan: WeekPlan) {
  return plan.days.reduce((a, d) => a + d.reduce((b, t) => b + t.min, 0), 0)
}

/** "+2 tasks on Tuesday, −1 on Friday" summary for Humo's proposals. */
export function planDiff(a: WeekPlan | null, b: WeekPlan) {
  if (!a) return 'A brand-new week'
  const parts: string[] = []
  b.days.forEach((d, i) => {
    const before = a.days[i] ?? []
    const added = d.filter((t) => !before.some((x) => x.title === t.title)).length
    const removed = before.filter((t) => !d.some((x) => x.title === t.title)).length
    if (added || removed) parts.push(`${DAY_NAMES[i].slice(0, 3)} ${added ? `+${added}` : ''}${added && removed ? ' ' : ''}${removed ? `−${removed}` : ''}`)
  })
  return parts.length ? parts.join(' · ') : 'Same tasks, new minutes'
}
