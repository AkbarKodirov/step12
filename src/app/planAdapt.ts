import { planMinutes, task } from './plan'
import type { Attempt, PlanKind, PlanTask, WeekPlan } from './store'

export type Lang = 'en' | 'uz' | 'ru'
export type AdaptId = 'lighter' | 'focus' | 'mistakes' | 'harder'

const MATH_SKILLS = ['Algebra', 'Advanced math', 'Problem solving & data', 'Geometry & trigonometry']
const L = <T,>(lang: Lang, en: T, uz: T, ru: T): T => (lang === 'uz' ? uz : lang === 'ru' ? ru : en)

/** What the student's own data says about where they stand. */
export type Signals = {
  skill: string
  /** where the focus skill came from */
  source: 'test' | 'setup' | 'score' | 'default'
  math: boolean
  openMistakes: number
  planned: number
  done: number
  rwScore: number | null
  mathScore: number | null
}

export function readSignals(o: { weakSkills: string[]; focus?: string[]; attempts: Attempt[]; openMistakes: number; plan: WeekPlan; planDone: Record<string, boolean>; weekDates: string[] }): Signals {
  const latest = (type: 'EBRW' | 'MATH') => [...o.attempts].reverse().find((a) => a.type === type)?.scaled ?? null
  const rwScore = latest('EBRW')
  const mathScore = latest('MATH')
  let skill = o.weakSkills[0]
  let source: Signals['source'] = 'test'
  if (!skill && o.focus?.[0]) (skill = o.focus[0]), (source = 'setup')
  if (!skill && rwScore != null && mathScore != null) {
    const mathWeaker = mathScore < rwScore
    skill = mathWeaker ? 'Algebra' : 'Words in context'
    source = 'score'
  }
  if (!skill) (skill = 'Words in context'), (source = 'default')
  let planned = 0
  let done = 0
  o.weekDates.forEach((date, i) =>
    (o.plan.days[i] ?? []).forEach((t) => {
      planned++
      if (o.planDone[`${date}:${t.id}`]) done++
    }),
  )
  return { skill, source, math: MATH_SKILLS.includes(skill), openMistakes: o.openMistakes, planned, done, rwScore, mathScore }
}

export type Option = { id: AdaptId; label: string; reason: string; recommended: boolean; plan: WeekPlan; note: string }

const clone = (p: WeekPlan): PlanTask[][] => p.days.map((d) => d.map((t) => ({ ...t })))
const r5 = (n: number) => Math.max(10, Math.round(n / 5) * 5)
const hrs = (m: number) => Math.round(m / 6) / 10

/** Lowest priority first: what goes before anything tied to the student's weak areas. */
const DROP_ORDER: PlanKind[] = ['blitz', 'lesson', 'vocab', 'custom', 'desmos', 'review', 'drill-rw', 'drill-math']

function lighter(plan: WeekPlan, g: Signals, lang: Lang): { plan: WeekPlan; note: string } {
  const days = clone(plan)
  const before = planMinutes(plan)
  const target = before * 0.7
  const total = () => days.reduce((a, d) => a + d.reduce((b, t) => b + t.min, 0), 0)
  const dropped = new Set<PlanKind>()
  for (const kind of DROP_ORDER) {
    // from the busiest day first
    const order = days.map((_, i) => i).sort((a, b) => days[b].reduce((x, t) => x + t.min, 0) - days[a].reduce((x, t) => x + t.min, 0))
    for (const i of order) {
      if (total() <= target) break
      const d = days[i]
      const k = d.findIndex((t) => t.kind === kind && !(kind === 'desmos' && g.math) && !(kind === (g.math ? 'drill-math' : 'drill-rw')))
      if (k >= 0 && d.length > 1) (dropped.add(kind), d.splice(k, 1))
    }
    if (total() <= target) break
  }
  // still too heavy: shorten everything except full tests and the weak-skill work
  const left = total()
  if (left > target) {
    const f = target / left
    days.forEach((d) =>
      d.forEach((t) => {
        if (t.kind !== 'test' && t.kind !== 'skill' && t.kind !== 'mistakes') t.min = r5(t.min * f)
      }),
    )
  }
  // a week with six or seven study days gets one real rest day (the lightest one)
  const active = days.map((d, i) => ({ i, m: d.reduce((a, t) => a + t.min, 0), test: d.some((t) => t.kind === 'test') })).filter((d) => d.m > 0)
  if (active.length >= 6) {
    const rest = active.filter((d) => !d.test).sort((a, b) => a.m - b.m)[0]
    if (rest) days[rest.i] = []
  }
  const out = { days }
  const names: Record<string, string> = {
    blitz: L(lang, 'Blitz', 'Blitz', 'Blitz'),
    lesson: L(lang, 'extra lessons', 'qo‘shimcha darslar', 'доп. уроки'),
    vocab: L(lang, 'some vocab', 'ba’zi lug‘at mashqlari', 'часть словаря'),
    custom: L(lang, 'extra tasks', 'qo‘shimcha vazifalar', 'доп. задачи'),
    desmos: 'Desmos',
    review: L(lang, 'a review block', 'takrorlash bloki', 'блок повторения'),
    'drill-rw': L(lang, 'a Reading & Writing drill', 'Reading & Writing mashqi', 'тренировку Reading & Writing'),
    'drill-math': L(lang, 'a Math drill', 'Math mashqi', 'тренировку Math'),
  }
  const list = [...dropped].map((k) => names[k]).join(', ')
  const note = L(
    lang,
    `Weeks go from ${hrs(before)} to ${hrs(planMinutes(out))} hours. ${list ? `I trimmed ${list} first, ` : ''}and kept your ${g.skill} practice${g.openMistakes ? ' and mistake fixing' : ''} because that is where you gain the most.`,
    `Hafta ${hrs(before)} soatdan ${hrs(planMinutes(out))} soatga tushdi. ${list ? `Avval ${list} ni qisqartirdim, ` : ''}${g.skill} mashqlarini${g.openMistakes ? ' va xatolar ustida ishlashni' : ''} qoldirdim, chunki eng ko‘p o‘sish shu yerda.`,
    `Неделя сократилась с ${hrs(before)} до ${hrs(planMinutes(out))} ч. ${list ? `Сначала убрано: ${list}, ` : ''}оставлено: ${g.skill}${g.openMistakes ? ' и разбор ошибок' : ''}: именно там ты растёшь быстрее всего.`,
  )
  return { plan: out, note }
}

