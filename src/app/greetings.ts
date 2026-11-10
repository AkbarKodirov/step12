/** Humo greets in the language the student chose (English, O'zbekcha or Русский), never mixing them. */
export type Lang = 'en' | 'uz' | 'ru'

const HELLOS: Record<Lang, ((n: string) => string)[]> = {
  en: [
    (n) => `Welcome${n}!`,
    (n) => `Hey${n}!`,
    (n) => `Good to see you${n}!`,
    (n) => `Welcome back${n}!`,
    (n) => `Ready when you are${n}.`,
    (n) => `Hi there${n}!`,
    (n) => `Let's do this${n}.`,
    (n) => `Hello${n}!`,
  ],
  uz: [
    (n) => `Xush kelibsiz${n}!`,
    (n) => `Salom${n}!`,
    (n) => `Assalomu alaykum${n}!`,
    (n) => `Qalaysiz${n}?`,
    (n) => `Sizni ko'rib xursandmiz${n}!`,
    (n) => `Boshlaymizmi${n}?`,
  ],
  ru: [
    (n) => `Добро пожаловать${n}!`,
    (n) => `Привет${n}!`,
    (n) => `Как дела${n}?`,
    (n) => `Рад тебя видеть${n}!`,
    (n) => `С возвращением${n}!`,
    (n) => `Начнём${n}?`,
  ],
}

const last: Record<Lang, number> = { en: -1, uz: -1, ru: -1 }
/** A fresh greeting in the chosen language (never the same as the previous one). Pass a first name to personalise. */
export function hello(name?: string | null, lang: Lang = 'en') {
  const l = HELLOS[lang] ? lang : 'en'
  const list = HELLOS[l]
  let i = Math.floor(Math.random() * list.length)
  if (i === last[l]) i = (i + 1) % list.length
  last[l] = i
  return list[i](name ? `, ${name}` : '')
}

/** Time-of-day greeting in the chosen language. */
export function timeGreeting(hour: number, lang: Lang = 'en') {
  const k = hour < 5 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3
  return {
    en: ['Good night', 'Good morning', 'Good afternoon', 'Good evening'],
    uz: ['Xayrli tun', 'Xayrli tong', 'Xayrli kun', 'Xayrli kech'],
    ru: ['Доброй ночи', 'Доброе утро', 'Добрый день', 'Добрый вечер'],
  }[lang]?.[k] ?? 'Hello'
}
