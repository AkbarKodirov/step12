import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * Renders math written as \( … \) (inline) or \[ … \] (display) with KaTeX.
 * Only those delimiters are touched, so dollar amounts and older content stay as they are.
 */
const cache = new Map<string, string>()
export function tex(html: string | null | undefined): string {
  if (!html) return ''
  if (!html.includes('\\(') && !html.includes('\\[')) return html
  const hit = cache.get(html)
  if (hit) return hit
  const out = html.replace(/\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g, (all, display: string | undefined, inline: string | undefined) => {
    try {
      return katex.renderToString((display ?? inline ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), { displayMode: display != null, throwOnError: false, output: 'html' })
    } catch {
      return all
    }
  })
  cache.set(html, out)
  return out
}

/** Plain question text → safe HTML with its math rendered. */
export const texText = (s: string) => tex(s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
