import { useId } from 'react'
import { Swords } from 'lucide-react'

// One shared gold for the new icons (Blitz, Duels).
export const GOLD_LIGHT = '#f7da85'
export const GOLD_DARK = '#d79a22'

function GoldDefs({ id }: { id: string }) {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={GOLD_LIGHT} />
          <stop offset="1" stopColor={GOLD_DARK} />
        </linearGradient>
      </defs>
    </svg>
  )
}

type P = { className?: string }

/** New Blitz icon: a stopwatch with a lightning bolt, in gold. */
export function BlitzIcon({ className }: P) {
  const id = 'gold' + useId().replace(/:/g, '')
  return (
    <span className="inline-flex">
      <GoldDefs id={id} />
      <svg viewBox="0 0 24 24" fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <path d="M9.5 2h5" />
        <path d="M12 2v2.2" />
        <path d="M19.2 6.3l-1.3 1.3" />
        <circle cx="12" cy="13.5" r="8.2" />
        <path d="M13 8.6l-3.6 5.2h3.2l-1.2 4.4 4.2-5.6h-3.2z" fill={`url(#${id})`} />
      </svg>
    </span>
  )
}

/** Duels sword icon in the same gold. */
export function GoldSwords({ className }: P) {
  const id = 'gold' + useId().replace(/:/g, '')
  return (
    <span className="inline-flex">
      <GoldDefs id={id} />
      <Swords className={className} stroke={`url(#${id})`} />
    </span>
  )
}

/** Desmos Lab icon: a graph with a curve, in the same gold. */
export function DesmosIcon({ className }: P) {
  const id = 'gold' + useId().replace(/:/g, '')
  return (
    <span className="inline-flex">
      <GoldDefs id={id} />
      <svg viewBox="0 0 24 24" fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <path d="M3 3v18h18" />
        <path d="M6.5 17.5C9 17.5 9.5 7 12.5 7s3.5 7 6.5 7" />
        <circle cx="12.5" cy="7" r="1.2" fill={`url(#${id})`} />
      </svg>
    </span>
  )
}