function aroundFocus(plan: WeekPlan, g: Signals, lang: Lang, pro: boolean): { plan: WeekPlan; note: string } {
  const days = clone(plan)
  const title = L(lang, `Practice your weakest skill: ${g.skill}`, `Eng zaif ko‘nikma: ${g.skill}`, `Самый слабый навык: ${g.skill}`)
  const lessonTitle = L(lang, `Lesson: ${g.skill}`, `Dars: ${g.skill}`, `Урок: ${g.skill}`)
  const open = days.map((d, i) => ({ i, m: d.reduce((a, t) => a + t.min, 0), blocked: d.some((t) => t.kind === 'test' || t.kind === 'review') })).filter((d) => d.m > 0 && !d.blocked)
  const picks = open.slice(0, 4).map((d) => d.i)
  let n = 0
  for (const i of picks) {
    const d = days[i]
    const ex = d.find((t) => t.kind === 'skill')
    if (ex) {
      ex.title = title
      ex.skill = g.skill
      ex.min = Math.max(ex.min, 30)
    } else {
      // pay for it with the generic drill of the same day so the day does not grow
      const drill = d.find((t) => t.kind === (g.math ? 'drill-math' : 'drill-rw')) ?? d.find((t) => t.kind === 'drill-rw' || t.kind === 'drill-math')
      const min = drill ? Math.max(20, Math.min(35, drill.min)) : 25
      if (drill) drill.min = Math.max(10, drill.min - Math.min(10, min - 15))
      d.unshift(task('skill', title, min, g.skill))
    }
    n++
  }
  if (picks[1] != null && !days[picks[1]].some((t) => t.kind === 'lesson' && t.skill === g.skill)) {
    const d = days[picks[1]]
    const old = d.findIndex((t) => t.kind === 'lesson' || t.kind === 'vocab')
    if (old >= 0) d.splice(old, 1)
    d.push(task('lesson', lessonTitle, 20, g.skill))
  }
  if (pro && g.math && picks[2] != null && !days[picks[2]].some((t) => t.kind === 'desmos')) days[picks[2]].push(task('desmos', L(lang, 'Desmos Lab: one hard question', 'Desmos Lab: bitta qiyin savol', 'Desmos Lab: один сложный вопрос'), 20))
  const out = { days }
  const note = L(
    lang,
    `Your week now centres on ${g.skill}: focused practice on ${n} days plus a lesson. Everything else stays.`,
    `Haftangiz endi ${g.skill} atrofida: ${n} kun maxsus mashq va bitta dars. Qolgani o‘z joyida.`,
    `Неделя теперь строится вокруг «${g.skill}»: целевая практика ${n} дн. и один урок. Остальное остаётся.`,
  )
  return { plan: out, note }
}

