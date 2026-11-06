import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { GripHorizontal, X } from 'lucide-react'

/*
 * Digital SAT (Bluebook) math reference sheet.
 * Same content and order as the real sheet: a row of plane figures, a row of
 * solids, then the three notes. Figures are hand-drawn SVG; formulas are typeset
 * with real superscripts, stacked fractions and radicals.
 */

const MATH_FONT = '"STIX Two Text", "Cambria Math", Cambria, "Times New Roman", Times, serif'

/* ---------- formula typesetting ---------- */

function V({ children }: { children: ReactNode }) {
  return <i className="pr-[0.04em]">{children}</i>
}

function Sup({ children }: { children: ReactNode }) {
  return <sup className="relative -top-[0.1em] ml-[0.1em] align-super text-[0.66em] not-italic leading-none">{children}</sup>
}

function Frac({ n, d }: { n: ReactNode; d: ReactNode }) {
  return (
    <span className="mx-[0.12em] inline-flex flex-col items-center align-middle text-[0.8em] leading-[1.05]" role="math" aria-label={`${n} over ${d}`}>
      <span className="px-[0.15em]">{n}</span>
      <span className="w-full border-t border-current px-[0.15em]">{d}</span>
    </span>
  )
}

const Pi = () => <span className="mx-[0.03em]">π</span>
const Ell = () => <span className="mx-[0.02em]">ℓ</span>
const Eq = () => <span className="mx-[0.22em]">=</span>

function Formula({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[2.1em] items-center justify-center whitespace-nowrap text-[17px] leading-none text-pine" style={{ fontFamily: MATH_FONT }}>
      {children}
    </div>
  )
}

/* ---------- figure primitives ---------- */

// labels get a halo in the card colour so they stay legible where they cross a line, like a printed figure
const HALO = { stroke: 'var(--color-card)', strokeWidth: 3.5, paintOrder: 'stroke', strokeLinejoin: 'round' } as const
const LABEL = { fontFamily: MATH_FONT, fontStyle: 'italic', fontSize: 13, fill: 'currentColor', ...HALO } as const
const SMALL = { fontFamily: MATH_FONT, fontSize: 9.5, fill: 'currentColor', ...HALO, strokeWidth: 2.5 } as const
const DASH = '3.2 2.6'

