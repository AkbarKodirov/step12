import { useState } from 'react'
import { Plus } from 'lucide-react'
import { GoogleButton } from '../auth/GoogleButton'
import { Reveal, Spotlight } from '../components/motion'
import { motion } from 'framer-motion'
import { HumoLogo } from '../brand/HumoLogo'
import { useLang, type Lang } from './i18n'
import { Mascot } from './Roadmap'

type L3 = Record<Lang, string>

export const UNIVERSITIES: [string, string][] = [
  ['Westminster International University in Tashkent', 'wiut.uz'],
  ['Inha University in Tashkent', 'inha.uz'],
  ['New York University Abu Dhabi', 'nyuad.nyu.edu'],
  ['KAIST', 'kaist.ac.kr'],
  ['University of Toronto', 'utoronto.ca'],
  ["King's College London", 'kcl.ac.uk'],
  ['Seoul National University', 'snu.ac.kr'],
  ['Technical University of Munich', 'tum.de'],
  ['National University of Singapore', 'nus.edu.sg'],
  ['Turin Polytechnic University in Tashkent', 'polito.uz'],
]
/** University crest via Google's public favicon service (loaded by the visitor's browser). */
export const uniLogo = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

const PROOF: L3 = { en: 'Humo AI students aim for universities like these', ru: 'Ученики Humo AI поступают в такие университеты', uz: 'Humo AI o‘quvchilari shunday universitetlarni nishonga oladi' }

