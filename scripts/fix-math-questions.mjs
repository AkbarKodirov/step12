// Corrections to math questions in the bank whose question, choices or answer key did not
// match (found by solving every math question). Safe to re-run: each fix sets fixed values.
// Run: node scripts/fix-math-questions.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BANK = join(ROOT, 'public', 'bank', 'bank.json')
const EXPL = join(ROOT, 'public', 'bank', 'explanations.json')

const FIXES = {
  // with (4x + 3)/2 the answer was k = -3.5, which is not a choice
  'j-d3eb71e74b': {
    question: 'Given the linear equation (5x - k)/3 + 2 = (4x + 8)/2, where k is a constant, what is the value of k if x = 5?',
    correct: 1,
    explanation: 'Substitute x = 5: (25 - k)/3 + 2 = (20 + 8)/2 = 14. Subtract 2 to get (25 - k)/3 = 12, so 25 - k = 36 and k = -11. Choosing 11 comes from dropping the negative sign.',
  },
  // the region was not well defined and an area of 27 has no solution
  'j-6e84171072': {
    question: 'Line m in the xy-plane has a positive slope and passes through the origin. Line n is perpendicular to line m and also passes through the origin. Line m, line n, and the vertical line x = 6 form a triangle with an area of 39 square units. If the slope of line m is greater than 1, what is the slope of line m?',
    answer: '3/2 | 1.5',
    explanation: 'Let the slope of line m be s, so line n has slope -1/s. At x = 6 the lines are at y = 6s and y = -6/s, so the side of the triangle on x = 6 has length 6s + 6/s, and its height from the origin is 6. The area is (1/2)(6)(6s + 6/s) = 18s + 18/s = 39. Multiplying by s gives 18s² - 39s + 18 = 0, or 6s² - 13s + 6 = 0, so (2s - 3)(3s - 2) = 0 and s = 3/2 or s = 2/3. Since the slope is greater than 1, s = 3/2.',
  },
  // the line through (4, 3) with slope 3/2 has b = -3, which was not a choice
  'j-ad8a922dad': {
    options: ['-6', '-3', '3', '6'],
    correct: 1,
    explanation: 'Solve the system: from x - 3y = -5, x = 3y - 5, so 5(3y - 5) + 2y = 26, 17y = 51, y = 3 and x = 4. The line 2x + 3y = 7 has slope -2/3, so a perpendicular line has slope 3/2. Then 3 = (3/2)(4) + b gives b = 3 - 6 = -3. Choosing 3 comes from dropping the negative sign.',
  },
  // with "<" there is no least value of a
  'j-d945a6a67f': {
    question: 'If the point (a, 5) lies in the solution set of the linear inequality 4x - 3y > 7 in the xy-plane, what is the least possible integer value of a?',
    explanation: 'Substitute x = a and y = 5: 4a - 15 > 7, so 4a > 22 and a > 5.5. The least integer greater than 5.5 is 6.',
  },
  // with -12 the equations were never multiples of each other
  'j-297afeb2a3': {
    question: 'Consider the system of linear equations:\n4x + 2y = 18\nkx - 3y = -27\nIf the system has infinitely many solutions, what is the value of k?',
    explanation: 'For infinitely many solutions, the second equation must be a multiple of the first. The y-coefficients give -3/2 = -1.5, and the constants agree: -27/18 = -1.5. So k/4 = -1.5 and k = -6. Choosing 6 comes from ignoring the negative sign.',
  },
  // the y-coordinate of an x-intercept is always 0, so the question tested nothing
  'j-04b30039ee': {
    question: 'In the xy-plane, line j passes through the points (-2, 5) and (4, 13). Line k is perpendicular to line j and passes through the point (6, 4). What is the y-coordinate of the y-intercept of line k?',
    options: ['17/2', '-3', '4', '19/3'],
    correct: 0,
    explanation: 'Line j has slope (13 - 5)/(4 - (-2)) = 8/6 = 4/3, so line k has slope -3/4. Then y - 4 = (-3/4)(x - 6), and at x = 0, y = 4 + 9/2 = 17/2.',
  },
  // with a 15% total increase, stock Y rose 8.33%, which was not a choice
  'j-43c9a777fe': {
    question: "An investment portfolio consists of stock X and stock Y. Initially, 40% of the portfolio's total value is in stock X and the rest is in stock Y. Over a year, the value of stock X increases by 25% and the total portfolio value increases by 16%. What is the percentage increase in the value of stock Y over that year?",
    correct: 2,
    explanation: 'Suppose the portfolio starts at $100: $40 in X and $60 in Y. X grows to 40 × 1.25 = $50 and the total grows to $116, so Y is now 116 - 50 = $66. Y rose by 6, and 6/60 = 10%.',
  },
  // with Line C at 1%, the answer was 1/2, which was not a choice
  'j-14b2493f6c': {
    question: 'A manufacturing plant uses three assembly lines—Line A, Line B, and Line C—to produce smartphones. Line A produces 20% of the smartphones, Line B produces 30%, and Line C produces 50%. The percentages of defective smartphones produced by Lines A, B, and C are 2%, 3%, and 3%, respectively. If a randomly selected smartphone is found to be defective, what is the probability that it was produced by Line B?',
    explanation: 'Defective phones make up (0.20)(0.02) + (0.30)(0.03) + (0.50)(0.03) = 0.004 + 0.009 + 0.015 = 0.028 of all phones. Those from Line B make up 0.009, so the probability is 0.009/0.028 = 9/28.',
  },
  'j-512a67a7bb': {
    answer: '1/3 | 3/9 | .3333 | .333',
    explanation: 'P(first red and second red) = (4/10)(3/9) = 12/90, and P(first blue and second red) = (6/10)(4/9) = 24/90. So P(second red) = 36/90, and P(first red given second red) = (12/90)/(36/90) = 1/3. The trap is answering 4/10, which ignores the information about the second card.',
  },
  // "2.828 (2*sqrt(2))" could never be matched by a typed answer
  'desmos-ADV-14': { answer: '2.828 | 2.829' },
}

const bank = JSON.parse(readFileSync(BANK, 'utf8'))
const expl = JSON.parse(readFileSync(EXPL, 'utf8'))
let n = 0
for (const [id, fix] of Object.entries(FIXES)) {
  const q = bank.find((x) => x.id === id)
  if (!q) throw new Error(`missing ${id}`)
  for (const k of ['question', 'options', 'correct', 'answer']) if (k in fix) q[k] = fix[k]
  if (fix.explanation) {
    if (id in expl || !('explanation' in q)) expl[id] = fix.explanation
    else q.explanation = fix.explanation
  }
  n++
}
writeFileSync(BANK, JSON.stringify(bank))
writeFileSync(EXPL, JSON.stringify(expl))
console.log(`fixed ${n} math questions`)
