// Text-based difficulty and domain guesses for SAT Math questions (used for questions with no official rating).
// score() is higher for longer, student-produced, multi-concept, constant/parameter and discriminant-type questions.
export const plain = (s) =>
  String(s || '')
    .replace(/<sup>(.*?)<\/sup>/g, '^$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const TOPIC_W = {
  'Linear equations in one variable': 0, 'Linear functions': 0.5, 'Linear equations in two variables': 0.5,
  'Systems of two linear equations in two variables': 0.8, 'Linear inequalities in one or two variables': 0.5,
  'Nonlinear functions': 1.2, 'Nonlinear equations in one variable and systems of equations in two variables': 1.5, 'Equivalent expressions': 1,
  'Ratios, rates, proportional relationships, and units': 0.3, Percentages: 0.5,
  'One-variable data: Distributions and measures of center and spread': 0.3, 'Two-variable data: Models and scatterplots': 0.5,
  'Probability and conditional probability': 0.5, 'Inference from sample statistics and margin of error': 0.5,
  'Evaluating statistical claims: Observational studies and experiments': 0.3, 'Area and volume': 1, 'Lines, angles, and triangles': 0.8,
  'Right triangles and trigonometry': 1.2, Circles: 1.5,
}

export function score(q) {
  const t = plain(q.question)
  const opts = (q.options || []).map(plain).join(' ')
  let s = Math.min(t.length, 500) / 150
  if (q.format === 'sa') s += 1.2
  s += TOPIC_W[q.topic] ?? 0.8
  if (/constant/.test(t)) s += 0.6
  if (/least|greatest|minimum|maximum|possible/i.test(t)) s += 0.6
  if (/no real solution|exactly one|infinitely many|no solution|distinct|two solutions/i.test(t)) s += 0.8
  if (/interpret|represents|best describes/i.test(t)) s -= 0.5
  s += Math.min((t.match(/\d+(\.\d+)?/g) || []).length, 10) * 0.1
  if (/[²³^√π]|sin|cos|tan/.test(t + opts)) s += 0.5
  if (/%/.test(t) && /\d/.test(t)) s += 0.2
  if (q.image) s += 0.3
  return s
}

// returns the question's domain from its words, for questions that carry no topic (exam paper questions)
export function guessDomain(q) {
  const t = plain(q.question) + ' ' + (q.options || []).map(plain).join(' ')
  if (/triangle|circle|\bangle|radius|diameter|perimeter|area of|volume|cylinder|sphere|\bcone|prism|rectangle|square|hypotenuse|\bsin\b|\bcos\b|\btan\b|\barc\b|chord|tangent|polygon|°|congruent|similar|pyramid|trapezoid/i.test(t)) return 'Geometry and Trigonometry'
  if (/percent|%|probability|\bmean\b|median|\bmode\b|\brange\b|standard deviation|scatterplot|survey|sample|margin of error|\bratio|\brate\b|\bunits?\b|convert|\bdata\b|frequency|\bstudy\b|experiment|random|histogram|dot plot|box plot|proportion|average|per (hour|minute|second|day|week|year|gallon|mile)|table/i.test(t)) return 'Problem-Solving and Data Analysis'
  if (/\^|²|³|quadratic|exponential|polynomial|factor|\bzeros?\b|parabola|vertex|√|radical|absolute|equivalent to|nonlinear|\bx\s*\(|squared|minimum value|maximum value/i.test(t)) return 'Advanced Math'
  return 'Algebra'
}

// cut-offs from a list of scores: bottom 25% Easy, top 30% Hard
export function cutoffs(scores) {
  const a = [...scores].sort((x, y) => x - y)
  return { easy: a[Math.floor(a.length * 0.25)], hard: a[Math.floor(a.length * 0.7)] }
}
export const label = (s, c) => (s <= c.easy ? 'Easy' : s >= c.hard ? 'Hard' : 'Medium')
