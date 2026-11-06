import { Fragment, type ReactNode } from 'react'

/**
 * A small LaTeX-subset typesetter for Humo's replies ($\frac{4}{7}$, $x^{2}$, $\sqrt{2}$ …), drawn with the same
 * .fr (stacked fraction) and .rad (radical with a bar) styles the Question bank uses (.math-q in index.css).
 * No dependencies and no raw HTML: everything becomes React nodes.
 */

const SYM: Record<string, string> = {
  cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', sim: '∼',
  equiv: '≡', lt: '<', gt: '>', pi: 'π', theta: 'θ', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', lambda: 'λ', mu: 'μ', sigma: 'σ',
  infty: '∞', circ: '°', degree: '°', to: '→', rightarrow: '→', Rightarrow: '⇒', implies: '⇒', iff: '⇔', angle: '∠', triangle: '△', perp: '⊥',
  parallel: '∥', cdots: '⋯', ldots: '…', dots: '…', in: '∈', cup: '∪', cap: '∩', prime: '′', '%': '%', $: '$', '{': '{', '}': '}', '#': '#', '&': '&',
  ',': ' ', ';': ' ', ':': ' ', ' ': ' ', quad: ' ', qquad: '  ', '!': '', '|': '‖',
}
const OPS = new Set(['=', '+', '−', '<', '>', '≤', '≥', '≠', '≈', '∼', '±', '∓', '×', '÷', '≡', '→', '⇒', '⇔', '·'])
const WORDS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'min', 'max', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'mean', 'median'])

type Node = string | { k: 'sup' | 'sub' | 'rad' | 'up' | 'over' | 'box'; c: Node[]; i?: Node[] } | { k: 'fr'; n: Node[]; d: Node[] } | { k: 'op'; t: string } | { k: 'var'; t: string }

function parse(src: string): Node[] {
  let i = 0
  const s = src
  function atom(): Node[] {
    // one argument: {group}, \command, or a single character
    while (s[i] === ' ') i++
    if (s[i] === '{') {
      i++
      return group('}')
    }
    if (s[i] === '\\') return command()
    const c = s[i++]
    return c == null ? [] : token(c)
  }
  function token(c: string): Node[] {
    if (/[A-Za-z]/.test(c)) return [{ k: 'var', t: c }]
    if (c === '-') return [{ k: 'op', t: '−' }]
    if (c === '*') return [{ k: 'op', t: '·' }]
    if (OPS.has(c)) return [{ k: 'op', t: c }]
    if (c === '~') return [' ']
    return [c]
  }
  function command(): Node[] {
    i++ // backslash
    let name = ''
    if (/[A-Za-z]/.test(s[i] || '')) while (/[A-Za-z]/.test(s[i] || '')) name += s[i++]
    else name = s[i++] || ''
    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
      const n = atom()
      const d = atom()
      return [{ k: 'fr', n, d }]
    }
    if (name === 'sqrt') {
      let idx: Node[] | undefined
      if (s[i] === '[') {
        const j = s.indexOf(']', i)
        idx = parse(s.slice(i + 1, j < 0 ? s.length : j))
        i = j < 0 ? s.length : j + 1
      }
      return [{ k: 'rad', c: atom(), i: idx }]
    }
    if (name === 'left' || name === 'right' || name === 'big' || name === 'Big' || name === 'bigl' || name === 'bigr') {
      while (s[i] === ' ') i++
      if (s[i] === '.') {
        i++
        return []
      }
      if (s[i] === '\\') return command()
      return s[i] ? [s[i++]] : []
    }
    if (['text', 'mathrm', 'textbf', 'mathbf', 'operatorname', 'textit', 'mbox'].includes(name)) {
      while (s[i] === ' ') i++
      if (s[i] !== '{') return []
      const j = matching(i)
      const t = s.slice(i + 1, j)
      i = j + 1
      return [{ k: 'up', c: [t] }]
    }
    if (name === 'overline' || name === 'bar') return [{ k: 'over', c: atom() }]
    if (name === 'boxed') return [{ k: 'box', c: atom() }]
    if (name === 'displaystyle' || name === 'limits' || name === 'mathit') return []
    if (WORDS.has(name)) return [{ k: 'up', c: [name] }]
    const sym = SYM[name]
    if (sym != null) return OPS.has(sym) ? [{ k: 'op', t: sym }] : [sym]
    return [name]
  }
  function matching(open: number) {
    let depth = 0
    for (let j = open; j < s.length; j++) {
      if (s[j] === '\\') {
        j++
        continue
      }
      if (s[j] === '{') depth++
      if (s[j] === '}' && --depth === 0) return j
    }
    return s.length
  }
  function group(end?: string): Node[] {
    const out: Node[] = []
    while (i < s.length) {
      const c = s[i]
      if (end && c === end) {
        i++
        break
      }
      if (c === '^' || c === '_') {
        i++
        const arg = atom()
        // x^\circ → x°
        if (c === '^' && arg.length === 1 && arg[0] === '°') out.push('°')
        else out.push({ k: c === '^' ? 'sup' : 'sub', c: arg })
        continue
      }
      if (c === '\\') {
        out.push(...command())
        continue
      }
      if (c === '{') {
        i++
        out.push(...group('}'))
        continue
      }
      i++
      if (c === ' ' || c === '\n') continue
      out.push(...token(c))
    }
    return out
  }
  return group()
}

