import { Fragment } from 'react'

/** Turns stray LaTeX ($x^2$, \frac{a}{b}, \text{…}) into readable plain math. */
function plainMath(t: string) {
  return t
    .replace(/\$\$?([^$\n]+)\$\$?/g, (all: string, m: string) =>
      // money like "$5 and $10" stays as is; only math-looking spans are converted
      !/[\\^_{}=]|^\s*[a-zA-Z]\s*$|^\(/.test(m)
        ? all
        : m
        .replace(/\\text\{([^}]*)\}/g, '$1')
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
        .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
        .replace(/\\cdot|\\times/g, '·')
        .replace(/\\le(q)?/g, '≤')
        .replace(/\\ge(q)?/g, '≥')
        .replace(/\\pi/g, 'π')
        .replace(/\^2(?!\d)/g, '²')
        .replace(/\^3(?!\d)/g, '³')
        .replace(/\\left|\\right/g, '')
        .replace(/[{}]/g, ''),
    )
}

/** Renders Humo's light markdown (**bold**, *italic*, `code`, bullet lines) as React nodes — no raw HTML. */
export function RichText({ text }: { text: string }) {
  const inline = (s: string, k: string) =>
    plainMath(s).split(/(\*\*[^*]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g).map((part, i) =>
      part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
        <code key={k + i} className="rounded-md bg-[#2d70b3]/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#1f5a94]">
          {part.slice(1, -1)}
        </code>
      ) : part.startsWith('**') && part.endsWith('**') ? (
        <strong key={k + i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      ) : part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
        <em key={k + i}>{part.slice(1, -1)}</em>
      ) : (
        <Fragment key={k + i}>{part}</Fragment>
      ),
    )
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
