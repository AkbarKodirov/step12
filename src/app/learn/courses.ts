import type { Skill } from '../store'

/**
 * Humo AI courses. Two tracks, like a masterclass: SAT Reading & Writing, and Math & Desmos.
 * Math & Desmos lessons follow the desmos-sat-coach playbook; each comes with live Desmos lines.
 */
export type Example = { text?: string; question: string; choices?: string[]; answer: string; why: string }
export type Lesson = {
  id: string
  title: string
  min: number
  skill?: Skill
  summary: string
  when?: string
  steps: string[]
  desmos?: { lines: string[]; window?: [number, number, number, number]; note: string }
  example?: Example
  traps: string[]
  rule: string
}
export type Module = { id: string; title: string; blurb: string; lessons: Lesson[] }
export type Course = { id: 'rw' | 'math'; title: string; short: string; tagline: string; color: string; modules: Module[] }

export const RW: Course = {
  id: 'rw',
  title: 'SAT Reading & Writing',
  short: 'Reading & Writing',
  tagline: 'Every question type in the Reading and Writing section, one clear method each — with Humo checking your thinking.',
  color: 'from-jg-700 to-jg-500',
  modules: [
    {
      id: 'start',
      title: 'How the section works',
      blurb: 'The map before the journey.',
      lessons: [
        {
          id: 'rw-map',
          title: 'The Reading & Writing section in 6 minutes',
          min: 6,
          summary: 'Two adaptive modules of 27 questions, 32 minutes each — about 71 seconds a question. Every question has its own short text, and the order is always the same: Craft and Structure, Information and Ideas, Standard English Conventions, Expression of Ideas.',
          steps: [
            'Module 1 is mixed difficulty. Do well and Module 2 gets harder — and a hard Module 2 is the only way to a top score.',
            'Questions come in a fixed order of types, so you always know what is next: vocabulary first, grammar near the end, transitions and notes last.',
            'Every text is short: read the question first, then the text with that job in mind.',
            'Skip and mark anything over 90 seconds. Easy points at the end of the module are worth the same.',
          ],
          traps: ['Spending three minutes on one inference question and rushing the eight grammar questions you could have aced.', 'Reading the choices before you know what you are looking for.'],
          rule: 'Question first, text second, prediction third, choices last.',
        },
      ],
    },
    {
      id: 'craft',
      title: 'Craft and Structure',
      blurb: 'Words in context, text structure and purpose, cross-text connections.',
      lessons: [
        {
          id: 'wic',
          title: 'Words in Context',
          skill: 'Words in context',
          min: 7,
          summary: 'Up to five questions per module and the fastest points on the test — once you stop reading the choices first.',
          steps: [
            'Cover the choices. Read the sentence and find the clue that defines the blank: a contrast word (despite, although, yet), a colon, or a restatement after a comma.',
            'Predict your own simple word for the blank — "used to", "hopeful", "small".',
            'Match your prediction to the choices for meaning AND tone (positive or negative).',
            'Plug it back in and reread the whole sentence.',
          ],
          example: {
            text: 'Years of covering disasters had ______ the reporter to sights that would have shaken most people; she recorded the wreckage with an unsettling calm.',
            question: 'Which choice completes the text with the most logical and precise word or phrase?',
            choices: ['alerted', 'endeared', 'inured', 'restored'],
            answer: 'C) inured',
            why: 'The clue is "unsettling calm" after "years of covering disasters": she became used to hardship. Predict "hardened / used to" → inured.',
          },
          traps: ['The "sounds smart" choice that fits the topic but not the logic.', 'A word with the right meaning but the wrong tone.'],
          rule: 'Find the clue, predict the word, then match.',
        },
        {
          id: 'structure',
          title: 'Text Structure and Purpose',
          skill: 'Text structure & purpose',
          min: 8,
          summary: 'Questions about why the author wrote the text, how it is organised, or what an underlined sentence does.',
          steps: [
            'Summarise each sentence in 3–4 words in your head ("claim", "example", "but critics…").',
            'For "main purpose", ask what the text DOES, not what it is about: argue, explain, contrast, challenge, describe.',
            'For an underlined sentence, read the sentences right before and after it — its job is defined by its neighbours.',
            'For Text 1 / Text 2, decide how author 2 would react to author 1 BEFORE reading the choices: agree, disagree, qualify.',
          ],
          traps: ['A choice that describes only part of the text.', 'A verb that is too strong ("refute", "prove") when the author only "questions" or "suggests".'],
          rule: 'Purpose = verb + object. Find the verb first.',
        },
      ],
    },
    {
      id: 'ideas',
      title: 'Information and Ideas',
      blurb: 'Central ideas, command of evidence, inferences.',
      lessons: [
        {
          id: 'central',
          title: 'Central Ideas and Details',
          skill: 'Central ideas & details',
          min: 6,
          summary: 'Find the main claim or a stated detail. Everything you need is in the text — no outside knowledge.',
          steps: ['Find the sentence that everything else supports. It is often after a contrast word (however, but).', 'Paraphrase it before you look at the choices.', 'For detail questions, point to the exact line that proves your answer.'],
          traps: ['A choice that is true but too narrow (one example, not the main idea).', 'A choice that goes beyond the text ("always", "all scientists").'],
          rule: 'If you cannot point to the line, it is not the answer.',
        },
        {
          id: 'coe',
          title: 'Command of Evidence',
          skill: 'Command of evidence',
          min: 9,
          summary: 'Support, weaken or illustrate a claim — textual or with a table or graph. Among the most-missed questions on hard modules.',
          steps: [
            'Underline the exact claim in the question.',
            'Rewrite it as "If true, we would see ___". That blank is your target.',
            'For each choice ask only: does this show the target? Ignore whether it is interesting.',
            'For data: check the exact group, year and direction the claim names. Wrong choices quote the right chart but the wrong row.',
          ],
          traps: ['On-topic evidence that proves something slightly different.', 'True data that does not connect to the claim.'],
          rule: 'Evidence must match the claim word for word, not just the topic.',
        },
        {
          id: 'inferences',
          title: 'Inferences',
          skill: 'Inferences',
          min: 7,
          summary: '"Which choice most logically completes the text?" — the last sentence must follow from everything before it.',
          steps: ['Write the logic as a chain: A causes B; B is missing; so …', 'Predict the ending in your own words.', 'Pick the choice that must be true, not one that could be true.'],
          traps: ['A choice that repeats an earlier idea but does not complete the logic.', 'An extreme conclusion the text never supports.'],
          rule: 'The right inference is the smallest step the text forces you to take.',
        },
      ],
    },
    {
      id: 'conventions',
      title: 'Standard English Conventions',
      blurb: 'Boundaries, form, structure and sense.',
      lessons: [
        {
          id: 'boundaries',
          title: 'Boundaries: commas, semicolons, colons, dashes',
          skill: 'Standard English conventions',
          min: 10,
          summary: 'Most grammar questions are punctuation between clauses. Know what can join two complete sentences and you get most of them.',
          steps: [
            'Find the subject and verb on each side of the blank. Two complete sentences?',
            'Two complete sentences can be joined by: a period, a semicolon, a comma + FANBOYS (and, but, so…), or a colon if the second explains the first.',
            'A comma alone between two complete sentences is always wrong (comma splice).',
            'Pairs must match: two commas or two dashes around extra information, never one of each.',
          ],
          traps: ['"However" is not a conjunction — "…, however, …" cannot join two sentences.', 'Putting a comma between a subject and its verb.'],
          rule: 'Count the complete sentences, then pick the joiner that is allowed.',
        },
        {
          id: 'form',
          title: 'Form, Structure and Sense',
          skill: 'Standard English conventions',
          min: 8,
          summary: 'Subject–verb agreement, pronouns, verb tense and modifiers.',
          steps: ['Cross out the extra words between subject and verb, then check that they agree.', 'Match pronouns to the noun they replace (it vs they, its vs their).', 'Keep tense consistent with the rest of the text unless a time word changes it.', 'A modifier at the start of a sentence must describe the noun right after the comma.'],
          traps: ['Agreeing with the nearest noun instead of the real subject.', '"Its" vs "it\'s".'],
          rule: 'Strip the sentence to its skeleton, then check the grammar.',
        },
      ],
    },
    {
      id: 'expression',
      title: 'Expression of Ideas',
      blurb: 'Transitions and rhetorical synthesis.',
      lessons: [
        {
          id: 'transitions',
          title: 'Transitions',
          skill: 'Transitions',
          min: 6,
          summary: 'Name the relationship between the two sentences in one word before you look at the choices.',
          steps: ['Read the sentence before and after the blank.', 'Name the relationship: contrast, cause/result, example, addition, sequence.', 'Cross out every choice from the wrong family (However = contrast; Therefore = result; For example = example; Moreover = addition).', 'If two remain, match the strength: "Indeed" intensifies, "Still" concedes.'],
          traps: ['Choosing contrast just because the sentences talk about different things.'],
          rule: 'Relationship first, word second.',
        },
        {
          id: 'synthesis',
          title: 'Rhetorical Synthesis (student notes)',
          skill: 'Rhetorical synthesis',
          min: 6,
          summary: 'A student wants to accomplish a goal using their notes. The goal in the question is the only thing that matters.',
          steps: ['Read the question\'s goal first and underline it ("emphasize a difference", "introduce the study to an audience unfamiliar with…").', 'Skip the notes at first — go to the choices.', 'Keep only choices that do the goal exactly (a difference needs two things compared).', 'Use the notes only to break a tie.'],
          traps: ['A choice that is accurate to the notes but does a different job.'],
          rule: 'Goal, not notes.',
        },
        {
          id: 'sat-revamp',
          title: 'The SAT Revamp: new-style transitions and cross-text questions',
          min: 8,
          summary: 'The newer, longer transition choices and cross-text connection questions, with a method for each.',
          steps: ['New transition choices are long phrases. Check the direction first, then ask what the phrase points back to.', 'The right answer goes in the right direction and says only true things about the text.', 'For cross-text questions, sum up each text in five words and name how they relate.', 'Then answer as the author would, and cross out anything they never said.'],
          traps: ['Picking a long transition that goes the right way but points back to the wrong idea.', 'Choosing an answer that sounds like the author but was never said.'],
          rule: 'Direction first, then what it points to.',
        },
      ],
    },
  ],
}