function render(nodes: Node[], key: string): ReactNode[] {
  const out: ReactNode[] = []
  let prevOperand = false
  nodes.forEach((n, j) => {
    const k = `${key}.${j}`
    if (typeof n === 'string') {
      out.push(<Fragment key={k}>{n}</Fragment>)
      prevOperand = /[\w)\]|°′.]$/.test(n)
      return
    }
    switch (n.k) {
      case 'var':
        out.push(<i key={k}>{n.t}</i>)
        prevOperand = true
        return
      case 'op': {
        // binary operators get space around them; a leading minus or sign does not
        const binary = prevOperand || n.t === '=' || !['−', '+', '±'].includes(n.t)
        out.push(binary ? <span key={k} className="mx-[0.22em]">{n.t}</span> : <Fragment key={k}>{n.t}</Fragment>)
        prevOperand = false
        return
      }
      case 'fr':
        out.push(
          <span key={k} className="fr">
            <span>{render(n.n, `${k}n`)}</span>
            <span>{render(n.d, `${k}d`)}</span>
          </span>,
        )
        break
      case 'sup':
        out.push(<sup key={k} className="text-[0.72em]">{render(n.c, k)}</sup>)
        break
      case 'sub':
        out.push(<sub key={k} className="text-[0.72em]">{render(n.c, k)}</sub>)
        break
      case 'rad':
        if (n.i) out.push(<span key={`${k}i`} className="ri">{render(n.i, `${k}i`)}</span>)
        out.push(<span key={k} className="rad">{render(n.c, k)}</span>)
        break
      case 'up':
        out.push(<span key={k} className="not-italic">{n.c.join('')}</span>)
        break
      case 'over':
        out.push(<span key={k} className="border-t border-current pt-[0.05em]">{render(n.c, k)}</span>)
        break
      case 'box':
        out.push(<span key={k} className="rounded border border-current px-1">{render(n.c, k)}</span>)
        break
    }
    prevOperand = true
  })
  return out
}

/** One typeset formula (the inside of $…$). */
export function TexMath({ src, display = false }: { src: string; display?: boolean }) {
  let nodes: ReactNode[]
  try {
    nodes = render(parse(src), 'm')
  } catch {
    nodes = [src]
  }
  return <span className={`math-q font-serif text-[1.06em] ${display ? 'my-1 block overflow-x-auto text-center' : ''}`}>{nodes}</span>
}

/** Does the inside of $…$ look like math (and not "costs $5 and $10")? */
export const looksLikeMath = (m: string) => /[\\^_{}=+<>/]|^\s*[A-Za-z]\s*$|^\s*-?\d+(\.\d+)?\s*$|[A-Za-z]\s*[-+*]/.test(m)

/**
 * Plain text the model wrote without $…$: x^2, (x+1)^2, 4/7, sqrt(2) become real powers, stacked fractions and radicals.
 * Ordinary prose (and/or, 11/6/2026, URLs) is left alone.
 */
export function plainMath(text: string, key: string): ReactNode[] {
  const re = /(\\frac\{[^{}]*\}\{[^{}]*\}|(?:sqrt|√)\(([^()]*)\)|√(\d+(?:\.\d+)?|[a-z])\b|(?<![\w/.])(-?\d+(?:\.\d+)?[a-z]?|[a-z])\/(\d+(?:\.\d+)?[a-z]?|[a-z])(?![\w/.]*\/)(?![\w])|\(([^()]+)\)\/\(([^()]+)\)|\^(\{[^{}]+\}|\([^()]+\)|-?[\w.]+))/g
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let n = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${key}p${n++}`
    if (m[0].startsWith('\\frac')) out.push(<TexMath key={k} src={m[0]} />)
    else if (m[2] != null) out.push(<span key={k} className="math-q"><span className="rad">{m[2]}</span></span>)
    else if (m[3] != null) out.push(<span key={k} className="math-q"><span className="rad">{m[3]}</span></span>)
    else if (m[4] != null) out.push(<TexMath key={k} src={`\\frac{${m[4]}}{${m[5]}}`} />)
    else if (m[6] != null) out.push(<TexMath key={k} src={`\\frac{${m[6]}}{${m[7]}}`} />)
    else if (m[8] != null) out.push(<sup key={k} className="text-[0.72em]">{m[8].replace(/^\{(.*)\}$/, '$1').replace(/^\((.*)\)$/, '$1').replace(/-/g, '−')}</sup>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
