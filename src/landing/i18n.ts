import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'ru' | 'uz'
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'ru', label: 'RU' },
  { id: 'uz', label: 'UZ' },
]

const KEY = 'humo.lang'
const listeners = new Set<() => void>()

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'ru' || saved === 'uz') return saved
    // else the Humo reply language saved in the student's app settings
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      if (!k.startsWith('humo.progress.')) continue
      const v = JSON.parse(localStorage.getItem(k) || '{}')?.settings?.language
      if (v === 'en' || v === 'ru' || v === 'uz') return v
    }
  } catch {
    /* storage blocked */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase()
  if (nav.startsWith('uz')) return 'uz'
  if (nav.startsWith('ru')) return 'ru'
  return 'en'
}

let current: Lang = detect()

export function setLang(l: Lang) {
  current = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* storage blocked */
  }
  document.documentElement.lang = l
  listeners.forEach((f) => f())
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => listeners.delete(f)
    },
    () => current,
    () => 'en' as Lang,
  )
}

/** Pick the text for the current language from an {en, ru, uz} object. */
export function pick<T>(l: Lang, v: Record<Lang, T>): T {
  return v[l]
}