function mistakesPlan(plan: WeekPlan, g: Signals, lang: Lang): { plan: WeekPlan; note: string } {
  const days = clone(plan)
  const title = L(lang, 'Fix 10 mistakes from your notebook', 'Daftardagi 10 ta xatoni tuzating', 'Исправь 10 ошибок из блокнота')
  const picks = days.map((d, i) => ({ i, m: d.reduce((a, t) => a + t.min, 0), has: d.some((t) => t.kind === 'test') })).filter((d) => d.m > 0 && !d.has).slice(0, 4)
  let n = 0
  for (const { i } of picks) {
    const d = days[i]
    if (d.some((t) => t.kind === 'mistakes')) continue
    const swap = d.findIndex((t) => t.kind === 'vocab' || t.kind === 'blitz' || t.kind === 'lesson')
    if (swap >= 0) d.splice(swap, 1)
    d.push(task('mistakes', title, 20))
    n++
  }
  return {
    plan: { days },
    note: L(
      lang,
      `You have ${g.openMistakes} open mistakes. I added 20-minute fix sessions on ${n} days, replacing vocab, Blitz or extra lessons where I could.`,
      `Sizda ${g.openMistakes} ta ochiq xato bor. ${n} kunga 20 daqiqalik tuzatish seansi qo‘shdim, imkon bo‘lsa lug‘at, Blitz yoki qo‘shimcha darslar o‘rniga.`,
      `У тебя ${g.openMistakes} неисправленных ошибок. Добавлены 20-минутные сессии на ${n} дн. вместо словаря, Blitz или доп. уроков, где можно.`,
    ),
  }
}

function harder(plan: WeekPlan, g: Signals, lang: Lang, pro: boolean): { plan: WeekPlan; note: string } {
  const days = clone(plan)
  days.forEach((d) =>
    d.forEach((t) => {
      if (t.kind === 'drill-rw' || t.kind === 'drill-math' || t.kind === 'skill') t.min = Math.min(60, t.min + 10)
    }),
  )
  const empty = days.findIndex((d) => d.length === 0)
  const busy = days.findIndex((d) => d.length > 0 && !d.some((t) => t.kind === 'blitz' || t.kind === 'test'))
  if (busy >= 0) days[busy].push(task('blitz', L(lang, 'Blitz run for pacing', 'Tezlik uchun Blitz', 'Blitz для темпа'), 15))
  if (pro && g.math) {
    const d = days.find((x) => x.length > 0 && !x.some((t) => t.kind === 'desmos' || t.kind === 'test'))
    d?.push(task('desmos', L(lang, 'Desmos Lab: one hard question', 'Desmos Lab: bitta qiyin savol', 'Desmos Lab: один сложный вопрос'), 20))
  }
  void empty
  return {
    plan: { days },
    note: L(
      lang,
      `You are finishing nearly everything, so I added 10 minutes to each drill and a Blitz run for pacing${pro && g.math ? ', plus a Desmos Lab question' : ''}.`,
      `Siz deyarli hammasini bajaryapsiz, shuning uchun har bir mashqqa 10 daqiqa va tezlik uchun Blitz qo‘shdim${pro && g.math ? ', hamda Desmos Lab savoli' : ''}.`,
      `Почти всё выполняется, поэтому добавлено по 10 минут к каждой тренировке и Blitz для темпа${pro && g.math ? ', а также вопрос Desmos Lab' : ''}.`,
    ),
  }
}

