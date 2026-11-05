import opentype from 'opentype.js'
const font = opentype.loadSync(new URL('../fonts/Onest-700.ttf', import.meta.url).pathname)
/** Outlined text at a baseline; returns {d, width}. tracking in em. */
export function text(str, x, y, size, tracking = -0.025) {
  let cx = x, parts = []
  const glyphs = font.stringToGlyphs(str)
  glyphs.forEach((g, i) => {
    parts.push(g.getPath(cx, y, size).toPathData(1))
    let adv = g.advanceWidth * size / font.unitsPerEm
    if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * size / font.unitsPerEm
    cx += adv + tracking * size
  })
  return { d: parts.join(''), width: cx - x - tracking * size }
}
export const capHeight = (size) => font.tables.os2.sCapHeight * size / font.unitsPerEm
