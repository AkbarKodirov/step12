/**
 * Humo AI plans: one source of truth for the server (limits, who is Pro) and the app (prices, copy).
 * Free: the whole question bank + 1 Ask Humo question and 1 Desmos Lab solve a day.
 * Pro: everything, unlimited.
 */
export const PRICE_UZS = 149000
/** Shown next to the so'm price and charged on Visa cards (Stripe works in dollars). */
export const PRICE_USD = 12
export const PRO_DAYS = 30

/** Daily limits on the Free plan. Days start at 00:00 Tashkent time. */
export const FREE_LIMITS = { humo: 1, desmos: 1 }

/** Always Pro, whatever the database says. */
export const ALWAYS_PRO = ['jobirovich.akbarjon@gmail.com']
/** Can open the admin panel (more can be added with the ADMIN_EMAILS setting on the server). */
export const ADMINS = ['jobirovich.akbarjon@gmail.com']

/**
 * The Telegram account of Humo AI's manager, for Click, Payme, Uzcard and Humo card payments.
 * Put the link here (for example "https://t.me/humoai_manager") or set TELEGRAM_MANAGER on the server.
 */
export const TELEGRAM_MANAGER = ''

/** App pages only Pro students can open (paths under /app). */
export const PRO_PAGES = ['tests', 'results', 'papers', 'vocab', 'blitz', 'mistakes', 'plan', 'learn', 'analytics', 'calculator']

export const FREE_FEATURES = ['Full question bank: 3,000+ questions, every topic and level', '1 Ask Humo question a day', '1 Desmos Lab solve a day', 'Explanations on every bank question']

export const PRO_FEATURES = [
  'Unlimited Ask Humo and Desmos Lab',
  'Every full-length practice test with a real score',
  'Video lessons and Learn courses',
  'Personal study plan Humo builds for you',
  'Vocabulary trainer and Blitz',
  'Analytics, mistakes notebook and score reports',
]

export const formatUzs = (n = PRICE_UZS) => n.toLocaleString('en-US').replace(/,/g, ' ')
