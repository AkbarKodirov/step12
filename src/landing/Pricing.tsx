import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, School } from 'lucide-react'
import { motion } from 'framer-motion'
import { TELEGRAM_MANAGER } from '../../shared/plans.js'
import { useLang, type Lang } from './i18n'
import { Mascot } from './Roadmap'

const T = {
  en: {
    title: 'Less than one private lesson a month.',
    sub: 'Start free. Upgrade when your test date gets close.',
    free: { note: 'For trying Humo AI', price: '0', unit: "so'm", cta: 'Start free', f: ['Full question bank: 4,000+ questions', '3 free Ask Humo chats and 1 Desmos AI chat a day', '1 Blitz run a day', '3 full practice tests', 'Study plan, vocabulary, analytics and mistakes'] },
    pro: { note: 'For students with a test date', unit: "so'm / month · ≈ $12", badge: 'Most chosen', cta: 'Start with Pro', f: ['Unlimited Ask Humo, Desmos AI and Blitz', 'Every full-length practice test', 'All exam papers', 'Video lessons and Learn courses', 'Humo reviews every mistake with you'] },
    schools: { name: 'For schools', note: 'One plan for the whole school', title: 'Humo AI for every student in your school, at once.', body: 'Your school gets Pro-level Humo AI for all its students on the same day. We set up the accounts, and teachers can follow progress.', f: ['Everyone gets full Humo AI, Desmos AI and all practice tests', 'Quick setup: no student signs up one by one', 'Teachers see progress and weak topics', 'Price depends on your school. We will send an offer.'], cta: 'Request for my school', price: 'Custom', unit: 'contact us', card: ['Humo AI for all your students at once', 'Every student gets all Pro features', 'Teachers can follow student progress', 'We help set up and onboard your school'], form: { school: 'School name', name: 'Your name', contact: 'Phone, Telegram or email', note: 'Anything we should know? (optional)', send: 'Send request', sending: 'Sending…', done: 'Thank you! We will contact you soon.', err: 'Could not send. Try again or message us on Telegram.', tg: 'Or message us on Telegram' } },
  },
  ru: {
    title: 'Дешевле одного частного урока в месяц.',
    sub: 'Начните бесплатно. Переходите на Pro, когда экзамен ближе.',
    free: { note: 'Чтобы попробовать Humo AI', price: '0', unit: 'сум', cta: 'Начать бесплатно', f: ['Полный банк вопросов: 4 000+ вопросов', '3 бесплатных чата с Humo и 1 чат с Desmos AI в день', '1 заход в Blitz в день', '3 полных пробных теста', 'План обучения, словарь, аналитика и ошибки'] },
    pro: { note: 'Для тех, у кого есть дата экзамена', unit: 'сум / месяц · ≈ $12', badge: 'Чаще выбирают', cta: 'Начать с Pro', f: ['Безлимитные Humo, Desmos AI и Blitz', 'Все полные пробные тесты', 'Все экзаменационные работы', 'Видеоуроки и курсы Learn', 'Humo разбирает с вами каждую ошибку'] },
    schools: { name: 'Для школ', note: 'Один тариф для всей школы', title: 'Humo AI для каждого ученика вашей школы сразу.', body: 'Школа получает Humo AI уровня Pro для всех учеников в один день. Мы создаём аккаунты, а учителя следят за прогрессом.', f: ['Каждый получает полный Humo AI, Desmos AI и все пробные тесты', 'Быстрая настройка: ученикам не нужно регистрироваться по одному', 'Учителя видят прогресс и слабые темы', 'Цена зависит от школы. Мы пришлём предложение.'], cta: 'Оставить заявку для школы', price: 'Индивидуально', unit: 'свяжитесь с нами', card: ['Humo AI для всех учеников сразу', 'Каждый ученик получает все функции Pro', 'Учителя следят за прогрессом учеников', 'Поможем настроить и подключить школу'], form: { school: 'Название школы', name: 'Ваше имя', contact: 'Телефон, Telegram или email', note: 'Что нам важно знать? (необязательно)', send: 'Отправить заявку', sending: 'Отправляем…', done: 'Спасибо! Скоро свяжемся с вами.', err: 'Не удалось отправить. Попробуйте ещё раз или напишите в Telegram.', tg: 'Или напишите нам в Telegram' } },
  },
  uz: {
    title: 'Oyiga bitta xususiy darsdan arzonroq.',
    sub: "Bepul boshlang. Imtihon sanasi yaqinlashganda Pro'ga o'ting.",
    free: { note: "Humo AI'ni sinab ko'rish uchun", price: '0', unit: "so'm", cta: 'Bepul boshlash', f: ["To'liq savollar banki: 4 000+ savol", "Kuniga 3 ta bepul Humo chati va 1 ta Desmos AI chati", 'Kuniga 1 marta Blitz', "3 ta to'liq mashq testi", "O'quv reja, lug'at, tahlil va xatolar"] },
    pro: { note: 'Imtihon sanasi borlar uchun', unit: "so'm / oy · ≈ $12", badge: 'Eng ko\'p tanlanadi', cta: "Pro bilan boshlash", f: ["Cheksiz Humo, Desmos AI va Blitz", "Barcha to'liq mashq testlari", 'Barcha imtihon qog\'ozlari', 'Video darslar va Learn kurslari', 'Humo har bir xatoni siz bilan tahlil qiladi'] },
    schools: { name: 'Maktablar uchun', note: 'Butun maktab uchun bitta reja', title: "Maktabingizdagi har bir o'quvchi uchun Humo AI, bir vaqtda.", body: "Maktabingiz barcha o'quvchilari uchun Pro darajasidagi Humo AI'ni bir kunda oladi. Akkauntlarni biz ochamiz, o'qituvchilar esa natijalarni kuzatadi.", f: ["Hamma to'liq Humo AI, Desmos AI va barcha mashq testlarini oladi", "Tez sozlash: o'quvchilar birma-bir ro'yxatdan o'tmaydi", "O'qituvchilar progress va zaif mavzularni ko'radi", "Narx maktabga qarab belgilanadi. Taklif yuboramiz."], cta: "Maktabim uchun so'rov", price: 'Kelishuv asosida', unit: "biz bilan bog'laning", card: ['Barcha o\'quvchilar uchun bir vaqtda Humo AI', 'Har bir o\'quvchi Pro imkoniyatlarining hammasini oladi', 'O\'qituvchilar o\'quvchilar progressini kuzatadi', 'Maktabni sozlash va ulashda yordam beramiz'], form: { school: 'Maktab nomi', name: 'Ismingiz', contact: 'Telefon, Telegram yoki email', note: "Bilishimiz kerak bo'lgan narsa? (ixtiyoriy)", send: "So'rov yuborish", sending: 'Yuborilmoqda…', done: "Rahmat! Tez orada siz bilan bog'lanamiz.", err: "Yuborib bo'lmadi. Qayta urinib ko'ring yoki Telegram'da yozing.", tg: "Yoki Telegram'da yozing" } },
  },
} as const

