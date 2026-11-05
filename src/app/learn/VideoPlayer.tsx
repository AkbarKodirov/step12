import { useEffect, useRef, useState, type RefObject } from 'react'
import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { fmtTime, posterSrc, videoSrc, type Chapter, type VideoLesson } from './videos'

export type PlayerApi = { seek: (t: number, play?: boolean) => void }

const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.75]

export function currentChapter(chapters: Chapter[], t: number) {
  let c = chapters[0]
  for (const ch of chapters) if (ch.t <= t + 0.5) c = ch
  return c
}

/** Humo's own lesson player: chapter marks on the timeline, speed, HD switch, resume, keyboard. */
export function VideoPlayer({ video, startAt = 0, apiRef, onTime, onEnded }: { video: VideoLesson; startAt?: number; apiRef?: RefObject<PlayerApi | null>; onTime?: (t: number, dur: number, playing: boolean) => void; onEnded?: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const v = useRef<HTMLVideoElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [hd, setHd] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [t, setT] = useState(startAt)
  const [dur, setDur] = useState(video.duration)
  const [buf, setBuf] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [full, setFull] = useState(false)
  const [show, setShow] = useState(true)
  const [hover, setHover] = useState<number | null>(null)
  const [waiting, setWaiting] = useState(false)
  const idle = useRef<number | undefined>(undefined)
  const resumeAt = useRef(startAt)
  const keepPlaying = useRef(false)

  const poke = () => {
    setShow(true)
    window.clearTimeout(idle.current)
    idle.current = window.setTimeout(() => !v.current?.paused && setShow(false), 2600)
  }

  const toggle = () => {
    const el = v.current
    if (!el) return
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
    poke()
  }
  const seek = (to: number, play = false) => {
    const el = v.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(to, (el.duration || dur) - 0.2))
    setT(el.currentTime)
    if (play) void el.play().catch(() => {})
    poke()
  }
  if (apiRef) apiRef.current = { seek }

  // switching quality keeps the position
  useEffect(() => {
    const el = v.current
    if (!el) return
    const at = resumeAt.current
    const onMeta = () => {
      if (at > 1) el.currentTime = at
      el.playbackRate = speed
      if (keepPlaying.current) void el.play().catch(() => {})
      keepPlaying.current = false
    }
    el.addEventListener('loadedmetadata', onMeta, { once: true })
    return () => el.removeEventListener('loadedmetadata', onMeta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hd])

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const fullscreen = () => {
    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null
    const vid = v.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
    if (document.fullscreenElement) return void document.exitFullscreen().catch(() => {})
    if (el?.requestFullscreen) return void el.requestFullscreen().catch(() => vid?.webkitEnterFullscreen?.())
    vid?.webkitEnterFullscreen?.() // iPhone
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') (e.preventDefault(), toggle())
    else if (e.key === 'ArrowRight') (e.preventDefault(), seek(t + 5))
    else if (e.key === 'ArrowLeft') (e.preventDefault(), seek(t - 5))
    else if (e.key === 'f') fullscreen()
  }

  const posFromEvent = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * dur
  }
  const drag = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    seek(posFromEvent(e.clientX))
    const move = (ev: PointerEvent) => seek(posFromEvent(ev.clientX))
    const up = () => (window.removeEventListener('pointermove', move), window.removeEventListener('pointerup', up))
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const ch = currentChapter(video.chapters, t)
  const hoverCh = hover != null ? currentChapter(video.chapters, hover) : null
  const controlsOn = show || !playing

  return (
    <div
      ref={box}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerMove={poke}
      className={`group relative aspect-video w-full overflow-hidden bg-black outline-none focus-visible:ring-4 focus-visible:ring-jg-400/50 ${full ? '' : 'rounded-[22px] shadow-[0_30px_60px_-30px_rgba(3,36,74,.6)]'} ${controlsOn ? '' : 'cursor-none'}`}
    >
      <video
        ref={v}
        key={hd ? 'hd' : 'sd'}
        src={videoSrc(video, hd ? '1080p' : '720p')}
        poster={posterSrc(video)}
        preload="metadata"
        playsInline
        className="size-full object-contain"
        onClick={toggle}
        onPlay={() => (setPlaying(true), setStarted(true), poke())}
        onPause={() => (setPlaying(false), setShow(true), onTime?.(v.current!.currentTime, v.current!.duration || dur, false))}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onLoadedMetadata={(e) => {
          setDur(e.currentTarget.duration || video.duration)
          if (!started && startAt > 1) e.currentTarget.currentTime = startAt
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget
          setT(el.currentTime)
          resumeAt.current = el.currentTime
          if (el.buffered.length) setBuf(el.buffered.end(el.buffered.length - 1))
          onTime?.(el.currentTime, el.duration || dur, !el.paused)
        }}
        onEnded={() => (setShow(true), onEnded?.())}
      />

      {/* big play button */}
      {!playing && (
        <button onClick={toggle} aria-label="Play" className="absolute inset-0 grid place-items-center">
          <span className="grid size-[74px] place-items-center rounded-full bg-jg-500/95 text-white shadow-[0_0_0_10px_rgba(200,16,63,.25)] transition-transform hover:scale-105 motion-safe:animate-[pulseRing_2.4s_ease-in-out_infinite] sm:size-20">
            <Play className="ml-1 size-8 fill-white" />
          </span>
          {!started && startAt > 5 && <span className="absolute bottom-20 rounded-full bg-black/60 px-3 py-1 text-[12.5px] font-semibold text-white">Resume from {fmtTime(startAt)}</span>}
        </button>
      )}
      {waiting && playing && <span className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-4 border-white/30 border-t-white" />}

      {/* control bar */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-10 pointer-events-none text-white transition-opacity duration-300 sm:px-4 ${controlsOn ? 'opacity-100 [&>*]:pointer-events-auto' : 'opacity-0'}`}>
        <div ref={bar} onPointerDown={drag} onPointerMove={(e) => setHover(posFromEvent(e.clientX))} onPointerLeave={() => setHover(null)} className="relative flex h-5 cursor-pointer touch-none items-center">
          <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/25">
            <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${(buf / dur) * 100}%` }} />
            <div className="absolute inset-y-0 left-0 bg-jg-500" style={{ width: `${(t / dur) * 100}%` }} />
            {video.chapters.slice(1).map((c) => (
              <span key={c.id} className="absolute inset-y-0 w-[2px] bg-black/60" style={{ left: `${(c.t / dur) * 100}%` }} />
            ))}
          </div>
          <span className="absolute size-3.5 -translate-x-1/2 rounded-full bg-white shadow" style={{ left: `${(t / dur) * 100}%` }} />
          {hover != null && hoverCh && (
            <span className="pointer-events-none absolute bottom-6 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/85 px-2 py-1 text-[11.5px] font-semibold" style={{ left: `clamp(60px, ${(hover / dur) * 100}%, calc(100% - 60px))` }}>
              {fmtTime(hover)} · {hoverCh.title}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[12.5px] tabular-nums sm:gap-2">
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="grid size-9 place-items-center rounded-full hover:bg-white/15">
            {playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
          </button>
          <button onClick={() => seek(t - 10)} aria-label="Back 10 seconds" className="grid size-9 place-items-center rounded-full hover:bg-white/15">
            <RotateCcw className="size-[18px]" />
          </button>
          <button onClick={() => seek(t + 10)} aria-label="Forward 10 seconds" className="hidden size-9 place-items-center rounded-full hover:bg-white/15 sm:grid">
            <RotateCw className="size-[18px]" />
          </button>
          <span className="ml-1 shrink-0">
            {fmtTime(t)} <span className="text-white/60">/ {fmtTime(dur)}</span>
          </span>
          <span className="ml-2 hidden min-w-0 truncate text-white/80 sm:block">{ch.title}</span>
          <span className="flex-1" />
          <button onClick={() => { const n = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; setSpeed(n); if (v.current) v.current.playbackRate = n }} aria-label="Playback speed" className="h-7 rounded-md border border-white/50 px-1.5 text-[12px] font-bold hover:bg-white/15">
            {speed}×
          </button>
          <button onClick={() => { keepPlaying.current = playing; setHd((x) => !x) }} aria-label="Video quality" className={`h-7 rounded-md px-1.5 text-[11.5px] font-bold ${hd ? 'bg-jg-500' : 'border border-white/50 hover:bg-white/15'}`}>
            {hd ? 'HD' : 'SD'}
          </button>
          <button onClick={fullscreen} aria-label="Full screen" className="grid size-9 place-items-center rounded-full hover:bg-white/15">
            {full ? <Minimize className="size-[18px]" /> : <Maximize className="size-[18px]" />}
          </button>
        </div>
      </div>
    </div>
  )
}
