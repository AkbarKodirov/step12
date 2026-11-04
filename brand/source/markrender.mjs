// Renders the Humo mark (crest v2) on its 512 grid. Every call gets unique mask ids.
import { crest2 } from './marks.mjs'
export const M = crest2()
let uid = 0
export function renderMark(fill, sparkFill = fill) {
  const id = 'hm' + (uid++).toString(36)
  const coreCut = `<path d="${M.core} ${M.head}" fill="#000" stroke="#000" stroke-width="${M.keyline * 2}" stroke-linejoin="round"/>`
  let defs = '', paths = '', k = 0
  const drawn = new Set()
  for (const g of M.groups) {
    g.forEach((d, i) => {
      if (drawn.has(d)) return
      drawn.add(d)
      const above = g.slice(0, i).map((a) => `<path d="${a}" fill="#000" stroke="#000" stroke-width="${M.gap * 2}" stroke-linejoin="round"/>`).join('')
      const mid = `${id}-${k++}`
      defs += `<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><rect width="512" height="512" fill="#fff"/>${coreCut}${above}</mask>`
      paths += `<path d="${d}" fill="${fill}" mask="url(#${mid})"/>`
    })
  }
  const [ex, ey, er] = M.eye
  return `<defs>${defs}</defs>${paths}<path d="${M.core}" fill="${fill}"/><path d="${M.head} M${ex} ${ey - er} a${er} ${er} 0 1 1 -0.1 0Z" fill="${fill}" fill-rule="evenodd"/><path d="${M.spark}" fill="${sparkFill}"/>`
}
