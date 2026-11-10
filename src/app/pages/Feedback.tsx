import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bug, Check, HelpCircle, Lightbulb, Loader2, Send } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useStore } from '../store'

type Lang = 'en' | 'ru' | 'uz'
const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Feedback',
    sub: 'Found a bug, have a question or want a new feature? Tell the Humo AI team.',
    bug: 'Report a bug',
    question: 'Ask a question',
    request: 'Request a feature',
    ph_bug: 'What went wrong? Which page were you on and what did you expect?',
    ph_question: 'What would you like to know?',
    ph_request: 'What would you like Humo AI to do?',
    send: 'Send',
    sending: 'Sending…',
    thanks: 'Thank you! We got your message.',
    again: 'Send another',
    short: 'Please write a little more.',
    fail: 'Could not send. Please try again.',
  },
  ru: {
    title: 'Обратная связь',
    sub: 'Нашли ошибку, есть вопрос или идея? Напишите команде Humo AI.',
    bug: 'Сообщить об ошибке',
    question: 'Задать вопрос',
    request: 'Предложить функцию',
    ph_bug: 'Что пошло не так? На какой странице вы были и что ожидали?',
    ph_question: 'Что вы хотите узнать?',
    ph_request: 'Что бы вы хотели, чтобы Humo AI умел?',
    send: 'Отправить',
    sending: 'Отправка…',
    thanks: 'Спасибо! Мы получили ваше сообщение.',
    again: 'Отправить ещё',
    short: 'Напишите, пожалуйста, чуть подробнее.',
    fail: 'Не удалось отправить. Попробуйте ещё раз.',
  },
  uz: {
    title: 'Fikr-mulohaza',
    sub: "Xato topdingizmi, savolingiz yoki taklifingiz bormi? Humo AI jamoasiga yozing.",
    bug: 'Xato haqida xabar berish',
    question: 'Savol berish',
    request: 'Funksiya so‘rash',
    ph_bug: "Nima noto‘g‘ri ketdi? Qaysi sahifada edingiz va nimani kutgandingiz?",
    ph_question: 'Nimani bilmoqchisiz?',
    ph_request: 'Humo AI nimani qila olishini xohlaysiz?',
    send: 'Yuborish',
    sending: 'Yuborilmoqda…',
    thanks: 'Rahmat! Xabaringiz qabul qilindi.',
    again: 'Yana yuborish',
    short: 'Iltimos, bir oz batafsilroq yozing.',
    fail: "Yuborib bo‘lmadi. Qayta urinib ko‘ring.",
  },
}

const KINDS = [
  ['bug', Bug],
  ['question', HelpCircle],
  ['request', Lightbulb],
] as const

export default function Feedback() {
  const { token } = useAuth()
  const { pathname } = useLocation()
  const lang = useStore().settings.language as Lang
  const t = T[lang] ?? T.en
  const [type, setType] = useState<'bug' | 'question' | 'request'>('bug')
  const [msg, setMsg] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState('')

  async function send() {
    if (msg.trim().length < 5) return setErr(t.short)
    setErr('')
    setState('sending')
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, message: msg, page: pathname, language: lang }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || t.fail)
      setMsg('')
      setState('done')
    } catch (e) {
      setErr((e as Error).message || t.fail)
      setState('idle')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <h1 className="text-[26px] font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-[14px] text-moss">{t.sub}</p>
      <div className="card mt-6 p-5 sm:p-6">
        {state === 'done' ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-jg-500/15 text-jg-500">
              <Check className="size-6" />
            </span>
            <p className="mt-3 text-[15px] font-medium">{t.thanks}</p>
            <button onClick={() => setState('idle')} className="btn btn-ghost mt-4 h-10 px-4 text-[13px]">
              {t.again}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {KINDS.map(([k, Icon]) => (
                <button
                  key={k}
                  onClick={() => setType(k)}
                  aria-pressed={type === k}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors ${type === k ? 'border-jg-500 bg-jg-500/10' : 'border-line hover:bg-black/[0.03]'}`}
                >
                  <Icon className="size-4 shrink-0" /> {t[k]}
                </button>
              ))}
            </div>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder={t['ph_' + type]}
              className="mt-4 w-full resize-y rounded-xl border border-line bg-transparent p-3 text-[14px] outline-none focus:border-jg-500"
            />
            {err && <p className="mt-2 text-[13px] text-red-600">{err}</p>}
            <button onClick={send} disabled={state === 'sending'} className="btn btn-green mt-4 h-11 w-full gap-2 px-5 text-[14px] sm:w-auto">
              {state === 'sending' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {state === 'sending' ? t.sending : t.send}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
