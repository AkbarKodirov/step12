import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Reveal } from '../components/motion'
import { useLang, type Lang } from './i18n'

export const Mascot = ({ pose, className = '' }: { pose: string; className?: string }) => (
  <img src={`/brand/mascot/${pose}.png`} alt="" loading="lazy" width={512} height={512} className={`select-none object-contain ${className}`} draggable={false} />
)

type L3 = Record<Lang, string>
const STEPS: { pose: string; when: L3; title: L3; body: L3 }[] = [
  {
    pose: 'hello',
    when: { en: 'Day 1', ru: 'День 1', uz: '1-kun' },
    title: { en: 'Know your starting point', ru: 'Узнай свой уровень', uz: 'Boshlang‘ich darajangni bil' },
    body: {
      en: 'A 40-minute diagnostic gives an estimated score and shows your weakest skills.',
      ru: '40-минутная диагностика покажет примерный балл и самые слабые навыки.',
      uz: '40 daqiqalik diagnostika taxminiy balingni va eng zaif ko‘nikmalaringni ko‘rsatadi.',
    },
  },
  {
    pose: 'reading',
    when: { en: 'Weeks 1–4', ru: 'Недели 1–4', uz: '1–4-haftalar' },
    title: { en: 'Fix gaps with a plan', ru: 'Закрой пробелы по плану', uz: 'Reja bilan bo‘shliqlarni to‘ldir' },
    body: {
      en: 'Humo builds a weekly plan for your test date, with video lessons and skill drills.',
      ru: 'Humo составит недельный план под дату экзамена: видеоуроки и тренировки по навыкам.',
      uz: 'Humo imtihon sanangga mos haftalik reja tuzadi: video darslar va ko‘nikma mashqlari.',
    },
  },
  {
    pose: 'scholar',
    when: { en: 'Weeks 5–8', ru: 'Недели 5–8', uz: '5–8-haftalar' },
    title: { en: 'Learn from every mistake', ru: 'Учись на каждой ошибке', uz: 'Har bir xatodan o‘rgan' },
    body: {
      en: 'Your notebook brings misses back with Humo’s explanation, and Desmos AI speeds up hard math.',
      ru: 'Тетрадь ошибок возвращает пропущенное с объяснением Humo, а Desmos AI ускоряет сложную математику.',
      uz: 'Xatolar daftari xatolaringni Humo tushuntirishi bilan qaytaradi, Desmos AI esa qiyin matematikani tezlashtiradi.',
    },
  },
  {
    pose: 'celebrate',
    when: { en: 'Test day', ru: 'День экзамена', uz: 'Imtihon kuni' },
    title: { en: 'Walk in ready', ru: 'Приходи подготовленным', uz: 'Tayyor bo‘lib kel' },
    body: {
      en: 'Full timed practice tests show your pacing and predicted score before it counts.',
      ru: 'Полные пробные тесты на время покажут темп и прогноз балла ещё до настоящего экзамена.',
      uz: 'To‘liq vaqtli practice testlar haqiqiy imtihondan oldin tempingni va taxminiy balingni ko‘rsatadi.',
    },
  },
]

const WHY: { title: L3; body: L3 }[] = [
  {
    title: { en: 'Desmos, solved for you', ru: 'Desmos решает за вас', uz: 'Desmos sen uchun yechadi' },
    body: {
      en: 'Humo turns a math question into a real Desmos screen and checks the answer before you see it.',
      ru: 'Humo превращает задачу в настоящий экран Desmos и проверяет ответ, прежде чем показать его.',
      uz: 'Humo matematik savolni haqiqiy Desmos ekraniga aylantiradi va javobni sen ko‘rmasdan oldin tekshiradi.',
    },
  },
  {
    title: { en: 'Your language, SAT terms', ru: 'Ваш язык, термины SAT', uz: 'Sening tilingda, SAT terminlari bilan' },
    body: {
      en: 'Explanations in English, O’zbekcha or Русский, with exam terms kept in English.',
      ru: 'Объяснения на английском, русском или узбекском, а экзаменационные термины остаются на английском.',
      uz: 'Tushuntirishlar ingliz, o‘zbek yoki rus tilida, imtihon terminlari esa inglizcha qoladi.',
    },
  },
  {
    title: { en: 'A tutor that remembers', ru: 'Репетитор, который помнит', uz: 'Eslab qoladigan ustoz' },
    body: {
      en: 'Practice, mocks and mistakes share one record, so every next task fits your weak spots.',
      ru: 'Практика, тесты и ошибки в одной записи, поэтому каждое новое задание бьёт по слабым местам.',
      uz: 'Mashqlar, testlar va xatolar bitta yozuvda, shuning uchun har keyingi topshiriq zaif joylaringga mos bo‘ladi.',
    },
  },
  {
    title: { en: 'Free to start', ru: 'Можно начать бесплатно', uz: 'Bepul boshlash mumkin' },
    body: {
      en: 'A full question bank of 4,000+ questions is free, with Pro for when your test date is close.',
      ru: 'Полный банк из 4 000+ вопросов бесплатен, а Pro нужен, когда экзамен близко.',
      uz: '4 000+ savollik to‘liq bank bepul, Pro esa imtihon yaqinlashganda kerak bo‘ladi.',
    },
  },
]

const TX = {
  title: { en: 'Your road to a higher score.', ru: 'Ваш путь к высокому баллу.', uz: 'Yuqori ball sari yo‘ling.' },
  why: { en: 'Why Humo AI is different', ru: 'Чем Humo AI отличается от других', uz: 'Humo AI boshqalardan nimasi bilan farq qiladi' },
}

export function Roadmap() {
  const l = useLang()
  return (
    <section id="roadmap" className="scroll-mt-20 border-t border-white/[0.07] py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <h2 className="display max-w-2xl text-[clamp(1.9rem,4vw,3.1rem)]">{TX.title[l]}</h2>
        </Reveal>
        <ol className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.pose}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="panel relative flex items-center gap-3 overflow-hidden rounded-[22px] p-5 sm:flex-col sm:items-start sm:gap-0"
            >
              <Mascot pose={s.pose} className="size-24 shrink-0 sm:-mt-1 sm:mb-2 sm:size-28" />
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-jg-300">{s.when[l]}</span>
                <h3 className="mt-1 text-[16px] font-semibold tracking-tight">{s.title[l]}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/50">{s.body[l]}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <h3 className="mt-10 text-[13px] font-semibold uppercase tracking-wider text-white/45">{TX.why[l]}</h3>
        <ul className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {WHY.map((w) => (
            <li key={w.title.en} className="flex gap-3">
              <Check className="mt-1 size-4 shrink-0 text-jg-400" />
              <div>
                <p className="text-[15px] font-semibold tracking-tight">{w.title[l]}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-white/50">{w.body[l]}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
