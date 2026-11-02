/** Humo AI logo: the Humo bird mark plus the "Humo AI" wordmark. Text colour follows the parent. */
export function HumoLogo({ className = 'h-8' }: { className?: string }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Humo AI">
      <img src="/brand/humo-mark.svg" alt="" className={`${className} w-auto rounded-[22%]`} />
      <span className="text-[19px] font-semibold leading-none tracking-tight" aria-hidden>
        Humo<span className="text-[#f2b630]"> AI</span>
      </span>
    </span>
  )
}
