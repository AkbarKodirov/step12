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
      en: 'I was struggling with math until Desmos AI helped me master Desmos. The Desmos lessons were what finally raised my math score.',
      ru: 'Математика давалась мне тяжело, пока Desmos AI не помог освоить Desmos. Именно уроки Desmos подняли мой балл по математике.',
      uz: "Matematikada qiynalardim, Desmos AI Desmosni o'rganishga yordam berdi. Matematika balimni oshirgan narsa Desmos darslari bo'ldi.",
    },
  },
  {
    name: 'Azizbek Gayratov',
    rw: 710,
    math: 790,
    date: [2025, 11, 8],
    tags: { en: ['Practice tests', 'Mistake notebook'], ru: ['Пробные тесты', 'Тетрадь ошибок'], uz: ['Practice testlar', 'Xatolar daftari'] },
    quote: {
      en: 'The practice tests felt just like Bluebook, and the mistake notebook kept bringing my weak spots back until I fixed them.',
      ru: 'Пробные тесты были очень похожи на Bluebook, а тетрадь ошибок возвращала слабые темы, пока я их не исправил.',
      uz: "Practice testlar Bluebookga juda o'xshash edi, xatolar daftari esa zaif joylarimni to'g'rilaguncha qaytarib turdi.",
    },
  },
  {
    name: 'Baxtiyor Boybutayev',
    rw: 610,
    math: 750,
    date: [2026, 8, 22],
    tags: { en: ['Ask Humo', 'Vocabulary'], ru: ['Спросить Humo', 'Словарь'], uz: ['Humodan so‘rash', 'Lug‘at'] },
    quote: {
      en: 'Humo explained my English mistakes step by step, and the vocabulary practice helped me read passages faster.',
      ru: 'Humo шаг за шагом объяснял мои ошибки по английскому, а словарь помог быстрее читать тексты.',
      uz: "Humo ingliz tilidagi xatolarimni bosqichma-bosqich tushuntirdi, lug'at mashqlari esa matnlarni tezroq o'qishga yordam berdi.",
    },
  },
  {
    name: 'Ulugbek Norboboyev',
    rw: 650,
    math: 700,
    date: [2026, 3, 14],
    tags: { en: ['Study plan', 'Blitz'], ru: ['План обучения', 'Blitz'], uz: ['O‘quv reja', 'Blitz'] },
    quote: {
      en: 'The weekly study plan kept me consistent, and a quick Blitz run before each session got me warmed up.',
      ru: 'Недельный план помогал заниматься регулярно, а быстрый Blitz перед занятием хорошо разогревал.',
      uz: "Haftalik reja meni muntazam qildi, har mashg'ulotdan oldingi tezkor Blitz esa yaxshi qizdirdi.",
    },
  },
  {
    name: "Elyorbek G'aniyev",
    rw: 650,
    math: 640,
    date: [2026, 5, 2],
    tags: { en: ['Analytics', 'Question bank'], ru: ['Аналитика', 'Банк вопросов'], uz: ['Analitika', 'Savollar banki'] },
    quote: {
      en: 'Analytics showed me exactly which skills were costing me points, then I drilled them in the question bank.',
      ru: 'Аналитика точно показала, какие навыки отнимают баллы, и я отрабатывал их в банке вопросов.',
      uz: "Analitika qaysi ko'nikmalar bal yo'qotayotganini aniq ko'rsatdi, keyin ularni savollar bankida mashq qildim.",
    },
  },
  {
    name: 'Bunyodbek Sobirov',
    rw: 620,
    math: 600,
    date: [2026, 11, 8],
    tags: { en: ['Practice tests', 'Mistake notebook'], ru: ['Пробные тесты', 'Тетрадь ошибок'], uz: ['Practice testlar', 'Xatolar daftari'] },
    quote: {
      en: 'Full-length practice tests taught me pacing, and the notebook made sure I never repeated the same mistake.',
      ru: 'Полные пробные тесты научили меня распределять время, а тетрадь ошибок не давала повторять одно и то же.',
      uz: "To'liq practice testlar vaqtni taqsimlashni o'rgatdi, xatolar daftari esa bir xil xatoni takrorlashimga yo'l qo'ymadi.",
    },
  },
  {
    name: 'Sherbek Abdugafurov',
    rw: 720,
    math: 770,
    date: [2026, 11, 8],
    tags: { en: ['Desmos AI', 'Practice tests'], ru: ['Desmos AI', 'Пробные тесты'], uz: ['Desmos AI', 'Practice testlar'] },
    quote: {
      en: 'Sending a photo of a hard math question to Desmos AI saved me hours, and timed practice tests prepared me for test day.',
      ru: 'Фото сложной задачи в Desmos AI экономило мне часы, а пробные тесты на время подготовили к экзамену.',
      uz: "Qiyin matematika savolining rasmini Desmos AIga yuborish menga soatlab vaqt tejadi, vaqtli practice testlar esa imtihonga tayyorladi.",
    },
  },
  {
    name: 'Zilola Shayxova',
    rw: 630,
    math: 790,
    date: [2026, 10, 3],
    tags: { en: ['Desmos lessons', 'Vocabulary'], ru: ['Уроки Desmos', 'Словарь'], uz: ['Desmos darslari', 'Lug‘at'] },
    quote: {
      en: 'The Desmos video lessons turned math into my strongest section, and daily vocabulary work lifted my English.',
      ru: 'Видеоуроки Desmos сделали математику моим сильнейшим разделом, а ежедневный словарь подтянул английский.',
      uz: "Desmos video darslari matematikani eng kuchli bo'limimga aylantirdi, kundalik lug'at esa ingliz tilimni oshirdi.",
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
