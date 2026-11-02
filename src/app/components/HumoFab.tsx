import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HumoDrawer } from './HumoDrawer'
import { useStore } from '../store'
import { studentContext } from '../humoContext'
import { useScreen } from '../screen'
import { hello } from '../greetings'
import { AnimatePresence, motion } from 'framer-motion'

const PAGES: Record<string, { name: string; tips: string[] }> = {
  '/app': { name: 'their dashboard', tips: ['What should I do today?', 'How far am I from my target?', 'Make me a plan until my test'] },
  '/app/plan': { name: 'their study plan', tips: ['Make my weekends lighter', 'I only have 1 hour a day', 'Add more Math on Tuesday'] },
  '/app/desmos': { name: 'the Desmos Lab', tips: ['Teach me list regression', 'How do sliders work?', 'Solve x^2 = 3x + 4 with Desmos'] },
  '/app/tests': { name: 'the practice tests list', tips: ['Which mode should I pick?', 'How do modules work?', 'How do I pace a module?'] },
  '/app/practice': { name: 'the Question Bank', tips: ['Which skill should I practice?', 'How many questions a day?'] },
  '/app/vocab': { name: 'vocabulary practice', tips: ['Quiz me on 5 hard words', 'How do I remember words faster?', 'Words-in-context strategy'] },
  '/app/learn/rw': { name: 'the Reading & Writing course', tips: ['Where should I start?', 'Explain transitions simply'] },
  '/app/learn/math': { name: 'the Math & Desmos course', tips: ['Which Desmos move is most useful?', 'Teach me sliders'] },
  '/app/analytics': { name: 'their analytics', tips: ['What is my weakest area?', 'Am I improving?'] },
  '/app/mistakes': { name: 'their mistakes notebook', tips: ['Why do I keep making these mistakes?', 'How should I review mistakes?'] },
}

/** Floating Humo button available on every app page. */
export function HumoFab() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const s = useStore()
  const page = PAGES[pathname] ?? { name: 'the Humo AI app', tips: ['What should I study today?', 'Explain a hard SAT topic'] }
  const screen = useScreen()
  const hi = useMemo(() => hello(), [open])
  const [auto, setAuto] = useState<string | null>(null)
  const context = `${studentContext(s, page.name)}${screen ? `\n\nWHAT THE STUDENT SEES ON SCREEN RIGHT NOW (${screen.title}):\n${screen.text}\nUse this when the student says "this question", "why is it wrong", etc.` : ''}`

  return (
    <>
      <AnimatePresence>
        {screen?.wrong && !open && (
          <motion.button
            key={screen.key}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={() => {
              setAuto('Why is my answer to this question incorrect? Show me where my thinking went wrong.')
              setOpen(true)
            }}
            className="fixed bottom-[8.5rem] right-4 z-30 max-w-[15rem] rounded-2xl rounded-br-md bg-card px-4 py-3 text-left text-[13px] leading-snug text-pine shadow-[0_14px_40px_-14px_rgb(27_41_37/.55)] ring-1 ring-line md:bottom-[5.25rem] md:right-6"
          >
            <span className="font-semibold">I saw that one 👀</span>
            <span className="mt-0.5 block text-moss">Tap and I'll show exactly where it went wrong.</span>
          </motion.button>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask Humo"
        className="group fixed bottom-24 right-4 z-30 flex animate-breathe items-center gap-2 rounded-full bg-pine p-1.5 text-[14px] font-semibold sm:pr-4 text-cream transition-transform hover:scale-[1.04] md:bottom-6 md:right-6"
      >
        <span className="relative">
          <img src="/brand/humo-mark.svg" alt="" className="size-9 rounded-full ring-2 ring-jg-500" />
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-jg-400 ring-2 ring-pine" />
        </span>
        <span className="hidden sm:inline">Ask Humo</span>
      </button>
      <HumoDrawer key={`${pathname}|${screen?.key ?? ''}`} open={open} onClose={() => { setOpen(false); setAuto(null) }} context={context} autoSend={auto} greeting={screen ? `${hi} I can see your screen — ${screen.title}. Ask me anything about it.` : `${hi} I can see you're on ${page.name.replace('their', 'your')}. What can I help with?`} suggestions={screen ? ['Why is my answer wrong?', 'Give me a hint', 'Explain it step by step', 'Solve it with Desmos'] : page.tips} />
    </>
  )
}
