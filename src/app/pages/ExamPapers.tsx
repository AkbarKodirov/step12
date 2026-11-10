import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, Calculator, CalendarClock, Clock, Layers, Lock, PlayCircle } from 'lucide-react'
import { useStore, type SavedRun, type TestMeta } from '../store'
import { ScoreRing, Tilt } from '../../components/motion'
import { FullSheet, ModeSheet } from './Tests'
import { openUpgrade, useAccount } from '../account'

type PaperTest = TestMeta & { year: number; month: number; region: string; form?: string }

const YEARS = [2023, 2024, 2025, 2026]
type Lang = 'en' | 'ru' | 'uz'
const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Exam papers',
    sub: 'Real Digital SAT papers from past test dates. Pick a paper, then pick a mode.',
    completed: 'Completed',
    bestRw: 'Best R&W',
    bestMath: 'Best Math',
    year: 'Exam year',
    tests: 'tests',
    soon: 'Soon',
    all: 'All',
    full: 'Full tests',
    rw: 'Reading & Writing',
    math: 'Math',
    status: 'Status',
    todo: 'Not started',
    progress: 'In progress',
    done: 'Completed',
    pro: 'Pro',
    unlock: 'Unlock with Pro',
    proNote: 'Exam papers are for Pro students. You can see every paper here, and Pro opens them all.',
    unlockAll: 'Unlock all papers',
    fullTest: 'Full test',
    rwMath: 'Reading & Writing + Math',
    min: 'min',
    questions: 'questions',
    taken: 'taken',
    start: "Let's start",
    startFull: 'Start full test',
    retake: 'Retake',
    retakeFull: 'Retake full test',
    resume: 'Resume',
    restart: 'Restart',
    review: 'Review',
    fail: "Couldn't load the exam papers. Check your connection and refresh the page.",
    none: 'Nothing here',
    noneSub: 'No papers match these filters. Try another one.',
    emptyProgTitle: 'Nothing in progress',
    emptyProgSub: 'Start a paper and choose Quit and resume later from the Exit button. It waits here, with your answers and your timer, until you come back.',
    pick: 'Pick a paper',
    soonTitle: 'papers are on the way',
    soonSub: 'Humo AI adds each paper here once its questions are typed up and every answer has been checked.',
    open: 'Open',
    papers: 'papers',
    practice: 'Practice tests',
    version: 'Version',
    form: 'Form',
  },
  ru: {
    title: 'Экзаменационные варианты',
    sub: 'Настоящие варианты Digital SAT прошлых лет. Выберите вариант, затем режим.',
    completed: 'Пройдено',
    bestRw: 'Лучший R&W',
    bestMath: 'Лучший Math',
    year: 'Год экзамена',
    tests: 'тестов',
    soon: 'Скоро',
    all: 'Все',
    full: 'Полные тесты',
    rw: 'Чтение и письмо',
    math: 'Математика',
    status: 'Статус',
    todo: 'Не начаты',
    progress: 'В процессе',
    done: 'Пройдены',
    pro: 'Pro',
    unlock: 'Открыть с Pro',
    proNote: 'Экзаменационные варианты доступны в Pro. Все варианты видны здесь, а Pro открывает их.',
    unlockAll: 'Открыть все варианты',
    fullTest: 'Полный тест',
    rwMath: 'Чтение и письмо + Математика',
    min: 'мин',
    questions: 'вопросов',
    taken: 'пройден',
    start: 'Начать',
    startFull: 'Начать полный тест',
    retake: 'Пройти снова',
    retakeFull: 'Пройти полный тест снова',
    resume: 'Продолжить',
    restart: 'Заново',
    review: 'Разбор',
    fail: 'Не удалось загрузить варианты. Проверьте интернет и обновите страницу.',
    none: 'Здесь пусто',
    noneSub: 'По этим фильтрам вариантов нет. Попробуйте другие.',
    emptyProgTitle: 'Нет начатых тестов',
    emptyProgSub: 'Начните вариант и выберите «Выйти и продолжить позже» в кнопке «Выход». Он будет ждать здесь, с вашими ответами и таймером.',
    pick: 'Выбрать вариант',
    soonTitle: 'варианты скоро появятся',
    soonSub: 'Humo AI добавляет каждый вариант, когда вопросы набраны, а все ответы проверены.',
    open: 'Открыть',
    papers: 'варианты',
    practice: 'Практические тесты',
    version: 'Версия',
    form: 'Форма',
  },
  uz: {
    title: 'Imtihon varaqlari',
    sub: "O'tgan test sanalaridagi haqiqiy Digital SAT varaqlari. Varaqni tanlang, keyin rejimni tanlang.",
    completed: 'Bajarilgan',
    bestRw: 'Eng yaxshi R&W',
    bestMath: 'Eng yaxshi Math',
    year: 'Imtihon yili',
    tests: 'ta test',
    soon: 'Tez orada',
    all: 'Hammasi',
    full: "To'liq testlar",
    rw: 'Reading & Writing',
    math: 'Matematika',
    status: 'Holat',
    todo: 'Boshlanmagan',
    progress: 'Jarayonda',
    done: 'Bajarilgan',
    pro: 'Pro',
    unlock: 'Pro bilan ochish',
    proNote: "Imtihon varaqlari Pro foydalanuvchilar uchun. Barcha varaqlarni shu yerda ko'rishingiz mumkin, Pro hammasini ochadi.",
    unlockAll: 'Barcha varaqlarni ochish',
    fullTest: "To'liq test",
    rwMath: 'Reading & Writing + Matematika',
    min: 'daq',
    questions: 'savol',
    taken: 'topshirilgan',
    start: 'Boshlash',
    startFull: "To'liq testni boshlash",
    retake: 'Qayta topshirish',
    retakeFull: "To'liq testni qayta topshirish",
    resume: 'Davom etish',
    restart: 'Qaytadan',
    review: "Ko'rib chiqish",
    fail: "Imtihon varaqlarini yuklab bo'lmadi. Internetni tekshiring va sahifani yangilang.",
    none: "Bu yerda hech narsa yo'q",
    noneSub: "Bu filtrlarga mos varaq yo'q. Boshqasini sinab ko'ring.",
    emptyProgTitle: "Jarayonda hech narsa yo'q",
    emptyProgSub: "Varaqni boshlang va Chiqish tugmasidan «Chiqish va keyin davom etish»ni tanlang. U javoblaringiz va taymeringiz bilan shu yerda kutadi.",
    pick: 'Varaqni tanlash',
    soonTitle: 'varaqlari tez orada',
    soonSub: "Humo AI har bir varaqni savollari kiritilib, barcha javoblari tekshirilgandan keyin qo'shadi.",
    open: 'Ochish',
    papers: 'varaqlar',
    practice: 'Mashq testlari',
    version: 'Versiya',
    form: 'Forma',
  },
}
const LOCALE: Record<Lang, string> = { en: 'en', ru: 'ru', uz: 'uz' }
const monthName = (m: number, lang: Lang) => {
  const n = new Intl.DateTimeFormat(LOCALE[lang], { month: 'long' }).format(new Date(2026, m - 1, 1))
  return n.charAt(0).toUpperCase() + n.slice(1)
}

