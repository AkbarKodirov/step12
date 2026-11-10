import { motion } from 'framer-motion'
import { Reveal } from '../components/motion'
import { useLang, type Lang } from './i18n'

type Student = {
  name: string
  rw: number
  math: number
  date: [number, number, number] // year, month (1-12), day
  tags: Record<Lang, string[]>
  quote: Record<Lang, string>
}

const STUDENTS: Student[] = [
  {
    name: 'Umar Shoyoqubov',
    rw: 710,
    math: 760,
    date: [2026, 3, 14],
    tags: { en: ['Desmos AI', 'Desmos lessons'], ru: ['Desmos AI', 'Уроки Desmos'], uz: ['Desmos AI', 'Desmos darslari'] },
    quote: {
      en: "honestly math was killing me. then I started asking Desmos AI and it showed me how to actually use Desmos, and the Desmos lessons did the rest. 760 still feels fake lol",
      ru: "честно, математика меня убивала. потом начал спрашивать Desmos AI, он показал, как вообще пользоваться Desmos, а уроки Desmos сделали остальное. 760 до сих пор как будто не моё",
      uz: "rostini aytsam, matematika meni o'ldirayotgan edi. keyin Desmos AIdan so'ray boshladim, u Desmosdan qanday foydalanishni ko'rsatdi, qolganini Desmos darslari qildi. 760 hali ham yolg'ondek tuyuladi",
    },
  },
  {
    name: 'Azizbek Gayratov',
    rw: 710,
    math: 790,
    date: [2025, 11, 8],
    tags: { en: ['Practice tests', 'Mistake notebook'], ru: ['Пробные тесты', 'Тетрадь ошибок'], uz: ['Practice testlar', 'Xatolar daftari'] },
    quote: {
      en: "I did the practice tests in order and went through my mistake notebook every Sunday. Boring, but it works.",
      ru: "Проходил пробные тесты по порядку и каждое воскресенье разбирал тетрадь ошибок. Скучно, зато работает.",
      uz: "Practice testlarni tartib bilan ishlab, har yakshanba xatolar daftarimni ko'rib chiqardim. Zerikarli, lekin ishlaydi.",
    },
  },
  {
    name: 'Baxtiyor Boybutayev',
    rw: 610,
    math: 750,
    date: [2026, 8, 22],
    tags: { en: ['Ask Humo', 'Vocabulary'], ru: ['Спросить Humo', 'Словарь'], uz: ['Humodan so‘rash', 'Lug‘at'] },
    quote: {
      en: "Math was fine already. My English was the problem, mostly grammar. I'd ask Humo why my answer was wrong, in Uzbek, and it finally clicked. Also did vocab on the bus.",
      ru: "С математикой и так было нормально. Проблемой был английский, в основном грамматика. Спрашивал Humo, почему мой ответ неверный, и наконец дошло. Слова ещё учил в автобусе.",
      uz: "Matematika o'zi yaxshi edi. Muammo ingliz tilida, asosan grammatikada edi. Humodan javobim nega xato ekanini o'zbekcha so'rardim, va nihoyat tushundim. Lug'atni avtobusda ishlardim.",
    },
  },
  {
    name: 'Ulugbek Norboboyev',
    rw: 650,
    math: 700,
    date: [2026, 3, 14],
    tags: { en: ['Study plan', 'Blitz'], ru: ['План обучения', 'Blitz'], uz: ['O‘quv reja', 'Blitz'] },
    quote: {
      en: "Without the study plan I would have studied only when I felt like it. It told me what to do each day. Blitz was good for ten minutes before bed.",
      ru: "Без плана я бы занимался только когда захочется. Он говорил, что делать каждый день. Blitz хорошо заходил минут на десять перед сном.",
      uz: "Rejasiz faqat xohlaganimda o'qigan bo'lardim. U har kuni nima qilishni aytib turdi. Blitz uxlashdan oldin o'n daqiqaga yaxshi edi.",
    },
  },
  {
    name: "Elyorbek G'aniyev",
    rw: 650,
    math: 640,
    date: [2026, 5, 2],
    tags: { en: ['Analytics', 'Question bank'], ru: ['Аналитика', 'Банк вопросов'], uz: ['Analitika', 'Savollar banki'] },
    quote: {
      en: "Analytics page showed my geometry was terrible. I had no idea. Spent two weeks only on that in the question bank.",
      ru: "Страница аналитики показала, что с геометрией у меня беда. Я вообще не знал. Две недели сидел только над ней в банке вопросов.",
      uz: "Analitika sahifasi geometriyam juda yomonligini ko'rsatdi. Bilmagan ekanman. Ikki hafta faqat shu mavzuni savollar bankida ishladim.",
    },
  },
  {
    name: 'Bunyodbek Sobirov',
    rw: 620,
    math: 600,
    date: [2026, 11, 8],
    tags: { en: ['Practice tests', 'Pacing'], ru: ['Пробные тесты', 'Темп'], uz: ['Practice testlar', 'Tempo'] },
    quote: {
      en: "My score isn't amazing but I started from way lower. The full practice tests showed me I was running out of time, so I fixed that first.",
      ru: "Балл не фантастический, но начинал я намного ниже. Полные пробные тесты показали, что мне не хватает времени, так что сначала исправил это.",
      uz: "Ballim a'lo emas, lekin ancha pastdan boshlagan edim. To'liq practice testlar vaqtim yetmayotganini ko'rsatdi, avval shuni tuzatdim.",
    },
  },
  {
    name: 'Sherbek Abdugafurov',
    rw: 720,
    math: 770,
    date: [2026, 11, 8],
    tags: { en: ['Desmos AI', 'Practice tests'], ru: ['Desmos AI', 'Пробные тесты'], uz: ['Desmos AI', 'Practice testlar'] },
    quote: {
      en: "Hard math questions used to take me forever. I'd just take a photo, send it to Desmos AI and see how it sets it up on the graph. Saved me so much time before the exam.",
      ru: "Сложные задачи по математике раньше занимали у меня вечность. Просто фотографировал, отправлял в Desmos AI и смотрел, как он строит это на графике. Перед экзаменом сэкономило кучу времени.",
      uz: "Qiyin matematika savollari menga juda ko'p vaqt olardi. Shunchaki rasmga olib Desmos AIga yuborardim va u grafikda qanday qurishini ko'rardim. Imtihon oldidan juda ko'p vaqtimni tejadi.",
    },
  },
  {
    name: 'Zilola Shayxova',
    rw: 630,
    math: 790,
    date: [2026, 10, 3],
    tags: { en: ['Desmos lessons', 'Desmos Lab'], ru: ['Уроки Desmos', 'Desmos Lab'], uz: ['Desmos darslari', 'Desmos Lab'] },
    quote: {
      en: "Desmos video lessons were the best part for me. 790 in math came from those and the Desmos Lab. English is still my weak side, I know.",
      ru: "Видеоуроки Desmos для меня лучшее. 790 по математике — это они и Desmos Lab. Английский всё ещё слабая сторона, знаю.",
      uz: "Desmos video darslari men uchun eng yaxshisi bo'ldi. Matematikadagi 790 ularning va Desmos Labning natijasi. Ingliz tilim hali ham zaif, bilaman.",
    },
  },
]