export const MATH: Course = {
  id: 'math',
  title: 'SAT Math & Desmos',
  short: 'Math & Desmos',
  tagline: 'SAT math video lessons, plus one full Desmos walkthrough of 14 hard questions — the same calculator you get in Bluebook, used like a top scorer.',
  color: 'from-[#1f4f86] to-[#2d70b3]',
  modules: [
    {
      id: 'algebra',
      title: 'Algebra',
      blurb: 'Linear equations, linear functions, systems and inequalities.',
      lessons: [
        {
          id: 'math-intro',
          title: 'Intro to SAT Math: expressions and linear equations',
          min: 14,
          summary: 'How the two Math modules work, then the first big topic: equivalent expressions, solving for one variable, and linear equations with one, none or infinitely many solutions.',
          steps: ['Module 1 decides Module 2, so protect the easy points. You have about 95 seconds per question.', 'Equivalent expressions: expand, factor, or plug in a number and compare.', '"In terms of": get the letter alone by undoing operations in reverse order.', 'Read what they ask. If the x-coefficients match, there is no solution or there are infinitely many.'],
          traps: ['Solving for x when the question asks for an expression like 2x + 3.', 'Dropping the minus sign in front of a bracket.'],
          rule: 'Read what they ask, then undo in reverse order.',
        },
        {
          id: 'linear-functions',
          title: 'Linear functions',
          min: 9,
          summary: 'Slope and intercepts in every form, parallel and perpendicular lines, and reading linear models from words, tables and graphs.',
          steps: ['In y = mx + b, m is the slope (the rate) and b is the starting value. In standard form Ax + By = C, the slope is −A/B.', 'For the x-intercept set y = 0; for the y-intercept set x = 0.', 'Parallel lines have the same slope. Perpendicular lines have negative reciprocal slopes.', 'f(a) = b just means the point (a, b) is on the graph.'],
          traps: ['Reading B/A as the slope in standard form.', 'Mixing up the rate and the starting value in a word problem.'],
          rule: 'm is the rate, b is the start.',
        },
        {
          id: 'systems-video',
          title: 'Systems of equations',
          min: 9,
          summary: 'The three pictures of a system (one, none or infinitely many solutions), the ratio test in standard form, and when to use substitution or elimination.',
          steps: ['Two lines cross once, are parallel, or are the same line: one solution, none, or infinitely many. Never two.', 'Compare the ratios. All three equal: infinitely many. Only the x and y ratios equal: no solution.', 'Use substitution when a variable is alone, and elimination otherwise.', 'When they ask for a combination like 4x + 4y, add or subtract the equations first.'],
          traps: ['Solving for x and y when the question asks for a combination.', 'Saying "two solutions" for two lines.'],
          rule: 'Compare the ratios, then add or subtract.',
        },
        {
          id: 'linear-inequalities',
          title: 'Linear inequalities',
          min: 10,
          summary: 'Translating words into inequalities, solving them, graphing them, and finding the solutions of a system of inequalities.',
          steps: ['At least / no less than / minimum mean ≥. At most / no more than / maximum mean ≤.', 'When you multiply or divide by a negative number, flip the sign.', 'Dashed line for < and >, solid for ≤ and ≥. "y >" means shade above. When in doubt, test (0, 0).', 'For a system, the solutions are in the overlap. Test one point from each region.'],
          traps: ['Forgetting to flip the sign after dividing by a negative.', 'Using a solid line for a strict inequality.'],
          rule: 'Negative divide: flip. Strict: dashed.',
        },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced Math',
      blurb: 'Functions, exponentials, quadratics, polynomials and radicals.',
      lessons: [
        {
          id: 'functions-video',
          title: 'Functions, exponentials and quadratics',
          min: 11,
          summary: 'Function notation, the three forms of a quadratic and what each one shows, exponential growth and decay, and shortcuts for the solutions of a quadratic.',
          steps: ['f(3) means put 3 in. f(x) = 47 means solve for x. f(a) = b is a point on the graph.', 'Standard form shows the y-intercept, factored form the roots, and vertex form the vertex (the minimum or maximum).', 'Exponentials are a · bˣ. Growth by r% is 1 + r, decay is 1 − r. "Every k units" means divide the exponent by k.', 'Shifting left or right does not change the minimum value. For x² + bx + c = 0, the solutions add to −b and multiply to c.'],
          traps: ['Using 0.06 instead of 1.06 for 6% growth.', 'Reading the x-coordinate of the vertex as the minimum value.'],
          rule: 'Pick the form that shows what they ask for.',
        },
        {
          id: 'polynomials-video',
          title: 'Polynomials, exponents and radicals',
          min: 9,
          summary: 'The discriminant, factoring quadratics, the factor theorem, and turning roots into fraction exponents.',
          steps: ['The discriminant b² − 4ac counts real solutions: positive two, zero one, negative none.', 'To factor x² + bx + c, find two numbers that add to b and multiply to c.', 'Factor theorem: x − c is a factor exactly when f(c) = 0, and the graph crosses the x-axis at c. Watch the sign.', 'Turn roots into fraction exponents. When you multiply, add the exponents.'],
          traps: ['Writing x + 3 as the factor when f(3) = 0.', 'Multiplying exponents when you should add them.'],
          rule: 'f(c) = 0 means x − c is a factor.',
        },
      ],
    },
    {
      id: 'data',
      title: 'Problem-Solving and Data Analysis',
      blurb: 'Percent, ratio, units, statistics and probability.',
      lessons: [
        {
          id: 'percent-video',
          title: 'Percent, ratio and units',
          min: 8,
          summary: 'Translating percent sentences, percent increase and decrease as multipliers, converting units, and ratio problems.',
          steps: ['Translate: "what" is x, "is" is =, "of" is ×, and "percent" is ÷ 100.', 'Up r% means × (1 + r). Down r% means × (1 − r). Successive changes multiply.', 'Convert units with fractions equal to 1. Squared units convert twice, cubed units three times.', 'For ratios, add the parts first. Then read what they actually ask.'],
          traps: ['Adding successive percent changes instead of multiplying.', 'Converting square units only once.'],
          rule: 'Percent change is a multiplier.',
        },
        {
          id: 'stats-video',
          title: 'Statistics and probability',
          min: 8,
          summary: 'Mean, median, range and outliers, how changes to data move the center and spread, and probability from tables.',
          steps: ['The mean is total ÷ count, and total = mean × count solves most mean questions.', 'The median is the middle value in order. Outliers pull the mean but barely touch the median.', 'Add the same number to every value: the center moves, the spread stays the same.', 'Probability is target ÷ possible. When you see "given that", shrink the group first.'],
          traps: ['Using the whole table as the total in a "given that" question.', 'Forgetting to sort the data before finding the median.'],
          rule: 'Total = mean × count.',
        },
      ],
    },
    {
      id: 'geometry',
      title: 'Geometry and Trigonometry',
      blurb: 'Lines, angles, triangles, circles, trig and volume.',
      lessons: [
        {
          id: 'lines-triangles',
          title: 'Lines, angles and triangles',
          min: 9,
          summary: 'Angle facts on lines and in triangles, the Pythagorean theorem, special right triangles, SOH CAH TOA, and similar triangles.',
          steps: ['Angles on a straight line add to 180°, vertical angles are equal, and parallel lines make only two angle sizes.', "A triangle's angles add to 180°, and an exterior angle equals the two far angles.", 'Right triangles: use the Pythagorean theorem, the special right triangles, or SOH CAH TOA.', 'Similar figures: sides times k, areas times k², volumes times k³. π radians is 180°.'],
          traps: ['Multiplying the area by k instead of k² for similar figures.', 'Using the adjacent side for sine.'],
          rule: 'Two angle sizes on parallel lines; k, k², k³ for similar figures.',
        },
        {
          id: 'trig-circles',
          title: 'Trigonometry and circles',
          min: 11,
          summary: 'The trig ratios, radians and the unit circle, then circles: arcs, sectors, angle facts and the equation of a circle.',
          steps: ['SOH CAH TOA. The sine of an angle equals the cosine of its complement. 180° is π radians.', 'On the unit circle, cosine is x and sine is y.', 'Circumference is 2πr and area is πr². For arcs and sectors, find the fraction of the circle.', 'An inscribed angle is half its arc, a tangent is perpendicular to the radius, and (x − h)² + (y − k)² = r² gives the center and r².'],
          traps: ['Reading r² in the circle equation as the radius.', 'Forgetting to flip the signs for the center.'],
          rule: 'Arcs and sectors are a fraction of the whole circle.',
        },
        {
          id: 'volumes',
          title: 'Volumes and surface area',
          min: 9,
          summary: 'Prisms, cylinders, spheres, pyramids and cones: every volume and surface-area formula the SAT uses, with examples.',
          steps: ["Prisms and cylinders: volume is base area times height. A cube's volume is a³ and its surface area is 6a².", 'Surface area is the side faces plus the two bases. An unrolled cylinder is a rectangle.', "A sphere's volume is (4/3)πr³ and its surface area is 4πr². A hemisphere is half.", 'Pyramids and cones are one third of base times height. The slant height comes from the Pythagorean theorem.'],
          traps: ['Forgetting the one third for cones and pyramids.', 'Using the diameter instead of the radius.'],
          rule: 'Base times height, and one third for anything with a point.',
        },
      ],
    },
    {
      id: 'walkthrough',
      title: 'Desmos walkthrough',
      blurb: 'One full video: 14 hard questions solved in the real Desmos, by the Humo Academy mentors.',
      lessons: [
        {
          id: 'desmos-walkthrough',
          title: 'The Complete Desmos Walkthrough: 14 hard questions, one video',
          min: 14,
          summary: 'One full video instead of many small ones. Made by the Humo Academy mentors: the question on the left, the real Desmos on the right, and 14 hard questions from our math collection solved line by line with every Desmos move you need on test day.',
          steps: ['Graph both sides for any equation; extraneous roots disappear on their own.', 'Put a slider on a constant, and use the tilde ~ for any unknown, with lists for identities and percent chains.', 'Rename the constant as x to graph a discriminant, and use lists with mean() for statistics.', 'Check radians vs degrees before trig, and confirm every answer a second way.'],
          traps: ['Using r, e or θ as an unknown.', 'Stopping at the first answer you find, or forgetting to zoom out before you count.'],
          rule: 'Type the question into Desmos, let it do the work, then check the answer a second way.',
        },
      ],
    },
  ],
}

/** Category names in the student's language (Learn page chips and lesson labels). */
export const MODULE_NAMES: Record<string, { uz: string; ru: string }> = {
  algebra: { uz: 'Algebra', ru: 'Алгебра' },
  advanced: { uz: 'Ilg‘or matematika', ru: 'Продвинутая математика' },
  data: { uz: 'Masalalar va ma’lumotlar tahlili', ru: 'Задачи и анализ данных' },
  geometry: { uz: 'Geometriya va trigonometriya', ru: 'Геометрия и тригонометрия' },
  walkthrough: { uz: 'Desmos qo‘llanmasi', ru: 'Разбор Desmos' },
}
export const ALL_NAME = { en: 'All', uz: 'Hammasi', ru: 'Все' }
export const moduleName = (m: { id: string; title: string }, lang: 'en' | 'uz' | 'ru') => (lang === 'en' ? m.title : MODULE_NAMES[m.id]?.[lang] ?? m.title)

export const COURSES = { rw: RW, math: MATH }
export const allLessons = (c: Course) => c.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m })))

/** The lesson that teaches a given skill (used by "Learn" buttons in practice). */
export function lessonFor(skill: string) {
  for (const c of [RW, MATH]) {
    const l = allLessons(c).find((x) => x.skill === skill)
    if (l) return { to: `/app/learn/${c.id}/${l.id}`, title: l.title, course: c.title }
  }
  return null
}
