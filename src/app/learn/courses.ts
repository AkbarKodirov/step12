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
      ],
    },
  ],
}

export const MATH: Course = {
  id: 'math',
  title: 'SAT Math & Desmos',
  short: 'Math & Desmos',
  tagline: 'The Desmos way to every Digital SAT math pattern — the same calculator you get in Bluebook, used like a top scorer. Every lesson opens a live Desmos with the lines typed in.',
  color: 'from-[#1f4f86] to-[#2d70b3]',
  modules: [
    {
      id: 'foundations',
      title: 'Desmos foundations',
      blurb: 'Set up, syntax, and the habits that stop silly mistakes.',
      lessons: [
        {
          id: 'desmos-basics',
          title: 'Desmos in Bluebook: what you must know',
          min: 6,
          summary: 'Desmos is built into the Digital SAT. Used well, it turns half of the math section into reading a graph.',
          steps: [
            'Implicit multiplication works (kx, 2(x + 1)); write a*b^(x_1) with a star when exponents are involved.',
            'Subscripts: type x_1. Regression uses ~ (tilde), not =.',
            'Reserved letters: x, y, r, θ and e. Never use r or e as an unknown — use a, b, k, m, s, w.',
            'Lists use square brackets [1, 2, 3]; restrictions go in braces {x > 0}.',
            'If a graph looks empty: zoom-fit first, then check for a typo or an unset slider.',
          ],
          desmos: { lines: ['y=x^{2}-4x-5', '\\left[1,2,3\\right]', 'y=x^{2}\\left\\{x>0\\right\\}'], note: 'Click the parabola: Desmos marks the vertex and both x-intercepts.' },
          traps: ['Typing r as an unknown — Desmos treats it as polar radius.', 'Forgetting degree mode in trig questions (wrench menu).'],
          rule: 'Letters other than x, y, r, e, θ become sliders. Use them.',
        },
        {
          id: 'check-twice',
          title: 'Read the question, then check every answer a second way',
          min: 5,
          summary: 'Top tutors miss questions by reading the wrong coordinate, not by missing a Desmos trick.',
          steps: [
            '"Value" or "maximum value" = y-coordinate. "Where", "when", "for what x" = x-coordinate.',
            '"Greatest number of items" rounds down; "least number" rounds up — test both neighbours of the crossing.',
            '"After the first day" is x = 1, not the intercept.',
            'After the graph gives an answer, plug it back in or confirm with a second Desmos move.',
          ],
          traps: ['Answering the x when the question wants the y.', 'An ugly free-response answer — a signal to reread the question.'],
          rule: 'Read, solve, then prove it a second way.',
        },
      ],
    },
    {
      id: 'algebra',
      title: 'Algebra the Desmos way',
      blurb: 'Equations, systems, constants and inequalities.',
      lessons: [
        {
          id: 'graph-both',
          title: 'Graph both sides',
          skill: 'Algebra',
          min: 6,
          summary: 'Any equation f(x) = g(x), however ugly: graph each side and read the intersections.',
          when: 'Radicals, absolute values, rational equations, anything with x on both sides.',
          steps: ['Type y = left side and y = right side.', 'Click each grey intersection point; the x-coordinates are the solutions.', 'Desmos never shows extraneous roots — if algebra gives more answers than the graph, the extra ones are extraneous.'],
          desmos: { lines: ['y=3\\left(x-2\\right)', 'y=2x+5'], window: [-6, 20, -12, 40], note: 'The lines meet at (11, 27), so x = 11.' },
          example: { question: 'If 3(x − 2) = 2x + 5, what is the value of x?', answer: '11', why: 'The two graphs intersect at (11, 27). Check: 3(9) = 27 and 2(11) + 5 = 27.' },
          traps: ['Reporting the y-coordinate of the intersection.'],
          rule: 'Two sides, two graphs, read the x.',
        },
        {
          id: 'systems',
          title: 'Systems of equations',
          skill: 'Algebra',
          min: 6,
          summary: 'Type both equations exactly as given — no need to solve for y.',
          steps: ['Type 3x − 2y = 8 as written.', 'Read the coordinate the question asks for, not both.', 'Nothing showing? Zoom out — big numbers put the intersection far away.'],
          desmos: { lines: ['2x+3y=12', 'x-y=1'], window: [-4, 8, -4, 6], note: 'Intersection (3, 2): x = 3.' },
          traps: ['Answering x + y when the question asks for x.'],
          rule: 'Type it as given; read what is asked.',
        },
        {
          id: 'slider',
          title: 'Sliders on a constant (no / one / infinitely many solutions)',
          skill: 'Algebra',
          min: 8,
          summary: 'Questions with "for what value of k" become a slider you move until the picture matches the condition.',
          steps: ['Type the equations with the constant as a letter; click "add slider".', 'Infinitely many solutions: the graphs coincide (one line on screen). No solution: parallel. One solution: they cross or touch once.', 'Set the slider step to 0.5 or 0.1 to land exact values, then confirm with algebra.'],
          desmos: { lines: ['kx+3y=9', '4x+6y=c', 'k=2', 'c=18'], window: [-6, 10, -6, 8], note: 'With k = 2 and c = 18 the two lines sit on top of each other: infinitely many solutions.' },
          example: { question: 'kx + 3y = 9 and 4x + 6y = c have infinitely many solutions. What is k + c?', answer: '20', why: 'Slopes match at k = 2; the lines merge at c = 18.' },
          traps: ['Stopping at parallel lines — that is NO solution.'],
          rule: 'Infinite = same line. Match the slope, then the intercept.',
        },
        {
          id: 'inequalities',
          title: 'Inequalities and integer answers',
          skill: 'Algebra',
          min: 6,
          summary: 'Type inequalities directly and read the shaded band.',
          steps: ['x + y ≤ 10 shades a region; overlapping shading is the solution set.', '|2x − 7| ≤ 9 shades a vertical band — read its edges (solid = included, dashed = not).', 'Greatest/least integer: step one integer inside a dashed edge.'],
          desmos: { lines: ['\\left|2x-7\\right|\\le9'], window: [-6, 12, -4, 4], note: 'The band runs from x = −1 to x = 8.' },
          traps: ['Including an endpoint drawn with a dashed edge.'],
          rule: 'Shade, read the edges, mind solid vs dashed.',
        },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced Math',
      blurb: 'Quadratics, functions, equivalent forms and exponentials.',
      lessons: [
        {
          id: 'discriminant',
          title: 'Number of solutions: the discriminant graph',
          skill: 'Advanced math',
          min: 7,
          summary: 'Write b² − 4ac with the constant renamed x and graph it.',
          steps: ['Zero of the graph: exactly one solution. Above the axis: two. Below: none.', 'Counting integer constants: read the interval where the graph is below (or above) zero.'],
          desmos: { lines: ['y=x^{2}-36'], window: [-10, 10, -40, 15], note: 'For x² + kx + 9 = 0: negative between −6 and 6 → 11 integers give no real solutions.' },
          traps: ['Counting ±6 — those give exactly one solution.'],
          rule: 'Graph the discriminant as a function of the constant.',
        },
        {
          id: 'equivalent',
          title: 'Equivalent expressions and forms',
          skill: 'Advanced math',
          min: 6,
          summary: 'Graph the original and each choice: equivalent means the graphs coincide everywhere.',
          steps: ['Define f(x) = original, g(x) = choice; type f(10) and g(10) and one odd value like 3.7.', 'Which form "shows" a feature: vertex form shows the max/min, factored form the zeros, the exponential base the growth factor.'],
          desmos: { lines: ['f\\left(x\\right)=5000\\left(1.21\\right)^{\\frac{x}{2}}', 'g\\left(x\\right)=5000\\left(1.1\\right)^{x}', 'f\\left(10\\right)', 'g\\left(10\\right)'], note: 'f(10) = g(10) = 12968.71 — the forms are equivalent.' },
          traps: ['Halving or doubling the base instead of taking the root.'],
          rule: 'Same graph = same expression.',
        },
        {
          id: 'roots-list',
          title: 'Roots written with an unknown: a list of roots',
          skill: 'Advanced math',
          min: 7,
          summary: 'When the solutions are given in terms of a constant, put them in a list and fit the equation with ~.',
          steps: ['x_1 = [k + 3√2, k − 3√2]', 'x_1² − 10x_1 + c ~ 0', 'Desmos fits k and c at once; RMSE = 0 confirms both roots work.'],
          desmos: { lines: ['x_{1}=\\left[k+3\\sqrt{2},k-3\\sqrt{2}\\right]', 'x_{1}^{2}-10x_{1}+c\\sim0'], note: 'The regression panel shows k = 5 and c = 7.' },
          traps: ['Typing the unknown into a table instead of the model.'],
          rule: 'Unknown roots → list + regression.',
        },
        {
          id: 'exponential',
          title: 'Exponential models and percent change',
          skill: 'Advanced math',
          min: 7,
          summary: 'Per-step percent change and changing time units.',
          steps: ['Per-step change: f(x + 1)/f(x); a decrease is 1 minus it.', '"For every increase of 4 in x, f increases by p%": f(8) ~ (1 + p/100) f(4).', 'New time unit: pick a real time, convert it to both units, check which model gives the same value.'],
          desmos: { lines: ['f\\left(x\\right)=200\\left(1.5\\right)^{\\frac{x}{4}}', 'f\\left(8\\right)\\sim\\left(1+\\frac{p}{100}\\right)f\\left(4\\right)'], note: 'Regression gives p = 50.' },
          traps: ['Reading the base when the exponent is x/2 or 2x.'],
          rule: 'Ratio of consecutive outputs = growth factor.',
        },
      ],
    },
    {
      id: 'data',
      title: 'Problem-Solving and Data Analysis',
      blurb: 'Regression, statistics with lists, percent chains.',
      lessons: [
        {
          id: 'regression',
          title: 'Regression: unknown coefficients from points',
          skill: 'Problem solving & data',
          min: 8,
          summary: 'Tables and "passes through these points" questions are one regression line away.',
          steps: ['Add a table (columns x_1 and y_1).', 'Linear: y_1 ~ m x_1 + b. Quadratic: y_1 ~ a x_1² + b x_1 + c. Exponential: y_1 ~ a*b^(x_1).', 'Read the parameters; R² = 1 means an exact fit. Then evaluate, e.g. m*30 + b.'],
          desmos: { lines: ['x_{1}=\\left[6,42\\right]', 'y_{1}=\\left[45,21\\right]', 'y_{1}\\sim mx_{1}+b', 'm\\cdot30+b'], window: [-5, 50, -5, 60], note: 'm = −0.6667, b = 49, and m(30) + b = 29.' },
          traps: ['Using y ~ instead of y_1 ~ (regression needs the list names).'],
          rule: 'Points in a table → regression → read the panel.',
        },
        {
          id: 'stats',
          title: 'Statistics with lists',
          skill: 'Problem solving & data',
          min: 7,
          summary: 'mean, median, stdev and total in one line each — and missing values solved by graphing.',
          steps: ['L = [4, 8, 8, 10, 15], then mean(L), median(L), stdev(L).', 'Missing value: y = mean([4, 8, 8, 10, 15, x]) and y = 10; read the intersection.', 'Mean = median questions: graph both as functions of x and read every intersection.'],
          desmos: { lines: ['L=\\left[4,8,8,10,15\\right]', '\\operatorname{mean}\\left(L\\right)', 'y=\\operatorname{mean}\\left(\\left[4,8,8,10,15,x\\right]\\right)', 'y=10'], window: [-5, 30, 0, 15], note: 'The missing value is x = 15.' },
          traps: ['Using stdev (sample) when you only compare spread — fine; but read which group is asked.'],
          rule: 'Put the data in a list and let Desmos count.',
        },
        {
          id: 'percent',
          title: 'Percent chains in one list regression',
          skill: 'Problem solving & data',
          min: 6,
          summary: 'Up 20% then down 25% is 1.2·0.75. Chains of facts become [ ] ~ [ ].',
          steps: ['Multiply factors: 1.2*0.75.', 'What percent returns it: y = 1.2*0.75*(1 + x/100) and y = 1.', 'Several facts at once: [u, v, k% of w] ~ [120% of v, 45% of w, u].'],
          desmos: { lines: ['y=1.2\\cdot0.75\\left(1+\\frac{x}{100}\\right)', 'y=1'], window: [-10, 30, 0.8, 1.2], note: 'x ≈ 11.11: an 11.1% increase gets back to the start.' },
          traps: ['Adding percents (+20% − 25% ≠ −5%).'],
          rule: 'Percents multiply.',
        },
      ],
    },
    {
      id: 'geometry',
      title: 'Geometry and Trigonometry',
      blurb: 'Circles, triangles, areas and trig.',
      lessons: [
        {
          id: 'circles',
          title: 'Circles, measured instead of algebra',
          skill: 'Geometry & trigonometry',
          min: 7,
          summary: 'Type the circle exactly as given — even unsimplified — and read the centre and radius from the picture.',
          steps: ['x² + y² − 6x + 10y + 9 = 0 typed as is.', 'Click top and bottom points: radius = half the distance, centre = midpoint.', 'Changing the radius: change the radius, then square — never add to the right side directly.'],
          desmos: { lines: ['x^{2}+y^{2}-6x+10y+9=0'], window: [-4, 10, -11, 2], note: 'Centre (3, −5), radius 5.' },
          traps: ['Reading r² as r.'],
          rule: 'Graph it, then measure.',
        },
        {
          id: 'triangles',
          title: 'Triangles, areas and solids',
          skill: 'Geometry & trigonometry',
          min: 8,
          summary: 'polygon() gives areas, distance() gives lengths, and one list regression handles special triangles.',
          steps: ['polygon((0,0), (6,0), (6,8)) shows the area.', 'Special right triangles: write all sides from one letter (s, s, s√2) and fit the given perimeter with ~.', 'Similar figures: lengths ×k, areas ×k², volumes ×k³.'],
          desmos: { lines: ['\\operatorname{polygon}\\left(\\left(0,0\\right),\\left(6,0\\right),\\left(6,8\\right)\\right)', '\\operatorname{distance}\\left(\\left(0,0\\right),\\left(6,8\\right)\\right)'], window: [-2, 10, -2, 10], note: 'Area 24, hypotenuse 10.' },
          traps: ['Multiplying two distance() values when the sides are not perpendicular.'],
          rule: 'Coordinates → polygon(); scale factors square and cube.',
        },
        {
          id: 'trig',
          title: 'Trigonometry quick checks',
          skill: 'Geometry & trigonometry',
          min: 5,
          summary: 'Degree or radian mode first — the most common Desmos trig mistake.',
          steps: ['Set the mode in the wrench menu to match the question.', 'sin A = cos B with acute angles means A + B = 90.', 'Large radian angles: just type cos(14π/3) in radian mode.'],
          desmos: { lines: ['\\cos\\left(\\frac{14\\pi}{3}\\right)'], note: 'cos(14π/3) = −0.5.' },
          traps: ['Degree mode left on for a radian question.'],
          rule: 'Check the mode before you trust the number.',
        },
      ],
    },
    {
      id: 'engine',
      title: 'The Desmos-AI engine',
      blurb: 'One list regression for almost any word problem — the move Humo uses first.',
      lessons: [
        {
          id: 'list-engine',
          title: 'Translate the whole question into [ ] ~ [ ]',
          min: 9,
          summary: 'Name every quantity with a letter, turn each sentence into one equation, put the left sides in one list and the right sides in another.',
          steps: [
            'List every quantity the question names and give each a letter (not r, e or θ).',
            'Each sentence → one equation. Known numbers go in as "letter ~ number".',
            'Read the regression panel: RMSE = 0 means every fact was satisfied. Then type the asked expression.',
            '"What percent of" answers are ratios: add kX to the right side and read k.',
          ],
          desmos: { lines: ['\\left[s,l,h\\right]\\sim\\left[10,13,\\sqrt{l^{2}-\\left(\\frac{s}{2}\\right)^{2}}\\right]', '\\frac{1}{3}s^{2}h'], note: 'A square pyramid with base 10 and slant height 13 has height 12 and volume 400.' },
          traps: ['A big RMSE: one fact is typed wrong or two facts disagree — recheck one line at a time.'],
          rule: 'When in doubt: letters, lists, tilde.',
        },
      ],
    },
  ],
}

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
