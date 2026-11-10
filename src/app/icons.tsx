import { Swords } from 'lucide-react'

type P = { className?: string }

/** Blitz icon: a stopwatch with a lightning bolt. Uses the current text color like the other icons. */
export function BlitzIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9.5 2h5" />
      <path d="M12 2v2.2" />
      <path d="M19.2 6.3l-1.3 1.3" />
      <circle cx="12" cy="13.5" r="8.2" />
      <path d="M13 8.6l-3.6 5.2h3.2l-1.2 4.4 4.2-5.6h-3.2z" fill="currentColor" />
    </svg>
  )
}

/** Duels sword icon. */
export function GoldSwords({ className }: P) {
  return <Swords className={className} />
}

/** Desmos Lab icon: a graph with a curve. */
export function DesmosIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M6.5 17.5C9 17.5 9.5 7 12.5 7s3.5 7 6.5 7" />
      <circle cx="12.5" cy="7" r="1.2" fill="currentColor" />
    </svg>
  )
}