/** Options Humo offers right now, ordered by how well each fits what the student's progress shows. */
export function adaptOptions(plan: WeekPlan, g: Signals, lang: Lang, pro: boolean): Option[] {
  const rate = g.planned ? g.done / g.planned : null
  const pct = rate == null ? 0 : Math.round(rate * 100)
  const out: Option[] = []
  const push = (id: AdaptId, label: string, reason: string, recommended: boolean, r: { plan: WeekPlan; note: string }) => out.push({ id, label, reason, recommended, ...r })

  const struggling = rate != null && g.planned >= 4 && rate < 0.5
  push(
    'lighter',
    L(lang, 'Make my weeks lighter', 'Haftalarimni yengillashtir', 'Сделай мои недели легче'),
    rate == null || g.planned < 4
      ? L(lang, 'About 30% less time. I trim the extras first and keep the work on your weak areas.', 'Taxminan 30% kam vaqt. Avval ortiqchalarni qisqartiraman, zaif joylarni qoldiraman.', 'Примерно на 30% меньше времени. Сначала уберу лишнее, слабые темы оставлю.')
      : L(lang, `You finished ${g.done} of ${g.planned} tasks this week (${pct}%). A lighter week you can actually finish beats a heavy one you skip.`, `Bu hafta ${g.planned} ta vazifadan ${g.done} tasini bajardingiz (${pct}%). Bajara oladigan yengil hafta, tashlab ketiladigan og‘ir haftadan yaxshi.`, `На этой неделе выполнено ${g.done} из ${g.planned} задач (${pct}%). Лёгкая неделя, которую можно закончить, лучше тяжёлой, которую бросают.`),
    struggling,
    lighter(plan, g, lang),
  )
  push(
    'focus',
    L(lang, `Build my week around ${g.skill}`, `Haftamni ${g.skill} atrofida quring`, `Построй неделю вокруг «${g.skill}»`),
    focusReason(g, lang),
    !struggling && g.openMistakes < 8 && !(rate != null && rate >= 0.8),
    aroundFocus(plan, g, lang, pro),
  )
  if (g.openMistakes >= 5)
    push(
      'mistakes',
      L(lang, 'Clear my open mistakes', 'Ochiq xatolarimni tuzat', 'Разобрать мои ошибки'),
      L(lang, `${g.openMistakes} mistakes are waiting in your notebook. Fixing them is the fastest way to stop repeating them.`, `Daftaringizda ${g.openMistakes} ta xato kutmoqda. Ularni tuzatish, takrorlamaslikning eng tez yo‘li.`, `В блокноте ждут ${g.openMistakes} ошибок. Разбор: самый быстрый способ перестать их повторять.`),
      g.openMistakes >= 8 && !struggling,
      mistakesPlan(plan, g, lang),
    )
  if (rate != null && g.planned >= 4 && rate >= 0.8)
    push(
      'harder',
      L(lang, 'Push me harder', 'Menga ko‘proq yuk bering', 'Дай мне больше нагрузки'),
      L(lang, `You finished ${pct}% of this week's tasks. Ready for a bit more?`, `Bu haftadagi vazifalarning ${pct}% ini bajardingiz. Biroz ko‘proqqa tayyormisiz?`, `Выполнено ${pct}% задач недели. Можно взять нагрузку чуть больше?`),
      true,
      harder(plan, g, lang, pro),
    )
  return out
}

function focusReason(g: Signals, lang: Lang) {
  return g.source === 'test'
    ? L(lang, 'Your last test showed this is where you lose the most points.', 'Oxirgi testingiz eng ko‘p ball aynan shu yerda yo‘qotilayotganini ko‘rsatdi.', 'Твой последний тест показал: больше всего баллов ты теряешь здесь.')
    : g.source === 'score'
      ? L(lang, `Your ${g.math ? 'Math' : 'Reading & Writing'} score is the lower one, so this section gains you more.`, `${g.math ? 'Math' : 'Reading & Writing'} balingiz pastroq, shu bo‘limda ko‘proq o‘sasiz.`, `Твой балл по ${g.math ? 'Math' : 'Reading & Writing'} ниже, поэтому здесь рост будет больше.`)
      : g.source === 'setup'
        ? L(lang, 'You picked this as a focus when you set up your plan.', 'Rejani tuzayotganda buni asosiy yo‘nalish qilib tanlagansiz.', 'Это приоритет, выбранный при настройке плана.')
        : L(lang, 'A good place to start until you take a practice test and Humo can see your real weak spots.', 'Mashq testini yechguncha shu yerdan boshlash yaxshi, keyin Humo haqiqiy zaif joylarni ko‘radi.', 'Хорошее начало, пока нет пробного теста и Humo не видит твои реальные слабые места.')
}

export const focusReasonText = focusReason

export const UI = (lang: Lang) => ({
  title: L(lang, 'Humo suggests, based on your progress', 'Humo taklifi: sizning natijalaringiz asosida', 'Предложения Humo по твоему прогрессу'),
  focusTitle: L(lang, 'Your #1 area to focus on', 'Eng muhim yo‘nalishingiz', 'Твоя главная зона для фокуса'),
  focusCta: L(lang, 'Practice it now', 'Hozir mashq qilish', 'Тренироваться сейчас'),
  recommended: L(lang, 'Best fit now', 'Hozir eng mos', 'Лучший выбор сейчас'),
  apply: L(lang, "Apply Humo's changes", 'Humo o‘zgarishlarini qo‘llash', 'Применить изменения Humo'),
  discard: L(lang, 'Discard', 'Bekor qilish', 'Отменить'),
  perWeek: (n: number, was: number) => L(lang, `${n} h/week (was ${was})`, `haftasiga ${n} soat (avval ${was})`, `${n} ч/нед (было ${was})`),
  rest: L(lang, 'rest', 'dam', 'отдых'),
  preview: L(lang, 'Preview', 'Ko‘rib chiqish', 'Посмотреть'),
  weekDay: (i: number) => L(lang, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'])[i],
  noTasks: L(lang, 'Add some tasks to your plan first, then Humo can adapt it.', 'Avval rejaga vazifalar qo‘shing, keyin Humo uni moslashtiradi.', 'Сначала добавь задачи в план, и Humo сможет его адаптировать.'),
  mistakesOpen: (n: number) => L(lang, `${n} open mistakes`, `${n} ta ochiq xato`, `${n} открытых ошибок`),
})
