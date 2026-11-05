// Plain-text math → Math Hard Book markup ({a/b}, ^{..}, √{..}); shared by mathify-bank.mjs and mathify-papers.mjs
// read a balanced (...) or {...} starting at s[i]; returns end index (exclusive) or -1
function close(s, i) {
  const open = s[i]
  const shut = open === '(' ? ')' : '}'
  let d = 0
  for (let k = i; k < s.length; k++) {
    if (s[k] === open) d++
    else if (s[k] === shut && --d === 0) return k + 1
  }
  return -1
}
function open(s, j) {
  // s[j-1] is ')' or '}' — find its opening bracket
  const shut = s[j - 1]
  const op = shut === ')' ? '(' : '{'
  let d = 0
  for (let k = j - 1; k >= 0; k--) {
    if (s[k] === shut) d++
    else if (s[k] === op && --d === 0) return k
  }
  return -1
}

function powers(s) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '^' && s[i + 1] === '(') {
      const e = close(s, i + 1)
      if (e > 0) {
        out += '^{' + powers(s.slice(i + 2, e - 1)) + '}'
        i = e - 1
        continue
      }
    }
    if (s[i] === '^' && s[i + 1] !== '{') {
      const m = s.slice(i + 1).match(/^[-−]?\w+(?:\.\d+)?/)
      if (m) {
        out += '^{' + m[0] + '}'
        i += m[0].length
        continue
      }
    }
    out += s[i]
  }
  return out
}
function roots(s) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '√' && s[i + 1] === '(') {
      const e = close(s, i + 1)
      if (e > 0) {
        out += '√{' + roots(s.slice(i + 2, e - 1)) + '}'
        i = e - 1
        continue
      }
    }
    if (s[i] === '√' && s[i + 1] !== '{') {
      const m = s.slice(i + 1).match(/^(\d+(?:\.\d+)?|[a-zA-Z])/)
      if (m) {
        out += '√{' + m[0] + '}'
        i += m[0].length
        continue
      }
    }
    out += s[i]
  }
  return out
}
const unwrap = (t) => (t.startsWith('(') && close(t, 0) === t.length ? t.slice(1, -1) : t)
function fractions(s) {
  // operand: (group) | √{..} | number[π letters] | letter, each with an optional ^{..}
  for (let guard = 0; guard < 50; guard++) {
    let depth = 0
    let hit = -1
    for (let k = 0; k < s.length; k++) {
      if (s[k] === '{') depth++
      else if (s[k] === '}') depth--
      else if (s[k] === '/' && depth === 0) {
        hit = k
        break
      }
    }
    if (hit < 0) return s
    // left operand
    let a = hit
    while (a > 0 && s[a - 1] === ' ') a--
    const lEnd = a
    let L = a
    if (s[L - 1] === '}' && s.lastIndexOf('^{', L) >= 0 && open(s, L) > 0 && s[open(s, L) - 1] === '^') L = open(s, L) - 1
    if (s[L - 1] === ')') L = open(s, L)
    else if (s[L - 1] === '}' && s[open(s, L) - 1] === '√') L = open(s, L) - 1
    else {
      const m = s.slice(0, L).match(/(\d(?:\d|,\d|\.\d)*[a-zπ]?|π|[a-zA-Z])[⁰¹²³⁴⁵⁶⁷⁸⁹]*$/)
      if (!m) return s.replace('/', '⁄') // not math: leave a protected slash
      L -= m[0].length
      if (/[a-zA-Z]/.test(s[L - 1] || '') && !/π/.test(m[0])) return s.replace('/', '⁄')
      if (s[L - 1] === '√') L--
    }
    // right operand
    let b = hit + 1
    while (s[b] === ' ') b++
    const rStart = b
    let R = b
    if (s[R] === '(') R = close(s, R)
    else if (s[R] === '√' && s[R + 1] === '{') R = close(s, R + 1)
    else {
      const m = s.slice(R).match(/^([-−]?\d(?:\d|,\d|\.\d)*π?|π|[a-zA-Z])/)
      if (!m) return s.replace('/', '⁄')
      R += m[0].length
      if (/[a-zA-Z]/.test(s[R] || '')) return s.replace('/', '⁄')
    }
    if (R < 0 || L < 0) return s.replace('/', '⁄')
    if (s.slice(R).startsWith('^{')) R = close(s, R + 1)
    while (/[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(s[R] || '')) R++
    let num = s.slice(L, lEnd)
    let den = s.slice(rStart, R)
    if (!/\^\{[^}]*\}$/.test(num)) num = unwrap(num)
    if (!/\^\{[^}]*\}$/.test(den)) den = unwrap(den)
    let pre = s.slice(0, L)
    let post = s.slice(R)
    // (a/b) written with parentheses around a lone fraction: drop them unless a power follows
    if (pre.endsWith('(') && !/[A-Za-z0-9)]$/.test(pre.slice(0, -1)) && post.startsWith(')') && !/^\)[\^²³⁴⁵⁶⁷⁸⁹]/.test(post)) {
      pre = pre.slice(0, -1)
      post = post.slice(1)
    }
    s = pre + '{' + num.replace(/\//g, '⁄') + '/' + den.replace(/\//g, '⁄') + '}' + post
    // the inserted fraction is inside braces, so the scan moves on to the next top-level slash
  }
  return s
}
function words(s) {
  return s
    .replace(/(\w)\s*\*\s*sqrt\(/g, '$1√(')
    .replace(/\bsqrt\(/g, '√(')
    .replace(/(\d)\s*\*\s*pi\b/g, '$1π')
    .replace(/\*\s*pi\b/g, 'π')
    .replace(/(\d)pi\b/g, '$1π')
    .replace(/\bpi\b/g, 'π')
    .replace(/\s*\*\s*/g, '·')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/(\d) x (\d)/g, '$1 × $2')
}
export function toMarkup(line) {
  let s = words(line)
  s = powers(s)
  s = roots(s)
  s = fractions(s)
  return s.replace(/⁄/g, '/')
}

