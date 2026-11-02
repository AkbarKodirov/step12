import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, ExternalLink, X } from 'lucide-react'
import { renderDesmosSvg, type DesmosScreen as Screen } from '../../shared/desmos-render.js'

export type { Screen as DesmosScreenData }

// Desmos's public demo key works for study; set VITE_DESMOS_API_KEY to the site's own free key from desmos.com/api.
const DESMOS_KEY = import.meta.env.VITE_DESMOS_API_KEY || 'dcb31709b452b1cf9dc26972add0fda6'

/** Plain Desmos text → Desmos LaTeX, for lines Humo didn't give LaTeX for. */
export function toLatex(t: string) {
  let s = t
  // sqrt(…) → \sqrt{…}
  for (let guard = 0; guard < 10 && s.includes('sqrt('); guard++) {
    const i = s.indexOf('sqrt(')
    let depth = 0
    let j = i + 4
    for (; j < s.length; j++) {
      if (s[j] === '(') depth++
      if (s[j] === ')' && --depth === 0) break
    }
    s = `${s.slice(0, i)}\\sqrt{${s.slice(i + 5, j)}}${s.slice(j + 1)}`
  }
  return s
    .replace(/~/g, '\\sim ')
    .replace(/<=/g, '\\le ')
    .replace(/>=/g, '\\ge ')
    .replace(/\*/g, '\\cdot ')
    .replace(/\bpi\b/g, '\\pi ')
    .replace(/\[/g, '\\left[')
    .replace(/\]/g, '\\right]')
}

type DesmosCalc = { setExpression: (e: { id: string; latex: string }) => void; setMathBounds: (b: object) => void; destroy: () => void }
declare global {
  interface Window {
    Desmos?: { GraphingCalculator: (el: HTMLElement, opts?: object) => DesmosCalc }
  }
}
let desmosLoading: Promise<void> | null = null
function loadDesmos() {
  if (window.Desmos) return Promise.resolve()
  desmosLoading ??= new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = `https://www.desmos.com/api/v1.9/calculator.js?apiKey=${DESMOS_KEY}`
    s.onload = () => res()
    s.onerror = () => {
      desmosLoading = null
      rej(new Error('Could not load Desmos. Check your connection.'))
    }
    document.head.appendChild(s)
  })
  return desmosLoading
}

/** The real Desmos calculator with Humo's lines already typed in: Desmos itself computes everything. */
export function LiveDesmos({ screen, className = 'h-[60vh]' }: { screen: Screen; className?: string }) {
  const el = useRef<HTMLDivElement>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let calc: DesmosCalc | null = null
    let alive = true
    loadDesmos()
      .then(() => {
        if (!alive || !el.current || !window.Desmos) return
        calc = window.Desmos.GraphingCalculator(el.current, { expressionsCollapsed: false, settingsMenu: false })
        screen.lines.forEach((l, i) => calc!.setExpression({ id: `e${i}`, latex: l.latex || toLatex(l.text) }))
        const [left, right, bottom, top] = screen.window
        calc.setMathBounds({ left, right, bottom, top })
      })
      .catch((e) => alive && setErr(e.message))
    return () => {
      alive = false
      calc?.destroy()
    }
  }, [screen])
  return err ? <p className="grid h-40 place-items-center text-[13px] text-moss">{err}</p> : <div ref={el} className={`w-full ${className}`} />
}

/** Humo's checked Desmos screen picture, with "open live" and "save" actions. */
export function DesmosScreen({ screen, compact = false }: { screen: Screen; compact?: boolean }) {
  const [live, setLive] = useState(false)
  const svg = useMemo(() => renderDesmosSvg(screen), [screen])
  const src = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg])

  function save() {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width * 2
      c.height = img.height * 2
      const g = c.getContext('2d')!
      g.scale(2, 2)
      g.drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.href = c.toDataURL('image/png')
      a.download = `humo-desmos-${(screen.title || 'solve').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`
      a.click()
    }
    img.src = src
  }

  return (
    <figure className={`overflow-hidden rounded-2xl border border-line-strong bg-card shadow-[0_8px_30px_-20px_rgb(27_41_37/.5)] ${compact ? '' : 'my-3'}`}>
      <figcaption className="flex items-center gap-2 border-b border-line bg-soft px-3 py-2 text-[12px]">
        <span className="grid size-5 place-items-center rounded-md bg-[#2d70b3] text-[10px] font-bold text-white">D</span>
        <span className="min-w-0 flex-1 truncate font-medium text-pine">{screen.title || 'Desmos screen'}</span>
        <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 sm:inline">Numbers checked</span>
        <button onClick={() => setLive(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-[#2d70b3] hover:bg-[#2d70b3]/10">
          <ExternalLink className="size-3.5" /> Live
        </button>
        <button onClick={save} aria-label="Save picture" className="rounded-lg p-1 text-moss hover:bg-cream">
          <Download className="size-3.5" />
        </button>
      </figcaption>
      <img src={src} alt={`Desmos screen: ${screen.lines.map((l) => l.text).join('; ')}`} className="block w-full" draggable={false} />
      {createPortal(
        <AnimatePresence>
          {live && (
            <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-pine/50 p-3 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLive(false)}>
              <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl overflow-hidden rounded-3xl bg-card">
                <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                  <p className="flex-1 text-[14px] font-semibold text-pine">Live Desmos · {screen.title || 'Humo solve'}</p>
                  <button onClick={() => setLive(false)} aria-label="Close" className="rounded-full p-1.5 text-moss hover:bg-cream">
                    <X className="size-5" />
                  </button>
                </div>
                <LiveDesmos screen={screen} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </figure>
  )
}