/** "Version 2", "Form A" or "US · Form A"; empty for the only paper of its month. */
const version = (p: { region: string; form?: string }, t: Record<string, string>) => {
  const v = p.form ? (/^\d+$/.test(p.form) ? `${t.version} ${p.form}` : `${t.form} ${p.form}`) : ''
  return p.region === 'US' ? (v ? `US · ${v}` : 'US') : v
}

/** One card on the shelf: a single section paper, or a Reading & Writing + Math pair that runs as one full test. */
type Item = { key: string; full: boolean; type: 'EBRW' | 'MATH' | 'FULL'; year: number; month: number; ver: string; rw: PaperTest; math?: PaperTest }

/**
 * Exam papers: real Digital SAT papers from past test dates, sorted by year. Each paper is an ordinary
 * test (public/tests/<id>.json, 2 modules) and public/papers/index.json says which tests sit on this shelf.
 * Cards look like Practice tests, with the same status filters. Papers are Pro only: Free students see every card with a lock.
 */
export default function ExamPapers() {
  const [papers, setPapers] = useState<PaperTest[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    fetch('/papers/index.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? (r.json() as Promise<PaperTest[]>) : Promise.reject(new Error(String(r.status)))))
      .then((x) => alive && setPapers(x))
      .catch(() => alive && (setFailed(true), setPapers([])))
    return () => {
      alive = false
    }
  }, [])

  const s = useStore()
  const lang: Lang = s.settings?.language ?? 'en'
  const t = T[lang] ?? T.en
  const acc = useAccount()
  const locked = !acc.pro
  const [params, setParams] = useSearchParams()
  type Kind = 'all' | 'full' | 'EBRW' | 'MATH'
  type Status = 'all' | 'todo' | 'progress' | 'done'
  const [kind, setKind] = useState<Kind>('all')
  const [status, setStatus] = useState<Status>(params.get('view') === 'progress' ? 'progress' : 'all')
  const [open, setOpen] = useState<TestMeta | null>(null)
  const [openFull, setOpenFull] = useState<{ id: string; name: string; rw: TestMeta; math: TestMeta } | null>(null)

  const years = useMemo(() => [...new Set([...YEARS, ...(papers ?? []).map((p) => p.year)])].sort((a, b) => a - b), [papers])
  const count = (y: number) => (papers ?? []).filter((p) => p.year === y).length
  // default to the newest year that has papers
  const fallback = [...years].reverse().find((y) => count(y) > 0) ?? years[years.length - 1]
  const year = Number(params.get('year')) || fallback
  const pick = (y: number) => setParams((p) => (p.set('year', String(y)), p), { replace: true })

  const best = useMemo(() => {
    const m = new Map<string, { scaled: number; id: string; n: number }>()
    for (const a of s.attempts) {
      const cur = m.get(a.testId)
      if (!cur || a.scaled > cur.scaled) m.set(a.testId, { scaled: a.scaled, id: a.id, n: (cur?.n ?? 0) + 1 })
      else cur.n++
    }
    return m
  }, [s.attempts])

  const all = papers ?? []
  const done = all.filter((p) => best.has(p.id)).length
  const bestOf = (type: 'EBRW' | 'MATH') => Math.max(0, ...all.filter((p) => p.type === type && best.has(p.id)).map((p) => best.get(p.id)!.scaled)) || null

  // single papers, plus a full test for every Reading & Writing + Math pair of the same exam date and version
  const items = useMemo<Item[]>(() => {
    const key = (p: PaperTest) => `${p.year}-${p.month}-${p.region}-${p.form ?? ''}`
    const maths = new Map(all.filter((p) => p.type === 'MATH').map((p) => [key(p), p]))
    const out: Item[] = []
    for (const p of all) {
      out.push({ key: p.id, full: false, type: p.type, year: p.year, month: p.month, ver: version(p, t), rw: p })
      const m = p.type === 'EBRW' ? maths.get(key(p)) : undefined
      if (m) out.push({ key: `${p.id}+${m.id}`, full: true, type: 'FULL', year: p.year, month: p.month, ver: version(p, t), rw: p, math: m })
    }
    return out
  }, [all, t])

  const stateOf = (it: Item): Status => {
    if (s.runs?.[it.key]) return 'progress'
    const finished = it.full ? best.has(it.rw.id) && best.has(it.math!.id) : best.has(it.rw.id)
    return finished ? 'done' : 'todo'
  }
  const inYear = items.filter((it) => it.year === year)
  const statusCount = (st: Status) => inYear.filter((it) => st === 'all' || stateOf(it) === st).length
  // newest test date first; Reading & Writing, then Math, then the full test for the same version
  const rank = (it: Item) => (it.type === 'EBRW' ? 0 : it.type === 'MATH' ? 1 : 2)
  const list = inYear
    .filter((it) => (kind === 'all' || it.type === (kind === 'full' ? 'FULL' : kind)) && (status === 'all' || stateOf(it) === status))
    .sort((a, b) => b.month - a.month || a.ver.localeCompare(b.ver, undefined, { numeric: true }) || rank(a) - rank(b))
  const yearEmpty = !!papers && count(year) === 0

  const startItem = (it: Item) =>
    it.full ? setOpenFull({ id: it.key, name: `${monthName(it.month, lang)} ${it.year}${it.ver ? ` · ${it.ver}` : ''}`, rw: it.rw, math: it.math! }) : setOpen(it.rw)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">{t.title}</h1>
          <p className="mt-2 text-[15px] text-moss">{t.sub}</p>
        </div>
        {papers && all.length > 0 && (
          <div className="card flex items-center gap-5 px-5 py-3">
            <div>
              <p className="text-[11px] text-moss">{t.completed}</p>
              <p className="font-serif text-[22px] tabular-nums">
                {done}/{all.length}
              </p>
            </div>
            <div className="h-8 w-px bg-soft" />
            <div>
              <p className="text-[11px] text-moss">{t.bestRw}</p>
              <p className="font-serif text-[22px] tabular-nums">{bestOf('EBRW') ?? '–'}</p>
            </div>
            <div className="h-8 w-px bg-soft" />
            <div>
              <p className="text-[11px] text-moss">{t.bestMath}</p>
              <p className="font-serif text-[22px] tabular-nums">{bestOf('MATH') ?? '–'}</p>
            </div>
          </div>
        )}
      </div>

      {acc.loaded && locked && papers && all.length > 0 && (
        <div className="relative mt-6 overflow-hidden rounded-[24px] bg-[#03244a] p-5 text-white sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#bb0937]/35 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-[15px] font-medium leading-snug sm:max-w-xl">
              <Lock className="mt-0.5 size-4 shrink-0 text-amber-300" /> {t.proNote}
            </p>
            <button onClick={() => openUpgrade()} className="btn h-11 shrink-0 bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-[14px] text-[#3a2400] shadow-lg shadow-amber-500/20 hover:brightness-105">
              <Lock className="size-4" /> {t.unlockAll}
            </button>
          </div>
        </div>
      )}

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* year switch: a vertical list, kept in view beside the cards on wide screens */}
        <div role="tablist" aria-label={t.year} aria-orientation="vertical" className="grid gap-1.5 rounded-[22px] bg-card p-1.5 ring-1 ring-line lg:sticky lg:top-6">
          {years.map((y) => {
            const on = y === year
            const n = count(y)
            return (
              <button key={y} role="tab" aria-selected={on} onClick={() => pick(y)} className={`relative flex items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-left transition ${on ? '' : 'hover:bg-cream'}`}>
                {on && <motion.span layoutId="paper-year" className="absolute inset-0 rounded-[16px] bg-pine shadow-lg shadow-pine/20" transition={{ type: 'spring', damping: 28, stiffness: 320 }} />}
                <span className={`relative font-serif text-[24px] leading-none tabular-nums ${on ? 'text-cream' : 'text-pine'}`}>{y}</span>
                <span className={`relative rounded-full px-2.5 py-1 text-[11.5px] font-medium ${on ? 'bg-white/15 text-cream' : n ? 'bg-jg-50 text-jg-700' : 'bg-cream text-moss'}`}>{papers ? (n ? `${n} ${t.tests}` : t.soon) : '…'}</span>
              </button>
            )
          })}
        </div>

        <div className="min-w-0">
          <div className={yearEmpty ? 'hidden' : 'block'}>
            {/* same filters as Practice tests: type, then status */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['all', t.all],
                  ['full', t.full],
                  ['EBRW', t.rw],
                  ['MATH', t.math],
                ] as const
              ).map(([k, l]) => (
                <button key={k} onClick={() => setKind(k)} className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${kind === k ? 'bg-pine text-cream' : 'bg-card text-pine ring-1 ring-line hover:ring-line-strong'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={t.status}>
              {(
                [
                  ['all', t.all],
                  ['todo', t.todo],
                  ['progress', t.progress],
                  ['done', t.done],
                ] as const
              ).map(([k, l]) => {
                const n = statusCount(k)
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setStatus(k)
                      if (params.has('view')) setParams((p) => (p.delete('view'), p), { replace: true })
                    }}
                    aria-pressed={status === k}
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${status === k ? 'bg-jg-500 text-white' : 'bg-cream text-pine hover:bg-jg-50'}`}
                  >
                    {l}
                    {papers && <span className="ml-1.5 opacity-70">{n}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {failed && <p className="mt-8 text-[14px] text-red-600">{t.fail}</p>}
          {!papers && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton h-52 rounded-[24px]" />
              ))}
            </div>
          )}

          {papers && !failed && yearEmpty && <EmptyYear t={t} year={year} next={fallback !== year && count(fallback) ? fallback : null} onPick={pick} />}

          {papers && !failed && !yearEmpty && list.length === 0 && (
            <div className="mt-6 flex flex-col items-center rounded-[28px] border-2 border-dashed border-line px-6 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-jg-50 text-jg-700">
                <PlayCircle className="size-6" />
              </span>
              <p className="mt-4 font-serif text-[24px]">{status === 'progress' ? t.emptyProgTitle : t.none}</p>
              <p className="mt-1.5 max-w-md text-[14px] text-moss">{status === 'progress' ? t.emptyProgSub : t.noneSub}</p>
              <button
                onClick={() => {
                  setStatus('all')
                  setKind('all')
                }}
                className="btn btn-dark mt-5 h-11 px-5 text-[14px]"
              >
                {t.pick} <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((it, i) => (
              <PaperCard key={it.key} it={it} t={t} lang={lang} locked={locked} best={best} run={s.runs?.[it.key]} delay={Math.min(i * 0.04, 0.35)} onStart={() => startItem(it)} />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && <ModeSheet test={open} onClose={() => setOpen(null)} />}
        {openFull && <FullSheet full={openFull} onClose={() => setOpenFull(null)} />}
      </AnimatePresence>
    </div>
  )
}

type Best = Map<string, { scaled: number; id: string; n: number }>

function PaperCard({ it, t, lang, locked, best, run, delay, onStart }: { it: Item; t: Record<string, string>; lang: Lang; locked: boolean; best: Best; run?: SavedRun; delay: number; onStart: () => void }) {
  const full = it.full
  const math = it.type === 'MATH'
  const Icon = full ? Layers : math ? Calculator : BookOpen
  const br = best.get(it.rw.id)
  const bm = it.math ? best.get(it.math.id) : undefined
  const b = full ? (br && bm ? { scaled: br.scaled + bm.scaled, id: br.id, n: Math.min(br.n, bm.n) } : undefined) : br
  const reviewId = br?.id
  const mins = it.rw.minutesPerModule * it.rw.modules + (it.math ? it.math.minutesPerModule * it.math.modules + 10 : 0)
  const questions = it.rw.questions + (it.math?.questions ?? 0)
  const label = full ? t.fullTest : math ? t.math : t.rw
  const tone = full ? 'from-jg-50 via-white to-sky-100/70' : math ? 'from-sky-50 to-sky-100/70' : 'from-jg-50 to-jg-200/40'
  const mode = run?.mode ?? 'exam'
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: [0.22, 1, 0.36, 1] }}>
      <Tilt className="h-full">
        <article className="card card-hover flex h-full flex-col overflow-hidden">
          <div className={`relative h-20 overflow-hidden bg-gradient-to-br px-5 pt-4 ${tone}`}>
            <Icon className={`absolute -bottom-5 -right-3 size-24 rotate-[-12deg] ${math ? 'text-sky-200' : 'text-jg-200'}`} strokeWidth={1.2} />
            <div className="relative flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur ${math ? 'text-sky-700' : 'text-jg-700'}`}>
                <Icon className="size-3.5" /> {label}
              </span>
              {locked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-[#3a2400]">
                  <Lock className="size-3" /> {t.pro}
                </span>
              ) : run ? (
                <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white">{t.progress}</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-[22px] leading-tight">
                  {monthName(it.month, lang)} {it.year}
                </h3>
                {(it.ver || full) && <p className="mt-0.5 text-[13px] text-moss">{[it.ver, full ? t.rwMath : ''].filter(Boolean).join(' · ')}</p>}
              </div>
              {b &&
                (full ? (
                  <span className="rounded-full bg-jg-50 px-3 py-1.5 font-serif text-[16px] font-semibold tabular-nums text-jg-700">{b.scaled}</span>
                ) : (
                  <ScoreRing value={b.scaled - 200} max={600} size={48} stroke={5} color={math ? '#38bdf8' : '#c8103f'} track="#e9edf3">
                    <span className="text-[12px] font-semibold tabular-nums">{b.scaled}</span>
                  </ScoreRing>
                ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-moss">
              <Clock className="size-3.5" /> {mins} {t.min} · {questions} {t.questions}
              {b ? ` · ${t.taken} ${b.n}×` : ''}
            </p>
            <div className="mt-auto flex gap-2 pt-4">
              {locked ? (
                <button onClick={() => openUpgrade()} className="btn h-11 flex-1 bg-gradient-to-r from-amber-300 to-amber-500 text-[14px] text-[#3a2400] hover:brightness-105">
                  <Lock className="size-4" /> {t.unlock}
                </button>
              ) : run ? (
                <>
                  <Link to={`/app/tests/${it.key}/take?mode=${mode}&resume=1`} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
                    {t.resume} <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                  <button onClick={onStart} className="btn btn-ghost h-11 px-4 text-[13px]">
                    {t.restart}
                  </button>
                </>
              ) : (
                <button onClick={onStart} className="btn btn-dark group/btn h-11 flex-1 text-[14px]">
                  {b ? (full ? t.retakeFull : t.retake) : full ? t.startFull : t.start} <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              )}
              {!locked && b && reviewId && (
                <Link to={`/app/results/${reviewId}`} className="btn btn-ghost h-11 px-4 text-[13px]">
                  {t.review}
                </Link>
              )}
            </div>
          </div>
        </article>
      </Tilt>
    </motion.div>
  )
}

function EmptyYear({ t, year, next, onPick }: { t: Record<string, string>; year: number; next: number | null; onPick: (y: number) => void }) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-[28px] border-2 border-dashed border-line px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-jg-50 text-jg-700">
        <CalendarClock className="size-6" />
      </span>
      <p className="mt-4 font-serif text-[24px]">
        {year} {t.soonTitle}
      </p>
      <p className="mt-1.5 max-w-md text-[14px] text-moss">{t.soonSub}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {next && (
          <button onClick={() => onPick(next)} className="btn btn-dark h-11 px-5 text-[14px]">
            {t.open} {next} {t.papers} <ArrowRight className="size-4" />
          </button>
        )}
        <Link to="/app/tests" className="btn btn-ghost h-11 px-5 text-[14px]">
          {t.practice}
        </Link>
      </div>
    </div>
  )
}