const MONTHS: Record<Lang, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
}
const fmtDate = (l: Lang, [y, m, d]: Student['date']) => (l === 'en' ? `${MONTHS.en[m - 1]} ${d}, ${y}` : l === 'ru' ? `${d} ${MONTHS.ru[m - 1]} ${y}` : `${d}-${MONTHS.uz[m - 1]}, ${y}`)

const TX = {
  title: { en: 'Real students. Real SAT scores.', ru: 'Настоящие ученики. Настоящие баллы SAT.', uz: 'Haqiqiy o‘quvchilar. Haqiqiy SAT ballari.' },
  sub: {
    en: 'Students who prepared with Humo AI, with the scores they got on test day.',
    ru: 'Ученики, которые готовились с Humo AI, и баллы, которые они получили на экзамене.',
    uz: 'Humo AI bilan tayyorlangan o‘quvchilar va ular imtihonda olgan ballar.',
  },
  rw: { en: 'English', ru: 'Английский', uz: 'Ingliz tili' },
  math: { en: 'Math', ru: 'Математика', uz: 'Matematika' },
  total: { en: 'Total', ru: 'Итого', uz: 'Jami' },
  used: { en: 'Used', ru: 'Пользовался', uz: 'Foydalangan' },
}

function initials(n: string) {
  return n
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Results() {
  const l = useLang()
  return (
    <section id="results" className="scroll-mt-20 border-t border-white/[0.07] py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="display text-[clamp(1.9rem,4vw,3.1rem)]">{TX.title[l]}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/55">{TX.sub[l]}</p>
        </Reveal>
      </div>
      {/* phones swipe sideways; wider screens show a grid */}
      <ul className="mx-auto mt-6 flex max-w-7xl snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-6 lg:grid-cols-4">
        {STUDENTS.map((s, i) => (
          <motion.li
            key={s.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: (i % 4) * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="panel flex w-[82%] shrink-0 snap-center flex-col rounded-[22px] p-5 sm:w-auto"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-jg-500/15 text-[13px] font-semibold text-jg-300">{initials(s.name)}</span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold tracking-tight">{s.name}</p>
                <p className="text-[12px] text-white/40">{fmtDate(l, s.date)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3 border-y border-white/[0.07] py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40">{TX.total[l]}</p>
                <p className="font-serif text-[34px] leading-none tabular-nums">{s.rw + s.math}</p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[11px] text-white/40">{TX.rw[l]}</p>
                  <p className="text-[18px] font-semibold tabular-nums text-jg-300">{s.rw}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/40">{TX.math[l]}</p>
                  <p className="text-[18px] font-semibold tabular-nums text-jg-300">{s.math}</p>
                </div>
              </div>
            </div>
            <p className="mt-4 flex-1 text-[14px] leading-relaxed text-white/70">“{s.quote[l]}”</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {s.tags[l].map((t) => (
                <span key={t} className="rounded-full border border-jg-500/30 bg-jg-500/10 px-2.5 py-0.5 text-[11.5px] text-jg-200">
                  {t}
                </span>
              ))}
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
