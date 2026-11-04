// Turns the light math markup used in scripts/hardbook/*.txt into HTML (for the
// Question Bank screen) and plain Unicode text (for search, Humo and small cards).
//   {a/b}   stacked fraction        ^{..} or ^x  superscript      _{..} or _x  subscript
//   √{..}   square root with bar    $ line       centred display line
//   | a | b |  table rows (first row is the header)
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '−': '⁻', '(': '⁽', ')': '⁾', n: 'ⁿ', x: 'ˣ', t: 'ᵗ', k: 'ᵏ', m: 'ᵐ' }
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const minus = (s) =>
  s
    .replace(/ - /g, ' − ')
    .replace(/(^|[\s(=[,{|<>≤≥+/^_−:;])-(?=[\d\w(.{√|$π])/g, '$1−')
    .replace(/(^|[\s(=[,{|<>≤≥+/^_−:;])-(?=[\d\w(.{√|$π])/g, '$1−')

// parse into a tree: strings, {frac:[num,den]}, {group:[...]}, {sup:x}, {sub:x}, {rad:x}
function parse(s) {
  let i = 0
  function group(end) {
    const out = []
    let buf = ''
    const flush = () => {
      if (buf) out.push(buf)
      buf = ''
    }
    while (i < s.length) {
      const c = s[i]
      if (end && c === '}') break
      if (c === '{') {
        flush()
        i++
        const parts = [[]]
        // split top-level '/' inside braces
        const inner = groupUntilClose()
        out.push(inner)
        continue
      }
      if ((c === '^' || c === '_') && i + 1 < s.length) {
        flush()
        i++
        let arg
        if (s[i] === '{') {
          i++
          arg = groupUntilClose(true)
        } else {
          arg = [s[i]]
          i++
        }
        out.push(c === '^' ? { sup: arg } : { sub: arg })
        continue
      }
      if (c === '√' && s[i + 1] === '{') {
        flush()
        i += 2
        out.push({ rad: groupUntilClose(true) })
        continue
      }
      buf += c
      i++
    }
    flush()
    return out
  }
  function groupUntilClose(plain) {
    // reads up to the matching '}' and returns either a fraction or a group
    const items = []
    let cur = []
    let buf = ''
    let parts = [cur]
    const flush = () => {
      if (buf) cur.push(buf)
      buf = ''
    }
    while (i < s.length && s[i] !== '}') {
      const c = s[i]
      if (c === '/' && !plain) {
        flush()
        cur = []
        parts.push(cur)
        i++
        continue
      }
      if (c === '{' || c === '^' || c === '_' || (c === '√' && s[i + 1] === '{')) {
        flush()
        const save = i
        // reuse group() for one token
        const sub = groupOne()
        cur.push(...sub)
        continue
      }
      buf += c
      i++
    }
    flush()
    i++ // skip '}'
    if (parts.length === 2) return { frac: parts }
    return plain ? parts.flat() : { group: parts.flat() }
  }
  function groupOne() {
    const c = s[i]
    if (c === '{') {
      i++
      return [groupUntilClose()]
    }
    if (c === '√') {
      i += 2
      return [{ rad: groupUntilClose(true) }]
    }
    i++
    let arg
    if (s[i] === '{') {
      i++
      arg = groupUntilClose(true)
    } else {
      arg = [s[i]]
      i++
    }
    return [c === '^' ? { sup: arg } : { sub: arg }]
  }
  return group(false)
}

// a superscript right before a radical is the radical's index: ^3√{x} is a cube root
function roots(t) {
  const out = []
  for (let k = 0; k < t.length; k++) {
    const n = t[k]
    if (typeof n === 'string') {
      out.push(n)
      continue
    }
    if (n.sup && t[k + 1] && typeof t[k + 1] !== 'string' && t[k + 1].rad) {
      out.push({ rad: roots(t[k + 1].rad), idx: n.sup })
      k++
      continue
    }
    if (n.frac) out.push({ frac: [roots(n.frac[0]), roots(n.frac[1])] })
    else if (n.group) out.push({ group: roots(n.group) })
    else if (n.sup) out.push({ sup: roots(n.sup) })
    else if (n.sub) out.push({ sub: roots(n.sub) })
    else if (n.rad) out.push({ rad: roots(n.rad) })
  }
  return out
}

function toHtml(t) {
  return t
    .map((n) => {
      if (typeof n === 'string') return esc(n)
      if (n.frac) return `<span class="fr"><span>${toHtml(n.frac[0])}</span><span>${toHtml(n.frac[1])}</span></span>`
      if (n.group) return toHtml(n.group)
      if (n.sup) return `<sup>${toHtml(n.sup)}</sup>`
      if (n.sub) return `<sub>${toHtml(n.sub)}</sub>`
      // the root sign is drawn by CSS so that its hook and the bar over the radicand are one line
      if (n.rad) return `${n.idx ? `<sup class="ri">${toHtml(n.idx)}</sup>` : ''}<span class="rad"><span class="rq">√</span>${toHtml(n.rad)}</span>`
      return ''
    })
    .join('')
}

const simple = (s) => /^[\w.√π]+$/.test(s) || /^−?[\w.]+$/.test(s)
function toPlain(t) {
  return t
    .map((n, idx) => {
      if (typeof n === 'string') return n
      if (n.frac) {
        const a = toPlain(n.frac[0])
        const b = toPlain(n.frac[1])
        const f = `${simple(a) ? a : `(${a})`}/${simple(b) ? b : `(${b})`}`
        const next = t[idx + 1]
        const prev = t[idx - 1]
        const glued = (typeof next === 'string' && /^[\w(√]/.test(next)) || (next && typeof next !== 'string') || (typeof prev === 'string' && /[\w)]$/.test(prev))
        return glued ? `(${f})` : f
      }
      if (n.group) return toPlain(n.group)
      if (n.sup) {
        const a = toPlain(n.sup)
        return [...a].every((c) => SUP[c]) ? [...a].map((c) => SUP[c]).join('') : `^(${a})`
      }
      if (n.sub) {
        const a = toPlain(n.sub)
        return [...a].every((c) => SUB[c]) ? [...a].map((c) => SUB[c]).join('') : `_${a}`
      }
      if (n.rad) {
        const a = toPlain(n.rad)
        const i = n.idx ? toPlain(n.idx) : ''
        const sign = !i ? '√' : i === '3' ? '∛' : i === '4' ? '∜' : `${[...i].every((c) => SUP[c]) ? [...i].map((c) => SUP[c]).join('') : `^(${i})`}√`
        return simple(a) ? `${sign}${a}` : `${sign}(${a})`
      }
      return ''
    })
    .join('')
}

export const inlineHtml = (s) => s.split(' <br> ').map((x) => toHtml(roots(parse(minus(x))))).join('<br>')
export const inlinePlain = (s) => s.split(' <br> ').map((x) => toPlain(roots(parse(minus(x))))).join('; ')

/** A block of lines (paragraphs, $ display lines, | table rows) → { html, plain } */
export function block(lines) {
  const html = []
  const plain = []
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k]
    if (line.startsWith('|')) {
      const rows = []
      while (k < lines.length && lines[k].startsWith('|')) rows.push(lines[k++].replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
      k--
      let caption = ''
      if (rows[0].length === 1) caption = rows.shift()[0]
      html.push(`<table>${caption ? `<caption>${inlineHtml(caption)}</caption>` : ''}<thead><tr>${rows[0].map((c) => `<th>${inlineHtml(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
      plain.push(...(caption ? [inlinePlain(caption)] : []), ...rows.map((r) => r.map(inlinePlain).join(' | ')))
    } else if (line.startsWith('$')) {
      const t = line.replace(/^\$\s?/, '')
      html.push(`<div class="eq">${inlineHtml(t)}</div>`)
      plain.push(inlinePlain(t))
    } else if (line.trim()) {
      html.push(`<p>${inlineHtml(line)}</p>`)
      plain.push(inlinePlain(line))
    }
  }
  return { html: html.join(''), plain: plain.join('\n') }
}
