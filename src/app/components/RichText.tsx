import { Fragment, type ReactNode } from 'react'
import { looksLikeMath, plainMath, TexMath } from './MathTex'

// $…$ / \(…\) formulas: an opening $ not followed by a space, a closing $ not preceded by one and not followed by a digit,
// so money like "$5 and $10" stays text
const MATH = /\\\$|\$\$([^$]+?)\$\$|\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)|\\\((.+?)\\\)|\\\[(.+?)\\\]/g

/** Swaps each formula for a placeholder (so **bold $x$** still works) and returns the formulas. */
function protect(s: string) {
  const math: { src: string; display: boolean }[] = []
  const text = s.replace(MATH, (all: string, dd?: string, d?: string, p?: string, b?: string) => {
    if (all === '\\$') return '$'
    const src = dd ?? d ?? p ?? b ?? ''
    if (d != null && !looksLikeMath(src)) return all
    math.push({ src, display: dd != null || b != null })
    return `\u0000${math.length - 1}\u0000`
  })
  return { text, math }
}

/** Renders Humo's light markdown (**bold**, *italic*, `code`, bullet lines) and typeset math as React nodes — no raw HTML. */
export function RichText({ text }: { text: string }) {
  const inline = (s: string, k: string): ReactNode[] => {
    const { text: t, math } = protect(s)
    // text pieces: formulas from placeholders, raw x^2 / 4/7 / sqrt(2) the model left untypeset
    const words = (piece: string, kk: string) =>
      piece.split(/\u0000(\d+)\u0000/g).map((p, j) =>
        j % 2 ? <TexMath key={`${kk}m${j}`} src={math[Number(p)]?.src ?? ''} display={math[Number(p)]?.display} /> : <Fragment key={`${kk}t${j}`}>{plainMath(p, `${kk}t${j}`)}</Fragment>,
      )
    return t.split(/(\*\*[^*]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g).map((part, i) =>
      part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
        // Desmos lines stay exactly as the student types them
        <code key={k + i} className="rounded-md bg-[#2d70b3]/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#1f5a94] [overflow-wrap:anywhere]">
          {part.slice(1, -1).replace(/\u0000(\d+)\u0000/g, (_, n) => `$${math[Number(n)]?.src ?? ''}$`)}
        </code>
      ) : part.startsWith('**') && part.endsWith('**') ? (
        <strong key={k + i} className="font-semibold">
          {words(part.slice(2, -2), `${k}${i}`)}
        </strong>
      ) : part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
        <em key={k + i}>{words(part.slice(1, -1), `${k}${i}`)}</em>
      ) : (
        <Fragment key={k + i}>{words(part, `${k}${i}`)}</Fragment>
      ),
    )
  }
  return (
    <>
      {text.split('\n').map((line, i) => {
        const bullet = /^\s*[-•*]\s+/.test(line)
        const clean = line.replace(/^\s*[-•*]\s+/, '').replace(/^#{1,4}\s*/, '')
        if (/^\s*-{3,}\s*$/.test(line)) return <span key={i} className="my-2 block h-px bg-current opacity-15" />
        if (!clean.trim()) return <span key={i} className="block h-2" />
        return (
          <span key={i} className={`block ${bullet ? 'relative pl-4' : ''}`}>
            {bullet && <span className="absolute left-0 top-0">•</span>}
            {inline(clean, `${i}-`)}
          </span>
        )
      })}
    </>
  )
}
