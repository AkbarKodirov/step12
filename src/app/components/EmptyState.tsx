import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

/** Friendly empty screen with a floating Humo — an invitation to act, not a dead end. */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { to: string; label: string } }) {
  return (
    <div className="card relative overflow-hidden px-6 py-14 text-center">
      <div className="pointer-events-none absolute left-1/2 top-6 size-40 -translate-x-1/2 rounded-full bg-jg-500/10 blur-2xl" />
      <motion.img
        src="/brand/humo-mark.svg"
        alt=""
        className="relative mx-auto size-16 rounded-2xl shadow-lg shadow-pine/10"
        animate={{ y: [0, -8, 0], rotate: [0, -3, 0, 3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <p className="relative mt-6 font-serif text-[22px]">{title}</p>
      {body && <p className="relative mx-auto mt-2 max-w-sm text-[14px] text-moss">{body}</p>}
      {action && (
        <Link to={action.to} className="btn btn-dark relative mt-6 h-11 px-6 text-[14px]">
          {action.label}
        </Link>
      )}
    </div>
  )
}
