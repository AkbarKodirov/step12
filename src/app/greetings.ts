/** Humo never says the same hello twice in a row: 20 ways, in English, O'zbekcha and Русский. */
const HELLOS = [
  (n: string) => `What's up${n}?`,
  (n: string) => `Hey${n}!`,
  (n: string) => `Salom${n}!`,
  (n: string) => `Assalomu alaykum${n}!`,
  (n: string) => `Qalaysiz${n}?`,
  (n: string) => `Nima gap${n}?`,
  (n: string) => `Привет${n}!`,
  (n: string) => `Как дела${n}?`,
  (n: string) => `Good to see you${n}!`,
  (n: string) => `Welcome back${n}!`,
  (n: string) => `Ready when you are${n}.`,
  (n: string) => `Look who's here${n}!`,
  (n: string) => `Hi there${n}!`,
  (n: string) => `Yo${n}, let's get points.`,
  (n: string) => `Back for more${n}?`,
  (n: string) => `How's it going${n}?`,
  (n: string) => `Let's do this${n}.`,
  (n: string) => `Hello hello${n}!`,
  (n: string) => `Xush kelibsiz${n}!`,
  (n: string) => `Рад тебя видеть${n}!`,
]

let last = -1
/** A fresh greeting each call (never the same as the previous one). Pass a first name to personalise. */
export function hello(name?: string | null) {
  let i = Math.floor(Math.random() * HELLOS.length)
  if (i === last) i = (i + 1) % HELLOS.length
  last = i
  return HELLOS[i](name ? `, ${name}` : '')
}

/** One greeting per day for headings (stable while the page re-renders). */
export function helloOfDay(name?: string | null) {
  const d = Math.floor(Date.now() / 86400000)
  return HELLOS[(d * 7) % HELLOS.length](name ? `, ${name}` : '')
}
