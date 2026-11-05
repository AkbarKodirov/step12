// Humo accuracy scorecard: asks a fixed set of NEW SAT-style questions (not in Humo AI's bank, so Humo's
// memory can't help) and checks the final answers. Run it after changing prompts or models to see if Humo got
// better or worse.
// Usage: node scripts/eval-humo.mjs [server=http://localhost:3011]
const BASE = process.argv[2] || 'http://localhost:3011'

const Q = [
  ['If 4x − 9 = 3x + 5, what is the value of x?', '14'],
  ['A line passes through the points (2, 5) and (6, 13). What is the slope of the line?', '2'],
  ['The function f is defined by f(x) = x² − 6x + 5. What is the minimum value of f(x)?', '-4'],
  ['30% of a number is 27. What is 50% of the same number?', '45'],
  ['If x + y = 10 and x − y = 4, what is the value of xy?', '21'],
  ['The equation x² + y² − 8x + 6y = 0 defines a circle in the xy-plane. What is the radius of the circle?', '5'],
  ['A right triangle has legs of length 9 and 12. What is the length of its hypotenuse?', '15'],
  ['The mean of 5 numbers is 12. When a sixth number is added, the mean of all 6 numbers is 13. What is the sixth number?', '18'],
  ['If 2^(x + 1) = 32, what is the value of x?', '4'],
  ['A town’s population is modeled by P(t) = 500(1.04)^t, where t is years. By what percent does the population grow each year?', '4'],
  ['The committee ______ its decision after weeks of debate.\nWhich choice completes the text so that it conforms to the conventions of Standard English?\nA) announce\nB) announcing\nC) announced\nD) to announce', 'C'],
  ['The trail was steep and rocky. ______, the hikers reached the summit before noon.\nWhich choice completes the text with the most logical transition?\nA) Therefore\nB) Nevertheless\nC) For example\nD) Similarly', 'B'],
]

const norm = (s) => String(s).replace(/[%\s,*$]/g, '').replace(/−/g, '-').toUpperCase()
let right = 0
const started = Date.now()
for (const [q, want] of Q) {
  const t = Date.now()
  let got = '?'
  try {
    const r = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', text: `${q}\n\n(Solve it fully. On the very last line write only: Final: <answer>)` }] }),
    }).then((x) => x.json())
    const m = String(r.reply || '').match(/Final:\s*\**\s*([A-D](?![a-z])|-?[\d./]+)/i)
    got = m ? m[1] : '?'
  } catch (e) {
    got = `error ${e.message}`
  }
  const ok = norm(got) === norm(want)
  right += ok ? 1 : 0
  console.log(`${ok ? '✓' : '✗'} ${String(Date.now() - t).padStart(6)} ms  want ${want.padEnd(3)} got ${got}  — ${q.split('\n')[0].slice(0, 60)}`)
}
console.log(`\nHumo scorecard: ${right}/${Q.length} correct (${Math.round((right / Q.length) * 100)}%), average ${Math.round((Date.now() - started) / Q.length)} ms per question`)
