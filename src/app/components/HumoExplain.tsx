import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { desmosSolve, explain, HumoOffline, questionPayload, type DesmosSolve } from '../humo'
import { HumoReply } from './HumoDrawer'
import type { TestQuestion } from '../store'
import { RichText } from './RichText'

/** Humo's explanation card — shown above each question in review, and after "Check answer" in practice mode. */
/** Humo's Desmos walkthrough with a checked Desmos screen for a math question. */
export function DesmosSolvePanel({ id, q }: { id: string; q: TestQuestion }) {
  const { token } = useAuth()
  const [st, setSt] = useState<{ data?: DesmosSolve; error?: string; busy?: boolean }>({})
  async function go() {
    setSt({ busy: true })
    try {
      setSt({ data: await desmosSolve({ id: `desmos:${id}`, ...questionPayload(q, null) }, token) })
    } catch (e) {
      setSt({ error: (e as Error).message })
    }
  }
  if (st.data)
    return (
      <div className="mt-3 rounded-2xl border border-[#2d70b3]/20 bg-card p-4 text-[14px] leading-relaxed text-pine">
        <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#2d70b3]">
          <span className="grid size-5 place-items-center rounded-md bg-[#2d70b3] text-[10px] font-bold text-white">D</span> Solved with Desmos
        </p>
        <HumoReply msg={{ role: 'humo', text: st.data.text, desmos: st.data.desmos }} />
      </div>
    )
  return (
    <div className="mt-3">
      <button onClick={go} disabled={st.busy} className="inline-flex items-center gap-2 rounded-full bg-[#2d70b3] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-[#245d96] disabled:opacity-70">
        {st.busy ? <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <span className="grid size-4 place-items-center rounded bg-card text-[9px] font-bold text-[#2d70b3]">D</span>}
        {st.busy ? 'Humo is solving it in Desmos…' : 'Solve it with Desmos'}
      </button>
      {st.error && <p className="mt-2 text-[12.5px] text-moss">{st.error}</p>}
    </div>
  )
}

export function HumoExplain({ testId, qKey, q, compact = false, onAsk, math = false }: { testId: string; qKey: string; q: TestQuestion; compact?: boolean; onAsk?: () => void; math?: boolean }) {
  const { token } = useAuth()
  const [state, setState] = useState<{ text?: string; error?: string; offline?: boolean }>({})
  const [n, setN] = useState(0)

  useEffect(() => {
    let alive = true
    setState({})
    explain(testId, qKey, q, token)
      .then((text) => alive && setState({ text }))
      .catch((e) => alive && setState({ error: e.message, offline: e instanceof HumoOffline }))
    return () => {
      alive = false
    }
  }, [testId, qKey, q, token, n])

  return (
    <div className={`flex gap-3 rounded-2xl border border-jg-500/25 bg-gradient-to-b from-jg-50 to-card ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`}>
      <img src="/brand/humo-mark.svg" alt="" className="size-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-jg-700">Humo explains</p>
          {onAsk && (
            <button onClick={onAsk} className="text-[12px] font-medium text-jg-700 hover:text-jg-600">
              Ask a follow-up
            </button>
          )}
        </div>
        {state.text ? (
          <div className="mt-1.5 text-[14px] leading-relaxed text-pine/85">
            <RichText text={state.text} />
          </div>
        ) : state.error ? (
          <div className="mt-1.5 text-[13.5px] text-pine/75">
            <p>{state.offline ? 'Humo is offline right now.' : state.error}</p>
            {state.offline && <p className="mt-1 text-[12px] text-moss">{state.error}</p>}
            {!state.offline && (
              <button onClick={() => setN((x) => x + 1)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-jg-700">
                <RotateCw className="size-3" /> Try again
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2.5 space-y-2" aria-label="Humo is writing">
            <div className="h-2.5 w-11/12 skeleton rounded-full" />
            <div className="h-2.5 w-4/5 skeleton rounded-full" />
            <div className="h-2.5 w-2/3 skeleton rounded-full" />
          </div>
        )}
        {math && <DesmosSolvePanel id={`${testId}:${qKey}`} q={q} />}
      </div>
    </div>
  )
}