function SchoolForm({ t }: { t: (typeof T)[Lang]['schools']['form'] }) {
  const [v, setV] = useState({ school: '', name: '', contact: '', note: '' })
  const [st, setSt] = useState<'idle' | 'sending' | 'done' | 'err'>('idle')
  async function send(e: React.FormEvent) {
    e.preventDefault()
    setSt('sending')
    try {
      const r = await fetch('/api/schools-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
      setSt(r.ok ? 'done' : 'err')
    } catch {
      setSt('err')
    }
  }
  if (st === 'done') return <p className="rounded-2xl bg-jg-500/15 px-4 py-4 text-[15px] font-medium text-jg-300">{t.done}</p>
  const input = 'h-11 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 text-[14px] text-white placeholder:text-white/35 focus:border-jg-400 focus:outline-none'
  return (
    <form onSubmit={send} className="grid gap-3">
      <input required className={input} placeholder={t.school} value={v.school} onChange={(e) => setV({ ...v, school: e.target.value })} />
      <input className={input} placeholder={t.name} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      <input required className={input} placeholder={t.contact} value={v.contact} onChange={(e) => setV({ ...v, contact: e.target.value })} />
      <textarea rows={3} className={`${input} h-auto py-2.5`} placeholder={t.note} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
      {st === 'err' && <p className="text-[13px] text-amber-300">{t.err}</p>}
      <button disabled={st === 'sending'} className="h-11 rounded-full bg-jg-500 text-[14px] font-medium text-white transition hover:bg-jg-400 disabled:opacity-60">{st === 'sending' ? t.sending : t.send}</button>
      <a href={TELEGRAM_MANAGER} target="_blank" rel="noreferrer" className="text-center text-[13px] text-white/55 underline-offset-4 hover:text-white hover:underline">{t.tg}</a>
    </form>
  )
}

export function Pricing() {
  const lang = useLang()
  const t = T[lang]
  const plans: { name: string; price: string; unit: string; note: string; cta: string; features: readonly string[]; featured: boolean; school?: boolean }[] = [
    { name: 'Free', price: t.free.price, unit: t.free.unit, note: t.free.note, cta: t.free.cta, features: t.free.f, featured: false, pose: 'hello' },
    { name: 'Pro', price: '149 000', unit: t.pro.unit, note: t.pro.note, cta: t.pro.cta, features: t.pro.f, featured: true, pose: 'scholar' },
  ]
  const [open, setOpen] = useState(false)
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-white/[0.07] py-10 sm:py-14">
      <div className="page-shell">
        <div className="max-w-xl">
          <h2 className="display text-[clamp(1.9rem,4vw,3.1rem)]">{t.title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/55">{t.sub}</p>
        </div>
        <div className="mt-7 grid gap-3 lg:grid-cols-3">
          {plans.map((p, i) => (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              key={p.name}
              className={`relative flex flex-col rounded-[24px] p-6 ${p.featured ? 'border border-jg-500/40 bg-gradient-to-b from-jg-500/[0.12] via-jg-500/[0.03] to-transparent' : 'panel'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[17px] font-semibold">{p.name}</h3>
                  <p className="mt-1 text-[13px] text-white/45">{p.note}</p>
                  {p.featured && <span className="mt-2 inline-block rounded-full bg-jg-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">{t.pro.badge}</span>}
                </div>
                <Mascot pose={p.pose} className="-mt-2 size-24 shrink-0 sm:size-28" />
              </div>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-[40px] font-semibold tracking-tight tabular-nums">{p.price}</span>
                <span className="text-[13px] text-white/45">{p.unit}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-[14px] text-white/75">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-jg-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className={`mt-6 h-11 rounded-full text-center text-[14px] font-medium leading-[44px] transition ${p.featured ? 'bg-jg-500 text-white hover:bg-jg-400' : 'border border-white/15 hover:border-white/30 hover:bg-white/[0.04]'}`}>
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <div id="schools" className="panel mt-3 grid gap-6 rounded-[24px] p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-jg-300"><School className="size-4" /> {t.schools.name}</p>
            <h3 className="display mt-3 text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.1]">{t.schools.title}</h3>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/60">{t.schools.body}</p>
            <ul className="mt-6 space-y-3 text-[14px] text-white/75">
              {t.schools.f.map((f) => (
                <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-jg-400" />{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <Mascot pose="reading" className="mx-auto mb-2 hidden size-28 lg:block" />
            {open ? <SchoolForm t={t.schools.form} /> : (
              <button onClick={() => setOpen(true)} className="h-11 w-full rounded-full bg-jg-500 text-[14px] font-medium text-white transition hover:bg-jg-400 lg:mt-4">{t.schools.cta}</button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
