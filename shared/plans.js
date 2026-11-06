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
/** The only account that can see and open the admin panel. */
export const ADMINS = ['akbarjon160609@gmail.com']

/**
 * The Telegram account of Humo AI's manager, for Click, Payme, Uzcard and Humo card payments.
 * Put the link here (for example "https://t.me/humoai_manager") or set TELEGRAM_MANAGER on the server.
 */
export const TELEGRAM_MANAGER = ''

/** Practice tests Free students can take (test ids). Every other practice test needs Pro. */
export const FREE_TESTS = ['pt15', 'pt16', 'pt14']

/** Exam paper years Free students can take (paper ids start with dsat<yy>-). Other years need Pro. */
export const FREE_PAPER_YEARS = [2023]

/** Can a Free student take this test (practice test or exam paper)? */
export const isFreeTest = (id) => FREE_TESTS.includes(id) || FREE_PAPER_YEARS.some((y) => String(id).startsWith(`dsat${String(y).slice(2)}-`))

/** App pages only Pro students can open (paths under /app). */
export const PRO_PAGES = ['vocab', 'blitz', 'plan']

export const FREE_FEATURES = ['Full question bank: 3,000+ questions, every topic and level', '3 full-length practice tests with a real score', 'Every 2023 exam paper', 'Analytics, mistakes notebook and score calculator', '1 Ask Humo question a day', '1 Desmos Lab solve a day', 'Explanations on every bank question']

export const PRO_FEATURES = [
  'Unlimited Ask Humo and Desmos Lab',
  'Every full-length practice test with a real score',
  'Every exam paper from every year',
  'Video lessons and Learn courses',
  'Personal study plan Humo builds for you',
  'Vocabulary trainer and Blitz',
]

export const formatUzs = (n = PRICE_UZS) => n.toLocaleString('en-US').replace(/,/g, ' ')
