/** Suggested-question chips: the same four types every time, but a fresh wording on each chat open, in the student's language. */
import type { Lang } from './greetings'

type Pool = string[][] // one list of variants per question type
type Space = 'humo' | 'desmos'

const POOLS: Record<Space, Record<Lang, Pool>> = {
  humo: {
    en: [
      ['Solve x² − 5x + 6 = 0 with Desmos', 'Solve 3x + 7 = 2x − 4 with Desmos', 'Find the intersection of y = 2x + 1 and y = −x + 7 in Desmos', 'Solve x² + 4x − 12 = 0 with Desmos'],
      ['Make my weekends lighter in my plan', 'Move my hardest topics to the mornings in my plan', 'Add one more practice test to my week', 'Make my plan lighter this week'],
      ['Explain quadratic equations to me', 'Explain how transitions work in Reading & Writing', 'Teach me how to find the slope of a line', 'Explain what "central idea" questions are asking'],
      ['What should I study after my last test?', 'What is my weakest topic right now?', 'What should I focus on this week?', 'How can I raise my score fastest?'],
    ],
    uz: [
      ["x² − 5x + 6 = 0 ni Desmos bilan yech", "3x + 7 = 2x − 4 ni Desmos bilan yech", "y = 2x + 1 va y = −x + 7 chiziqlarning kesishish nuqtasini Desmosda top", "x² + 4x − 12 = 0 ni Desmos bilan yech"],
      ["Rejamdagi dam olish kunlarini yengilroq qil", "Rejamda eng qiyin mavzularni ertalabga ko'chir", "Haftamga yana bitta mashq testi qo'sh", "Shu haftaki rejamni yengilroq qil"],
      ["Kvadrat tenglamalarni tushuntirib ber", "Reading & Writing'dagi transitions savollarini tushuntir", "Chiziqning qiyaligini topishni o'rgat", "\"Central idea\" savollari nimani so'rashini tushuntir"],
      ["Oxirgi testimdan keyin nimani o'rganay?", "Hozir eng zaif mavzum qaysi?", "Bu hafta nimaga e'tibor qaratay?", "Ballimni eng tez qanday oshiraman?"],
    ],
    ru: [
      ['Реши x² − 5x + 6 = 0 с помощью Desmos', 'Реши 3x + 7 = 2x − 4 с помощью Desmos', 'Найди точку пересечения y = 2x + 1 и y = −x + 7 в Desmos', 'Реши x² + 4x − 12 = 0 с помощью Desmos'],
      ['Сделай выходные в моём плане легче', 'Перенеси самые сложные темы в моём плане на утро', 'Добавь в мою неделю ещё один пробный тест', 'Сделай мой план на эту неделю легче'],
      ['Объясни мне квадратные уравнения', 'Объясни, как работают transitions в Reading & Writing', 'Научи меня находить наклон прямой', 'Объясни, о чём спрашивают вопросы про central idea'],
      ['Что мне учить после последнего теста?', 'Какая у меня сейчас самая слабая тема?', 'На чём мне сосредоточиться на этой неделе?', 'Как быстрее всего поднять мой балл?'],
    ],
  },
  desmos: {
    en: [
      ['How do I solve systems in Desmos?', 'How do I find where two graphs intersect in Desmos?', 'How do I graph a system of inequalities in Desmos?', 'How do I find the vertex of a parabola in Desmos?'],
      ['Teach me list regression [ ] ~ [ ]', 'How do I use a slider to test values in Desmos?', 'How do I find a line of best fit in Desmos?', 'Show me how to use a table in Desmos'],
      ['When should I NOT use Desmos?', 'Which SAT Math questions are faster without Desmos?', 'When is Desmos a trap on the SAT?', 'How do I decide between Desmos and algebra?'],
      ['Solve: for what k does x² + kx + 9 = 0 have one solution?', 'Solve: for what k does 2x + 3y = 6 and 4x + ky = 12 have infinitely many solutions?', 'Solve: what is the minimum value of x² − 6x + 11?', 'Solve: for what k does y = x² + k touch the line y = 4?'],
    ],
    uz: [
      ["Desmosda tenglamalar sistemasini qanday yechaman?", "Desmosda ikki grafikning kesishish nuqtasini qanday topaman?", "Desmosda tengsizliklar sistemasini qanday chizaman?", "Desmosda parabola uchini qanday topaman?"],
      ["Ro'yxat regressiyasini o'rgat [ ] ~ [ ]", "Desmosda qiymatlarni sinash uchun slayderdan qanday foydalanaman?", "Desmosda eng mos to'g'ri chiziqni qanday topaman?", "Desmosda jadvaldan qanday foydalanishni ko'rsat"],
      ["Desmosdan qachon FOYDALANMASLIK kerak?", "Qaysi SAT Math savollari Desmossiz tezroq yechiladi?", "SAT'da Desmos qachon tuzoqqa aylanadi?", "Desmos va algebra o'rtasida qanday tanlayman?"],
      ["Yech: k ning qanday qiymatida x² + kx + 9 = 0 ning bitta yechimi bor?", "Yech: k ning qanday qiymatida 2x + 3y = 6 va 4x + ky = 12 cheksiz ko'p yechimga ega?", "Yech: x² − 6x + 11 ning eng kichik qiymati nimaga teng?", "Yech: k ning qanday qiymatida y = x² + k grafigi y = 4 chiziqqa tegadi?"],
    ],
    ru: [
      ['Как решать системы уравнений в Desmos?', 'Как найти точку пересечения двух графиков в Desmos?', 'Как построить систему неравенств в Desmos?', 'Как найти вершину параболы в Desmos?'],
      ['Научи меня регрессии по спискам [ ] ~ [ ]', 'Как использовать ползунок для проверки значений в Desmos?', 'Как найти прямую наилучшего соответствия в Desmos?', 'Покажи, как пользоваться таблицей в Desmos'],
      ['Когда НЕ стоит использовать Desmos?', 'Какие вопросы SAT Math быстрее решать без Desmos?', 'Когда Desmos становится ловушкой на SAT?', 'Как выбрать между Desmos и алгеброй?'],
      ['Реши: при каком k уравнение x² + kx + 9 = 0 имеет одно решение?', 'Реши: при каком k система 2x + 3y = 6 и 4x + ky = 12 имеет бесконечно много решений?', 'Реши: каково наименьшее значение x² − 6x + 11?', 'Реши: при каком k график y = x² + k касается прямой y = 4?'],
    ],
  },
}

const lastPick: Record<string, number[]> = {}

/** One random variant per question type, avoiding the wording shown the last time the chat was opened. */
export function pickSuggestionIndexes(space: Space, lang: Lang): number[] {
  const pool = POOLS[space][lang] ?? POOLS[space].en
  const prev = lastPick[space] ?? []
  const next = pool.map((v, i) => {
    let n = Math.floor(Math.random() * v.length)
    if (v.length > 1 && n === prev[i]) n = (n + 1 + Math.floor(Math.random() * (v.length - 1))) % v.length
    return n
  })
  lastPick[space] = next
  return next
}

export function suggestionsFor(space: Space, lang: Lang, idx: number[]): string[] {
  const pool = POOLS[space][lang] ?? POOLS[space].en
  return pool.map((v, i) => v[(idx[i] ?? 0) % v.length])
}
