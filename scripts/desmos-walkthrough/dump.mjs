import { SEGMENTS } from './content.mjs'
import fs from 'node:fs'
const out = []
for (const s of SEGMENTS) s.steps.forEach((st, i) => out.push({ key: `${s.id}-${String(i).padStart(2, '0')}`, say: st.say }))
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1))
console.log(out.length, 'steps', out.reduce((a, b) => a + b.say.split(/\s+/).length, 0), 'words')