function Fig({ w = 120, h = 104, top = 0, label, children }: { w?: number; h?: number; top?: number; label: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 ${top} ${w} ${h - top}`} role="img" aria-label={label} className="mx-auto block h-auto w-full max-w-[150px] text-pine" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </svg>
  )
}

function T({ x, y, children, anchor = 'middle', italic = true }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; italic?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} style={italic ? LABEL : { ...LABEL, fontStyle: 'normal' }}>
      {children}
    </text>
  )
}

/** "coef√rad" drawn inside an SVG, centred on x, with a real radical bar. */
function SvgRoot({ x, y, coef, rad, anchor = 'middle' }: { x: number; y: number; coef: string; rad: string; anchor?: 'start' | 'middle' }) {
  const total = 24
  const x0 = anchor === 'middle' ? x - total / 2 : x
  const a = x0 + 7
  return (
    <g>
      <text x={x0} y={y} style={LABEL}>{coef}</text>
      <text x={a + 9.6} y={y} style={{ ...LABEL, fontStyle: 'normal' }}>{rad}</text>
      <path d={`M${a} ${y - 5} L${a + 2.2} ${y - 6.3} L${a + 4.6} ${y + 1} L${a + 8.6} ${y - 11} H${a + 17.4}`} strokeWidth={1} />    </g>
  )
}

const Dot = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r={1.9} fill="currentColor" stroke="none" />

/* ---------- the figures ---------- */

const CircleFig = () => (
  <Fig label="Circle with radius r">
    <circle cx={60} cy={52} r={38} />
    <Dot x={60} y={52} />
    <line x1={60} y1={52} x2={91.1} y2={30.2} />
    <T x={71} y={36}>r</T>
  </Fig>
)

const RectangleFig = () => (
  <Fig label="Rectangle with length ℓ and width w">
    <rect x={14} y={24} width={88} height={54} />
    <T x={58} y={93} italic={false}>ℓ</T>
    <T x={111} y={55}>w</T>
  </Fig>
)

const TriangleFig = () => (
  <Fig label="Triangle with base b and height h">
    <path d="M10 82 L110 82 L78 20 Z" />
    <line x1={78} y1={20} x2={78} y2={82} strokeDasharray={DASH} />
    <path d="M78 75 H85 V82" strokeWidth={1} />
    <T x={73} y={56} anchor="end">h</T>
    <T x={60} y={97}>b</T>
  </Fig>
)

const RightTriangleFig = () => (
  <Fig label="Right triangle with legs a and b and hypotenuse c">
    <path d="M22 82 L106 82 L22 22 Z" />
    <path d="M22 74 H30 V82" strokeWidth={1} />
    <T x={70} y={47}>c</T>
    <T x={13} y={56}>a</T>
    <T x={64} y={97}>b</T>
  </Fig>
)

const ThirtySixtyFig = () => (
  <Fig w={124} top={24} label="30-60-90 triangle with sides x, x root 3 and 2x">
    <path d="M22 82 L98 82 L22 38 Z" />
    <path d="M22 74 H30 V82" strokeWidth={1} />
    {/* 60° at the top vertex, 30° at the right vertex */}
    <path d="M22 50 A12 12 0 0 0 32.4 44" strokeWidth={1} />
    <path d="M82 82 A16 16 0 0 1 84.2 74" strokeWidth={1} />
    <text x={26} y={62} style={SMALL}>60°</text>
    <text x={79} y={79} textAnchor="end" style={SMALL}>30°</text>
    <T x={14} y={64}>x</T>
    <T x={66} y={56} anchor="start">2x</T>
    <SvgRoot x={60} y={98} coef="x" rad="3" />
  </Fig>
)

const FortyFiveFig = () => (
  <Fig w={112} top={14} label="45-45-90 triangle with sides s, s and s root 2">
    <path d="M22 82 L78 82 L22 26 Z" />
    <path d="M22 74 H30 V82" strokeWidth={1} />
    <path d="M22 39 A13 13 0 0 0 31.2 35.2" strokeWidth={1} />
    <path d="M65 82 A13 13 0 0 1 68.8 72.8" strokeWidth={1} />
    <text x={25} y={53} style={SMALL}>45°</text>
    <text x={62} y={79} textAnchor="end" style={SMALL}>45°</text>
    <T x={14} y={58}>s</T>
    <T x={50} y={97}>s</T>
    <SvgRoot x={54} y={50} coef="s" rad="2" anchor="start" />
  </Fig>
)

const PrismFig = () => (
  <Fig label="Rectangular prism with length ℓ, width w and height h">
    <path d="M36 70 L12 88 M36 70 H104 M36 70 V22" strokeDasharray={DASH} strokeWidth={1.1} />
    <rect x={12} y={40} width={68} height={48} />
    <path d="M12 40 L36 22 H104 L80 40 M80 88 L104 70 V22" />
    <T x={46} y={101} italic={false}>ℓ</T>
    <T x={99} y={89}>w</T>
    <T x={5} y={68}>h</T>
  </Fig>
)

const CylinderFig = () => (
  <Fig label="Cylinder with radius r and height h">
    <ellipse cx={60} cy={22} rx={36} ry={12} />
    <path d="M24 86 A36 12 0 0 0 96 86" />
    <path d="M24 86 A36 12 0 0 1 96 86" strokeDasharray={DASH} strokeWidth={1.1} />
    <path d="M24 22 V86 M96 22 V86" />
    <Dot x={60} y={22} />
    <line x1={60} y1={22} x2={96} y2={22} />
    <T x={78} y={19.5}>r</T>
    <T x={105} y={58}>h</T>
  </Fig>
)

const SphereFig = () => (
  <Fig label="Sphere with radius r">
    <circle cx={60} cy={52} r={38} />
    <path d="M22 52 A38 13 0 0 0 98 52" strokeWidth={1.1} />
    <path d="M22 52 A38 13 0 0 1 98 52" strokeDasharray={DASH} strokeWidth={1.1} />
    <Dot x={60} y={52} />
    <line x1={60} y1={52} x2={98} y2={52} />
    <T x={80} y={49.5}>r</T>
  </Fig>
)

const ConeFig = () => (
  <Fig label="Cone with radius r and height h">
    <path d="M24 82 L60 12 L96 82" />
    <path d="M24 82 A36 12 0 0 0 96 82" />
    <path d="M24 82 A36 12 0 0 1 96 82" strokeDasharray={DASH} strokeWidth={1.1} />
    <line x1={60} y1={12} x2={60} y2={82} strokeDasharray={DASH} strokeWidth={1.1} />
    <path d="M60 76.5 H65.5 V82" strokeWidth={1} />
    <Dot x={60} y={82} />
    <line x1={60} y1={82} x2={96} y2={82} />
    <T x={55} y={54} anchor="end">h</T>
    <T x={82} y={79.5}>r</T>
  </Fig>
)

const PyramidFig = () => (
  <Fig label="Rectangular pyramid with base length ℓ, width w and height h">
    <path d="M38 64 L14 84 M38 64 H106 M38 64 L60 14 M60 14 V74" strokeDasharray={DASH} strokeWidth={1.1} />
    <path d="M60 68 H66 V74" strokeWidth={1} />
    <path d="M14 84 H82 L106 64 L60 14 Z M60 14 L82 84" />
    <T x={48} y={98} italic={false}>ℓ</T>
    <T x={101} y={83}>w</T>
    <T x={56} y={50} anchor="end">h</T>
  </Fig>
)

/* ---------- sheet content ---------- */

type Item = { key: string; fig: ReactNode; formula: ReactNode; wide?: boolean }

const PLANE: Item[] = [
  {
    key: 'circle',
    fig: <CircleFig />,
    formula: (
      <span className="flex flex-col items-center gap-1.5">
        <span><V>A</V><Eq /><Pi /><V>r</V><Sup>2</Sup></span>
        <span><V>C</V><Eq />2<Pi /><V>r</V></span>
      </span>
    ),
  },
  { key: 'rectangle', fig: <RectangleFig />, formula: <span><V>A</V><Eq /><Ell /><V>w</V></span> },
  { key: 'triangle', fig: <TriangleFig />, formula: <span><V>A</V><Eq /><Frac n="1" d="2" /><V>b</V><V>h</V></span> },
  { key: 'right', fig: <RightTriangleFig />, formula: <span><V>c</V><Sup>2</Sup><Eq /><V>a</V><Sup>2</Sup> + <V>b</V><Sup>2</Sup></span> },
  {
    key: 'special',
    wide: true,
    fig: (
      <div className="grid grid-cols-2 items-end gap-1">
        <ThirtySixtyFig />
        <FortyFiveFig />
      </div>
    ),
    formula: <span className="font-sans text-[12px] font-semibold not-italic text-moss">Special Right Triangles</span>,
  },
]

const SOLIDS: Item[] = [
  { key: 'prism', fig: <PrismFig />, formula: <span><V>V</V><Eq /><Ell /><V>w</V><V>h</V></span> },
  { key: 'cylinder', fig: <CylinderFig />, formula: <span><V>V</V><Eq /><Pi /><V>r</V><Sup>2</Sup><V>h</V></span> },
  { key: 'sphere', fig: <SphereFig />, formula: <span><V>V</V><Eq /><Frac n="4" d="3" /><Pi /><V>r</V><Sup>3</Sup></span> },
  { key: 'cone', fig: <ConeFig />, formula: <span><V>V</V><Eq /><Frac n="1" d="3" /><Pi /><V>r</V><Sup>2</Sup><V>h</V></span> },
  { key: 'pyramid', fig: <PyramidFig />, formula: <span><V>V</V><Eq /><Frac n="1" d="3" /><Ell /><V>w</V><V>h</V></span> },
]

function Cell({ item }: { item: Item }) {
  return (
    <div className={`flex flex-col justify-between gap-1 rounded-xl border border-line bg-card px-2 pb-2 pt-2.5 ${item.wide ? 'col-span-2 md:col-span-1' : ''}`}>
      <div className={item.wide ? 'mx-auto w-full max-w-[290px]' : ''}>{item.fig}</div>
      <Formula>{item.formula}</Formula>
    </div>
  )
}

/* ---------- panel ---------- */

type Pos = { x: number; y: number }

export function ReferenceSheet({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)

  // Escape closes the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // keep a dragged panel on screen when the window shrinks
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p, panel.current) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (window.innerWidth < 640 || (e.target as HTMLElement).closest('button')) return
    const r = panel.current?.getBoundingClientRect()
    if (!r) return
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    setPos(clamp({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }, panel.current))
  }
  const endDrag = () => {
    drag.current = null
  }

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Math reference sheet"
      className="fixed inset-x-2 bottom-2 top-16 z-30 flex flex-col overflow-hidden rounded-2xl border border-line bg-cream shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-20 sm:max-h-[calc(100vh-6rem)] sm:w-[min(calc(100vw-1.5rem),52rem)]"
      style={pos ? { left: pos.x, top: pos.y, right: 'auto' } : undefined}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex shrink-0 select-none items-center justify-between gap-2 border-b border-line bg-card px-4 py-2.5 sm:cursor-grab sm:active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="hidden size-4 text-moss sm:block" aria-hidden />
          <span className="text-[13px] font-semibold text-pine">Reference</span>
        </div>
        <div className="flex items-center gap-1">
          {pos && (
            <button onClick={() => setPos(null)} className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-moss hover:bg-cream">
              Reset position
            </button>
          )}
          <button onClick={onClose} aria-label="Close reference sheet" title="Close (Esc)" className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-moss hover:bg-cream">
            Close <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.9fr)]">
          {PLANE.map((it) => <Cell key={it.key} item={it} />)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
          {SOLIDS.map((it) => <Cell key={it.key} item={it} />)}
        </div>
        <div className="mt-3 space-y-1.5 rounded-xl border border-line bg-card px-4 py-3 text-[13.5px] leading-snug text-pine" style={{ fontFamily: MATH_FONT }}>
          <p>The number of degrees of arc in a circle is 360.</p>
          <p>The number of radians of arc in a circle is 2<Pi />.</p>
          <p>The sum of the measures in degrees of the angles of a triangle is 180.</p>
        </div>
      </div>
    </div>
  )
}

function clamp(p: Pos, el: HTMLElement | null): Pos {
  const w = el?.offsetWidth ?? 0
  const h = el?.offsetHeight ?? 0
  return {
    x: Math.min(Math.max(8, p.x), Math.max(8, window.innerWidth - w - 8)),
    y: Math.min(Math.max(8, p.y), Math.max(8, window.innerHeight - Math.min(h, 120))),
  }
}