export function Proof() {
  const l = useLang()
  const row = [...UNIVERSITIES, ...UNIVERSITIES]
  return (
    <section className="border-t border-white/[0.07] py-6" aria-label={PROOF[l]}>
      <p className="page-shell text-[13px] text-white/40">{PROOF[l]}</p>
      <div className="relative mt-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
          {row.map(([u, d], i) => (
            <li key={i} aria-hidden={i >= UNIVERSITIES.length} className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-2 pl-2 pr-4 transition hover:border-white/20 hover:bg-white/[0.06]">
              <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white">
                <img src={uniLogo(d)} alt="" loading="lazy" className="size-6 object-contain" referrerPolicy="no-referrer" />
              </span>
              <span className="whitespace-nowrap text-[14px] font-medium tracking-tight text-white/70">{u}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const FAQ: Record<Lang, string[][]> = {
  en: [
    ['Is Humo AI the same as the official SAT?', 'No. Our questions and mocks follow the official formats and timing closely, but they are written by Humo AI teachers. Use the official Bluebook practice tests as well before test day.'],
    ['How accurate are the score estimates?', 'Estimates are most reliable after a full mock. A single practice set gives a rough range; Humo tells you how confident the estimate is.'],
    ['Can Humo explain in Uzbek or Russian?', "Yes. Ask in O'zbekcha or Русский and Humo will answer in that language, while keeping exam terms in English so they match the real test."],
    ['Does Humo just give me the answers?', 'When you are practising, Humo starts with a hint and only shows the full solution if you ask. In review mode it explains the full reasoning.'],
    ['Can my whole school use Humo AI?', 'Yes. Use the For schools request in the pricing section and we will set up Humo AI for all your students at once.'],
    ['Can I cancel Pro at any time?', 'Yes. Pro is monthly, and you keep access until the end of the month you paid for.'],
  ],
  ru: [
    ['Humo AI — это то же самое, что официальный SAT?', 'Нет. Наши вопросы и тесты близко следуют официальным форматам и времени, но написаны преподавателями Humo AI. Перед экзаменом пройдите и официальные тесты Bluebook.'],
    ['Насколько точны оценки баллов?', 'Оценка надёжнее всего после полного пробного теста. Один набор задач даёт лишь примерный диапазон, а Humo сообщает, насколько он уверен.'],
    ['Может ли Humo объяснять на узбекском или русском?', 'Да. Спросите на русском или O‘zbekcha, и Humo ответит на этом языке, оставив экзаменационные термины на английском, как в настоящем тесте.'],
    ['Humo просто даёт мне ответы?', 'Во время практики Humo начинает с подсказки и показывает полное решение, только если вы попросите. В режиме разбора он объясняет всю логику.'],
    ['Может ли вся наша школа пользоваться Humo AI?', 'Да. Оставьте заявку «Для школ» в разделе цен, и мы подключим Humo AI сразу для всех ваших учеников.'],
    ['Можно ли отменить Pro в любой момент?', 'Да. Pro оплачивается помесячно, и доступ сохраняется до конца оплаченного месяца.'],
  ],
  uz: [
    ['Humo AI rasmiy SAT bilan bir xilmi?', 'Yo‘q. Savollarimiz va mocklarimiz rasmiy format va vaqtga yaqin, lekin ularni Humo AI o‘qituvchilari yozgan. Imtihondan oldin rasmiy Bluebook testlarini ham ishlang.'],
    ['Ball baholari qanchalik aniq?', 'Baho to‘liq mockdan keyin eng ishonchli bo‘ladi. Bitta mashq to‘plami taxminiy oraliq beradi, Humo esa bahoga qanchalik ishonchini aytadi.'],
    ['Humo o‘zbek yoki rus tilida tushuntira oladimi?', 'Ha. O‘zbekcha yoki ruscha so‘rang, Humo shu tilda javob beradi, imtihon terminlarini esa haqiqiy testdagidek inglizcha qoldiradi.'],
    ['Humo menga faqat javobni berib qo‘yadimi?', 'Mashq paytida Humo ishora bilan boshlaydi va to‘liq yechimni faqat so‘rasangiz ko‘rsatadi. Tahlil rejimida esa butun mantiqni tushuntiradi.'],
    ['Butun maktabimiz Humo AI dan foydalana oladimi?', 'Ha. Narxlar bo‘limidagi «Maktablar uchun» so‘rovini yuboring, biz Humo AI ni barcha o‘quvchilaringiz uchun bir vaqtda sozlab beramiz.'],
    ['Prodan istalgan payt voz kecha olamanmi?', 'Ha. Pro oylik, siz to‘lagan oyning oxirigacha kirish saqlanadi.'],
  ],
}
const FAQ_TITLE: L3 = { en: 'Questions students ask us.', ru: 'Вопросы, которые нам задают.', uz: 'O‘quvchilar bergan savollar.' }

export function Faq() {
  const l = useLang()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-20 border-t border-white/[0.07] py-10 sm:py-14">
      <div className="page-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 className="display text-[clamp(1.9rem,4vw,3.1rem)]">{FAQ_TITLE[l]}</h2>
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FAQ[l].map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q}>
                <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 py-4 text-left text-[16px] font-medium">
                  {q}
                  <Plus className={`size-4 shrink-0 text-white/50 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <p className="overflow-hidden pr-10 text-[15px] leading-relaxed text-white/55">{a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const CTA = {
  a: { en: 'Humo is ready ', ru: 'Humo готов, ', uz: 'Humo tayyor, ' } as L3,
  b: { en: 'when you are', ru: 'когда готовы вы', uz: 'sen tayyor bo‘lganda' } as L3,
  sub: { en: 'Take the diagnostic today and see where you stand in 40 minutes.', ru: 'Пройдите диагностику сегодня и узнайте свой уровень за 40 минут.', uz: 'Bugun diagnostikani topshiring va 40 daqiqada darajangizni biling.' } as L3,
}

export function FinalCta() {
  const l = useLang()
  return (
    <section className="relative overflow-hidden border-t border-white/[0.07] py-12 sm:py-16">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-jg-500/[0.13] blur-[140px]" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
        <Mascot pose="cheer" className="size-32" />
        <h2 className="display mt-4 pb-2 text-[clamp(2.2rem,5.5vw,4.2rem)]">
          {CTA.a[l]}
          <span className="gold-text">{CTA.b[l]}</span>.
        </h2>
        <p className="mt-4 max-w-md text-[16px] text-white/55">{CTA.sub[l]}</p>
        <div className="mt-7">
          <GoogleButton />
        </div>
      </div>
    </section>
  )
}

const FOOT = {
  blurb: {
    en: 'Humo AI, the digital SAT platform from Tashkent — full-length practice, a smart question bank and Humo, your AI tutor.',
    ru: 'Humo AI — платформа цифрового SAT из Ташкента: полные пробные тесты, умный банк вопросов и Humo, ваш ИИ-репетитор.',
    uz: 'Humo AI — Toshkentdan raqamli SAT platformasi: to‘liq practice testlar, aqlli savollar banki va AI ustozingiz Humo.',
  } as L3,
  product: { en: 'Product', ru: 'Продукт', uz: 'Mahsulot' } as L3,
  legal: { en: 'Legal', ru: 'Право', uz: 'Huquqiy' } as L3,
  links: {
    en: ['Try Humo', 'Features', 'Results', 'Pricing', 'For schools', 'Privacy Policy', 'Terms of Service'],
    ru: ['Попробовать Humo', 'Возможности', 'Результаты', 'Цены', 'Для школ', 'Политика конфиденциальности', 'Условия использования'],
    uz: ['Humoni sinash', 'Imkoniyatlar', 'Natijalar', 'Narxlar', 'Maktablar uchun', 'Maxfiylik siyosati', 'Foydalanish shartlari'],
  } as Record<Lang, string[]>,
  tm: {
    en: 'SAT® is a trademark of the College Board, which is not affiliated with and does not endorse this product.',
    ru: 'SAT® — товарный знак College Board, который не связан с этим продуктом и не одобряет его.',
    uz: 'SAT® — College Board savdo belgisi; College Board bu mahsulotga aloqador emas va uni tasdiqlamaydi.',
  } as L3,
}

export function Footer() {
  const l = useLang()
  const k = FOOT.links[l]
  const cols: [string, string[][]][] = [
    [FOOT.product[l], [[k[0], '#try'], [k[1], '#features'], [k[2], '#results'], [k[3], '#pricing'], [k[4], '#schools']]],
    [FOOT.legal[l], [[k[5], '/privacy'], [k[6], '/terms']]],
  ]
  return (
    <footer className="border-t border-white/[0.07]">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <span className="flex items-center gap-2.5">
            <HumoLogo className="h-9" />
          </span>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/45">{FOOT.blurb[l]}</p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <p className="text-[13px] font-medium">{h}</p>
            <ul className="mt-3 space-y-2 text-[13px] text-white/45">
              {links.map(([t, href]) => (
                <li key={t}>
                  <a href={href} className="hover:text-white">
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.07]">
        <p className="page-shell py-5 text-[11px] leading-relaxed text-white/30">
          © {new Date().getFullYear()} Humo AI. {FOOT.tm[l]}
        </p>
      </div>
    </footer>
  )
}

const INSIDE: Record<Lang, string[][]> = {
  en: [
    ['Humo on every screen', 'Hints while you practise, explanations when you review.'],
    ['Desmos built in', 'The same calculator and formula sheet as Bluebook.'],
    ['A plan for your test date', 'Weekly tasks you tick off, counting down to exam day.'],
    ['Analytics that guide you', 'Your weak skills and a predicted SAT range.'],
  ],
  ru: [
    ['Humo на каждом экране', 'Подсказки во время практики, объяснения при разборе.'],
    ['Desmos встроен', 'Тот же калькулятор и лист формул, что в Bluebook.'],
    ['План под дату экзамена', 'Недельные задачи с отметками и обратным отсчётом до экзамена.'],
    ['Аналитика, которая ведёт', 'Ваши слабые навыки и прогноз диапазона SAT.'],
  ],
  uz: [
    ['Har bir ekranda Humo', 'Mashqda ishora, tahlilda tushuntirish.'],
    ['Desmos ichiga o‘rnatilgan', 'Bluebookdagi bilan bir xil kalkulyator va formulalar varag‘i.'],
    ['Imtihon sanangga mos reja', 'Belgilab boriladigan haftalik topshiriqlar, imtihon kuniga sanoq.'],
    ['Yo‘l ko‘rsatuvchi analitika', 'Zaif ko‘nikmalaring va taxminiy SAT oralig‘i.'],
  ],
}
const INSIDE_TITLE: L3 = { en: 'Built like a tutor, not a question dump.', ru: 'Устроено как репетитор, а не свалка вопросов.', uz: 'Savollar uyumi emas, ustoz kabi qurilgan.' }

export function Inside() {
  const l = useLang()
  return (
    <section className="border-t border-white/[0.07] py-10 sm:py-12">
      <div className="page-shell">
        <Reveal>
          <h2 className="display max-w-2xl text-[clamp(1.9rem,4vw,3.1rem)]">{INSIDE_TITLE[l]}</h2>
        </Reveal>
        <div className="mt-6 grid gap-px overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          {INSIDE[l].map(([t, b], i) => (
            <motion.div key={t} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: (i % 4) * 0.08, duration: 0.6 }} className="bg-ink">
              <Spotlight className="h-full p-5">
                <h3 className="relative text-[15px] font-semibold tracking-tight">{t}</h3>
                <p className="relative mt-1.5 text-[13.5px] leading-relaxed text-white/50">{b}</p>
              </Spotlight>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
