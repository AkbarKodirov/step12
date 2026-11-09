// Content for "The Complete Desmos Walkthrough" (Humo Academy mentors).
// Every question comes from the Desmos SAT Coach bank (server/skills/desmos-sat-coach/references/question-bank.json).
// Each step: say = narration, add = Desmos lines to add, set = change a line, view = graph window,
// hl = indexes of {{highlighted}} spans in the problem, expect = values the real Desmos must show (checked while rendering).
const RED = '#c74440', BLUE = '#2d70b3', GREEN = '#388c46', PURPLE = '#6042a6', ORANGE = '#fa7e19', BLACK = '#111111'
const E = (id, latex, o = {}) => ({ id, latex, ...o })
const P = (id, x, y) => E(id, `\\left(${x},${y}\\right)`, { secret: true, showLabel: true, color: BLACK })

export const TITLE = 'The Complete Desmos Walkthrough'
export const SEGMENTS = [
  {
    id: 'intro', title: 'Welcome', part: 'Intro', kind: 'title',
    steps: [
      { say: "Hey everyone, welcome in. This video was made by the Humo Academy mentors, the same people who sit with our students every week and go through these questions one by one. Today we're doing one thing: the whole Desmos toolbox for the Digital SAT, in a single video. Fourteen hard questions from the Humo math collection. On the left, you'll see the question. On the right, you'll watch me solve it in Desmos, line by line, exactly the way you can on test day. Grab a pen, and let's go.", title: ['The Complete', 'Desmos Walkthrough'], sub: 'Made by the Humo Academy mentors' },
    ],
  },
  {
    id: 'habits', title: 'Four habits before we start', part: 'Warm-up', tag: 'Warm-up',
    text: '<b>Four habits that save points</b><ol><li>Name every unknown with a letter.</li><li>Never use <i>r</i>, <i>e</i> or <i>θ</i> as an unknown.</li><li>Use <b>~</b> when something is unknown.</li><li>Zoom out before you count anything.</li></ol>',
    steps: [
      { say: "Before the questions, four quick habits that will save you real points. First, Desmos is already built into Bluebook, so practise on the same calculator you'll get on test day. Let me type a quick one: y equals x squared minus four x minus five.", add: [E('p', 'y=x^{2}-4x-5', { color: RED })], view: [-6, 8, -10, 10], hl: [] },
      { say: "Second habit: click on a graph, and Desmos hands you the points that matter. The vertex, and both x-intercepts. Negative one, and five, and the vertex at two, negative nine.", add: [P('p1', -1, 0), P('p2', 5, 0), P('p3', 2, -9)] },
      { say: "Third, don't use r, e or theta as your unknowns, because Desmos treats them as special. Use k, a, b, m or s. And fourth, whenever you count solutions, zoom out first, so nothing hides off the screen. Okay. Question one." },
    ],
  },
  {
    id: 'q1', title: 'Systems with infinitely many solutions', part: 'Algebra', tag: 'Algebra · Sliders',
    text: 'In the system below, <i>k</i> and <i>c</i> are constants.<div class="eq">kx + 3y = 9<br>4x + 6y = c</div>If the system has {{infinitely many solutions}}, what is the value of {{k + c}}?',
    steps: [
      { say: "Two lines, two mystery constants, k and c, and they want infinitely many solutions. Whenever a constant is hiding in a question, let Desmos slide it for you. I'll type the first equation exactly as written. k x plus three y equals nine.", add: [E('e1', 'kx+3y=9', { color: RED })], view: [-8, 12, -6, 8], hl: [0] },
      { say: "Then the second one, four x plus six y equals c. Notice Desmos offers sliders for k and c. Yes please, and I'll make the second line dashed so we can spot it later.", add: [E('e2', '4x+6y=c', { color: BLUE, dashed: true }), E('k', 'k=1', { slider: [-5, 5, 1] }), E('c', 'c=0', { slider: [-20, 20, 1] })] },
      { say: "Right now the lines cross, so there's exactly one solution. Not what we want. Infinitely many means the lines must sit on top of each other, so first they need the same slope. Watch what happens when I slide k up to two.", set: { k: 'k=2' }, hl: [0] },
      { say: "Parallel. They never touch. That's no solution, and it's exactly where a lot of students stop. Now slide c until the dashed line lands on the red one.", set: { c: 'c=9' } },
      { say: "At c equals eighteen, the two lines merge, and I only see one. That's infinitely many solutions.", set: { c: 'c=18' }, hl: [0] },
      { say: "So k is two, c is eighteen. Let Desmos add them: twenty. Quick check by hand, the second equation is exactly double the first. Two times two is four, two times nine is eighteen. The rule: infinite solutions means the same line, so match the slope first, then the intercept.", add: [E('s', 'k+c')], hl: [1], expect: [{ id: 's', v: 20 }], badge: 'k + c = 20' },
    ],
  },
  {
    id: 'q2', title: 'Radical equation, extraneous root', part: 'Advanced Math', tag: 'Advanced Math · Graph both sides',
    text: 'What is the solution to<div class="eq big">√(2x + 11) = x − 2 ?</div>',
    steps: [
      { say: "A square root equation. Everyone's first instinct is to square both sides, and that's exactly where the extra answer sneaks in. Desmos skips all of that. Type the left side as a graph: y equals the square root of two x plus eleven.", add: [E('a', 'y=\\sqrt{2x+11}', { color: RED })], view: [-6, 14, -6, 10] },
      { say: "Then the right side as its own graph. y equals x minus two.", add: [E('b', 'y=x-2', { color: BLUE })] },
      { say: "Every place the graphs touch is a solution. Click the crossing, and Desmos drops a point. Seven comma five, so x is seven.", add: [P('i', 7, 5)], badge: 'x = 7' },
      { say: "Now count the crossings. Just one. If you'd done the algebra you'd get x equals seven and negative one, but negative one is extraneous, since the square root can't equal negative three. Desmos never shows you the fake root. The answer is seven. The rule: for a root equation, graph both sides and the extraneous answers disappear on their own.", badge: 'x = 7' },
    ],
  },
  {
    id: 'q3', title: 'Exactly one solution: the discriminant graph', part: 'Advanced Math', tag: 'Advanced Math · Discriminant',
    text: 'In the equation <div class="eq big">x² − kx + 2k − 3 = 0</div><i>k</i> is a constant. The equation has {{exactly one real solution}}. What is the {{greatest}} possible value of <i>k</i>?',
    steps: [
      { say: "Exactly one real solution for a quadratic means the discriminant is zero. That's b squared minus four a c. Here a is one, b is negative k, and c is two k minus three. So the discriminant is k squared minus four times two k minus three." , hl: [0] },
      { say: "Here's the move. Rename k as x, so we can graph it. y equals x squared minus four, times the quantity two x minus three.", add: [E('d', 'y=x^{2}-4\\left(2x-3\\right)', { color: RED })], view: [-2, 10, -8, 24], free: true },
      { say: "Wherever this graph touches the x-axis, the discriminant is zero. Click both spots. x equals two, and x equals six.", add: [P('z1', 2, 0), P('z2', 6, 0)] },
      { say: "They asked for the greatest possible value, so six, not two. That's the trap, stopping at the first one you find. Check it: k squared minus eight k plus twelve factors into k minus two times k minus six. The rule: exactly one solution means discriminant zero. Graph the discriminant with the constant renamed x.", hl: [1], badge: 'k = 6' },
    ],
  },
  {
    id: 'q4', title: 'Parabola through three points', part: 'Advanced Math', tag: 'Advanced Math · Regression',
    text: 'The parabola <div class="eq big">y = ax² + bx + c</div>passes through (−1, 8), (1, 2), and (3, 4). What is the value of {{c}}?',
    steps: [
      { say: "Three points, three unknown coefficients. The old way is a system of three equations, and that's slow. The Desmos way: put all the x values in one list, and all the y values in another.", add: [E('x', 'x_{1}=\\left[-1,1,3\\right]'), E('y', 'y_{1}=\\left[8,2,4\\right]')], view: [-4, 6, -2, 12] },
      { say: "Now the tilde, that little wave. Type y one, tilde, a x one squared plus b x one plus c. The tilde tells Desmos: find the numbers that make this fit.", add: [E('r', 'y_{1}\\sim ax_{1}^{2}+bx_{1}+c')] },
      { say: "Look at the regression panel. a is one, b is negative three, c is four. And R squared is one, which means a perfect fit, nothing rounded.", hl: [0], expect: [{ v: 1, var: 'a' }, { v: -3, var: 'b' }, { v: 4, var: 'c' }] },
      { say: "If you want to see it, plot the points, and the parabola itself. The curve goes right through all three.", add: [E('pts', '\\left(x_{1},y_{1}\\right)', { color: BLACK, points: true }), E('cv', 'y=ax^{2}+bx+c', { color: RED })] },
      { say: "So c is four. Careful, the trap is reading a plus b plus c, which is the height at x equals one, and that's two. They only asked for c. The rule: unknown coefficients plus points means regression.", hl: [0], badge: 'c = 4' },
    ],
  },
  {
    id: 'q5', title: 'Mean with a missing value', part: 'Problem-Solving & Data', tag: 'Data · Lists',
    text: 'The data set 4, 8, 8, 10, 15 has one more value, <i>n</i>, added. The {{mean}} of the new data set is {{10}}. What is <i>n</i>?',
    steps: [
      { say: "Mean with a missing value. Don't write a formula, just let Desmos average a list. y equals mean of the list: four, eight, eight, ten, fifteen, and then x, for the missing number.", add: [E('m', 'y=\\operatorname{mean}\\left(\\left[4,8,8,10,15,x\\right]\\right)', { color: RED })], view: [-5, 30, 0, 16], free: true },
      { say: "That's a slanted line, because the missing value changes the mean. Now we want the mean to be ten, so type y equals ten.", add: [E('t', 'y=10', { color: BLUE })], hl: [1] },
      { say: "They cross at x equals fifteen.", add: [P('i', 15, 10)], badge: 'n = 15' },
      { say: "So n is fifteen. Check: six numbers with a mean of ten add up to sixty. The five we know add to forty-five, and sixty minus forty-five is fifteen. The classic mistake is dividing by five. Putting x in the list lets Desmos count six for you.", badge: 'n = 15' },
    ],
  },
  {
    id: 'q6', title: 'Exponential regression from a table', part: 'Problem-Solving & Data', tag: 'Data · Exponential fit',
    text: 'A table gives x = 0, 1, 2, 3 and y = 5, 7.5, 11.25, 16.875. The relationship is {{exponential}}. What is <i>y</i> when x = 6? Round to the nearest whole number.',
    steps: [
      { say: "Look at the table. Five, seven and a half, eleven twenty-five. It isn't adding the same amount each time, so it's not linear. It's exponential. Same trick, lists first.", add: [E('x', 'x_{1}=\\left[0,1,2,3\\right]'), E('y', 'y_{1}=\\left[5,7.5,11.25,16.875\\right]')], view: [-2, 8, -10, 70], free: true, hl: [0] },
      { say: "Now ask Desmos for an exponential fit. y one, tilde, a times b to the power of x one.", add: [E('r', 'y_{1}\\sim ab^{x_{1}}')] },
      { say: "a is five, and b is one point five. Each step multiplies by one and a half.", expect: [{ var: 'a', v: 5 }, { var: 'b', v: 1.5 }] },
      { say: "To get x equals six, type a times b to the sixth. Desmos shows fifty-six point nine five.", add: [E('v', 'ab^{6}', { }), E('pts', '\\left(x_{1},y_{1}\\right)', { color: BLACK, points: true }), E('cv', 'y=ab^{x}', { color: RED })], expect: [{ id: 'v', v: 56.953125 }] },
      { say: "Rounded, fifty-seven. If you'd treated it as linear, adding two and a half each time, you'd get twenty, which is way off. The rule: a constant ratio means exponential, so use a times b to the x.", badge: 'y ≈ 57' },
    ],
  },
  {
    id: 'q7', title: 'Percent chain in one list', part: 'Problem-Solving & Data', tag: 'Data · Percent chain',
    text: 'The number <i>u</i> is {{120%}} of the number <i>v</i>, and <i>v</i> is {{45%}} of the positive number <i>w</i>. If <i>u</i> is {{k%}} of <i>w</i>, what is the value of <i>k</i>?',
    steps: [
      { say: "A percent chain, and people make this one so much harder than it needs to be. Translate each sentence into a pair. u is one twenty percent of v. v is forty-five percent of w. And u is k percent of w. Put the three left sides in one list, the three right sides in another list, and put a tilde in the middle.", add: [E('r', '\\left[u,v,k\\%\\operatorname{of}w\\right]\\sim\\left[120\\%\\operatorname{of}v,45\\%\\operatorname{of}w,u\\right]')], hl: [0, 1, 2] },
      { say: "Look at the panel. k is fifty-four. You'll see w is one, that's just Desmos picking any positive number, and it doesn't matter, because the answer is a percent.", expect: [{ var: 'k', v: 54 }], badge: 'k = 54' },
      { say: "Check it by hand: one point two times point four five is point five four. Fifty-four percent. The traps are adding the percents to get one sixty-five, or multiplying one twenty by forty-five without turning them into decimals. The rule: a chain of is-percent-of sentences becomes one list, tilde, one list.", badge: 'k = 54' },
    ],
  },
  {
    id: 'q8', title: 'Circle radius, measured not calculated', part: 'Geometry & Trig', tag: 'Geometry · Circles',
    text: 'The graph of <div class="eq big">x² + y² − 6x + 10y + 9 = 0</div>is a circle. What is its {{radius}}?',
    steps: [
      { say: "A circle in general form. You could complete the square. Or you can just type it, exactly as printed. x squared plus y squared minus six x plus ten y plus nine equals zero.", add: [E('c', 'x^{2}+y^{2}-6x+10y+9=0', { color: RED })], view: [-6, 12, -5], hl: [0] },
      { say: "There's the circle. Now we measure instead of calculating. Click the leftmost point, negative two, negative five. And the rightmost point, eight, negative five.", add: [P('l', -2, -5), P('r', 8, -5)] },
      { say: "That's a width of ten, so the diameter is ten, and the radius is five. The trap is the right side after completing the square, which says twenty-five. That's the radius squared, not the radius. The rule: for any circle, graph it, and read the extreme points.", hl: [0], badge: 'radius = 5' },
    ],
  },
  {
    id: 'q9', title: 'Special right triangle from a perimeter', part: 'Geometry & Trig', tag: 'Geometry · 30-60-90',
    text: 'A 30-60-90 triangle has a perimeter of <b>18 + 6√3</b>. What is the length of its {{longest side}}?',
    steps: [
      { say: "A special right triangle. Thirty, sixty, ninety means the sides are s, s root three, and two s. So write every side with one letter. The perimeter is s, plus s root three, plus two s. That's three s plus s root three. Set it equal to eighteen plus six root three, with a tilde.", add: [E('r', '3s+s\\sqrt{3}\\sim18+6\\sqrt{3}')] },
      { say: "Desmos says s is six.", expect: [{ var: 's', v: 6 }] },
      { say: "Now, the longest side of a right triangle is the hypotenuse, which is two s. Type two s.", add: [E('h', '2s')], hl: [0], expect: [{ id: 'h', v: 12 }], badge: 'longest = 12' },
      { say: "Twelve. The trap is six root three, about ten point four, that's the long leg, not the longest side. The hypotenuse is always the longest. The rule: write every side from one letter, solve, then pick the side they asked for.", badge: 'longest = 12' },
    ],
  },
  {
    id: 'q10', title: 'When an exponential overtakes a line', part: 'Advanced Math', tag: 'Advanced Math · Integer crossing',
    text: '<div class="eq">f(x) = 100(1.08)<sup>x</sup><br>g(x) = 100 + 12x</div>What is the {{smallest positive integer}} <i>x</i> for which f(x) &gt; g(x)?',
    steps: [
      { say: "An exponential against a line, and we want the smallest whole number where the exponential is bigger. Define both functions. f of x equals a hundred times one point oh eight to the x.", add: [E('f', 'f\\left(x\\right)=100\\left(1.08\\right)^{x}', { color: RED })], view: [0, 16, 0, 380], free: true },
      { say: "And g of x equals a hundred plus twelve x.", add: [E('g', 'g\\left(x\\right)=100+12x', { color: BLUE })] },
      { say: "At first the line is ahead, but the exponential curves up and overtakes it. Click where they cross, at about x equals ten point eight.", add: [E('i', '\\left(10.8,f\\left(10.8\\right)\\right)', { secret: true, showLabel: true, color: BLACK })], hl: [0] },
      { say: "Careful. Ten point eight isn't a whole number. We need integers, so test the whole numbers on both sides. Type f of ten, and g of ten. Then f of eleven, and g of eleven.", add: [E('a', 'f\\left(10\\right)'), E('b', 'g\\left(10\\right)'), E('c', 'f\\left(11\\right)'), E('d', 'g\\left(11\\right)')], expect: [{ id: 'a', v: 215.89249 }, { id: 'b', v: 220 }, { id: 'c', v: 233.1639 }, { id: 'd', v: 232 }] },
      { say: "At ten, the line is still ahead, two fifteen against two twenty. At eleven, the exponential wins, two thirty-three against two thirty-two. So the answer is eleven. The trap is rounding ten point eight down to ten. The rule: smallest integer such that, find the crossing, then test the integers on both sides.", hl: [0], badge: 'x = 11' },
    ],
  },
  {
    id: 'q11', title: 'Identity for all x', part: 'Advanced Math', tag: 'Advanced Math · Identity',
    text: 'For all values of <i>x</i>,<div class="eq big">(2x + a)(x − 3) + b = 2x² + 4x − 1</div>where <i>a</i> and <i>b</i> are constants. What is the value of {{ab}}?',
    steps: [
      { say: "For all values of x. That's an identity. The textbook way is to expand and match coefficients. The Desmos way is to test it at a handful of inputs. Make a list of five x values. One, two, three, four, five.", add: [E('x', 'x_{1}=\\left[1,2,3,4,5\\right]')], view: [-5, 5, -5, 5] },
      { say: "Now type the left side using that list, tilde, the right side. Desmos tries to make both sides match at all five inputs at once.", add: [E('r', '\\left(2x_{1}+a\\right)\\left(x_{1}-3\\right)+b\\sim2x_{1}^{2}+4x_{1}-1')] },
      { say: "R M S E is zero, so it's a perfect match. a is ten, and b is twenty-nine.", expect: [{ var: 'a', v: 10 }, { var: 'b', v: 29 }] },
      { say: "They want a times b, so type a b. Two ninety. Check by expanding: two x squared plus a minus six, times x, minus three a plus b. So a minus six is four, a is ten, and negative thirty plus b is negative one, so b is twenty-nine. The trap is forgetting the minus three a in the constant term. And why five inputs? Two unknowns need at least two, five makes it airtight.", add: [E('ab', 'ab')], hl: [0], expect: [{ id: 'ab', v: 290 }], badge: 'ab = 290' },
    ],
  },
  {
    id: 'q12', title: 'Cosine of a large angle', part: 'Geometry & Trig', tag: 'Trig · Radian mode',
    text: 'What is the value of <div class="eq big">cos(14π / 3) ?</div>',
    steps: [
      { say: "A trig question with a big angle. Before anything else, check your angle mode. Click the wrench and look for radians or degrees. This question has pi in it, so we want radians. Then just type cosine of fourteen pi over three.", add: [E('v', '\\cos\\left(\\frac{14\\pi}{3}\\right)')], view: [-2.2, 2.2, 0], expect: [{ id: 'v', v: -0.5 }] },
      { say: "Negative zero point five. Done. If you want to see why, draw the unit circle, and plot the point cosine, sine, of that angle.", add: [E('u', 'x^{2}+y^{2}=1', { color: RED }), E('pt', '\\left(\\cos\\left(\\frac{14\\pi}{3}\\right),\\sin\\left(\\frac{14\\pi}{3}\\right)\\right)', { color: BLACK, showLabel: true })] },
      { say: "Fourteen pi over three is four pi plus two pi over three. So we spin around twice and land at a hundred twenty degrees, where the x-coordinate is negative one half. The trap: if you're accidentally in degree mode, you'll get something like point nine seven. It looks reasonable, and it's completely wrong. The rule: check the angle mode before any trig.", badge: 'cos = −0.5' },
    ],
  },
  {
    id: 'q13', title: 'Equivalent exponential forms', part: 'Advanced Math', tag: 'Advanced Math · Equivalent forms',
    text: 'The function <b>f(x) = 5000(1.21)<sup>x/2</sup></b> models a value <i>x</i> years from now. Which equivalent form shows the {{yearly growth factor}} as the base?<ol class="ch" type="A"><li>f(x) = 5000(1.1)<sup>x</sup></li><li>f(x) = 5000(1.21)<sup>x</sup></li><li>f(x) = 5000(1.105)<sup>x</sup></li><li>f(x) = 5000(2.42)<sup>x</sup></li></ol>',
    steps: [
      { say: "Multiple choice, equivalent forms. Don't simplify, just test. Define f as the original function.", add: [E('f', 'f\\left(x\\right)=5000\\left(1.21\\right)^{\\frac{x}{2}}', { color: RED })], view: [-1, 12, -1500, 17000], free: true },
      { say: "Now choice A, as g. I'll make it dashed, so if it's equivalent, it will sit right on top of f. And it does. It overlaps perfectly.", add: [E('g', 'g\\left(x\\right)=5000\\left(1.1\\right)^{x}', { color: BLUE, dashed: true })], hl: [] },
      { say: "Now B, C and D, they all peel away. B and D shoot up way too fast, and C falls below.", add: [E('h', 'h\\left(x\\right)=5000\\left(1.21\\right)^{x}', { color: GREEN }), E('j', 'j\\left(x\\right)=5000\\left(1.105\\right)^{x}', { color: PURPLE }), E('k', 'k\\left(x\\right)=5000\\left(2.42\\right)^{x}', { color: ORANGE })] },
      { say: "Graphs overlapping is convincing, but let's be exact. Type f of ten, and g of ten.", add: [E('a', 'f\\left(10\\right)'), E('b', 'g\\left(10\\right)')], expect: [{ id: 'a', v: 12968.712 }, { id: 'b', v: 12968.712 }] },
      { say: "Same value, twelve thousand nine hundred sixty-eight point seven one. It's A. Why? One point two one to the x over two is the square root of one point two one, which is one point one, to the x. The trap is halving the base to get one point one oh five, that's choice C, but exponents don't work like that. The rule: for equivalent forms, graph them or compare at one input.", badge: 'Answer: A' },
    ],
  },
  {
    id: 'q14', title: 'Counting solutions of a system', part: 'Advanced Math', tag: 'Advanced Math · Count crossings',
    text: 'How many solutions does the system<div class="eq">y = x³ − 4x<br>y = x + 1</div>have?',
    steps: [
      { say: "Last one. Count the solutions. Type both. y equals x cubed minus four x, and y equals x plus one.", add: [E('a', 'y=x^{3}-4x', { color: RED }), E('b', 'y=x+1', { color: BLUE })], view: [-4.5, 4.5, -6, 6], free: true },
      { say: "Now count the crossings. One, two, three.", add: [P('i1', -2.1284, -1.1284), P('i2', -0.2016, 0.7984), P('i3', 2.3301, 3.3301)] },
      { say: "Three solutions. And a warning: zoom out before you count. A window that's too tight can hide a crossing, and cubic questions love to do that. If two graphs only touch, that counts as one. The rule: how many solutions means count the intersections, on a good window.", badge: '3 solutions' },
    ],
  },
  {
    id: 'outro', title: 'Your Desmos toolbox', part: 'Recap', kind: 'recap',
    steps: [
      { say: "That's all fourteen. Let's recap the toolbox. One: graph both sides, for any equation. Two: sliders, for constants. Three: the tilde, for any unknown, with lists for identities and percent chains. Four: rename the constant as x, for discriminants. Five: lists with mean and median, for statistics. Six: check your angle mode before any trig. And seven: always confirm your answer a second way. If you want more, open the Math practice in Humo AI, or go to Desmos Lab, upload a question, and Humo will walk through it with you. This video was made by the Humo Academy mentors. Thanks for watching, and good luck on test day." },
    ],
  },
]

export const RECAP = [
  'Graph both sides for any equation',
  'Sliders for constants',
  'Tilde ~ for unknowns, lists for identities and percents',
  'Rename the constant as x for the discriminant',
  'Lists with mean() and median() for statistics',
  'Check radians vs degrees before trig',
  'Confirm every answer a second way',
]
