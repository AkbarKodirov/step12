import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Bell, CalendarPlus, Check, Download, Languages, LogOut, Monitor, Moon, Plug, Shield, RotateCcw, Sigma, Sun, Trash2, Upload, UserRound } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { getStore, resetStore, setStore, streak, useStore, type Settings as SettingsT, type Profile } from '../store'
import { DAY_NAMES, downloadIcs, generatePlan } from '../plan'
import { Avatar } from '../AppShell'
import { openUpgrade, useAccount } from '../account'

const TABS = [
  ['account', 'Account', UserRound],
  ['preferences', 'Preferences', Sun],
  ['study', 'Study & integrations', CalendarPlus],
  ['data', 'Data & privacy', Shield],
] as const

function Section({ icon: Icon, title, sub, children }: { icon: typeof Bell; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream text-pine">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-[16px] font-semibold">{title}</h2>
          {sub && <p className="text-[12.5px] text-moss">{sub}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </motion.section>
  )
}

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center gap-4 rounded-xl py-2 text-left">
      <span className="flex-1">
        <span className="block text-[14px] font-medium">{label}</span>
        {sub && <span className="block text-[12px] text-moss">{sub}</span>}
      </span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-jg-500' : 'bg-line-strong'}`}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} className={`absolute top-0.5 size-5 rounded-full bg-card shadow ${on ? 'right-0.5' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-cream p-1">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`relative rounded-lg px-3.5 py-1.5 text-[13px] font-medium ${value === v ? 'text-pine' : 'text-moss'}`}>
          {value === v && <motion.span layoutId={`seg-${options.map((o) => o[0]).join()}`} className="absolute inset-0 rounded-lg bg-card shadow-sm" />}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  )
}

export default function Settings() {
  const { user, token, signOut } = useAuth()
  const acc = useAccount()
  const s = useStore()
  const nav = useNavigate()
  const file = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)
  const [danger, setDanger] = useState<null | 'reset' | 'delete'>(null)
  const [typed, setTyped] = useState('')
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('account')
  const [joined, setJoined] = useState<number | null>(user?.createdAt ?? null)
  useEffect(() => {
    if (joined || !token) return
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user?.createdAt && setJoined(d.user.createdAt))
      .catch(() => {})
  }, [joined, token])
  const p = s.profile

  const flash = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1400)
  }
  const prof = (x: Partial<Profile>) => {
    setStore((st) => ({ ...st, profile: { ...st.profile, ...x } }))
    flash()
  }
  const set = (x: Partial<SettingsT>) => {
    setStore((st) => ({ ...st, settings: { ...st.settings, ...x } }))
    flash()
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'Humo AI', exportedAt: new Date().toISOString(), user: { name: user?.name, email: user?.email }, progress: getStore() }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `step12-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  async function importData(f: File) {
    try {
      const j = JSON.parse(await f.text())
      const prog = j.progress ?? j
      if (!Array.isArray(prog.attempts)) throw new Error()
      setStore((st) => ({ ...st, ...prog }))
      flash()
    } catch {
      alert('That file is not a Humo AI progress export.')
    }
  }
  async function deleteAccount() {
    try {
      await fetch('/api/me', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    } catch {
      /* offline: local data is still removed */
    }
    resetStore()
    try {
      localStorage.removeItem(`step12.progress.${user?.email?.toLowerCase()}`)
      localStorage.removeItem(`jamals.progress.${user?.email?.toLowerCase()}`)
    } catch {
      /* ignore */
    }
    signOut()
    nav('/')
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between">
        <h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Settings</h1>
        <AnimatePresence>
          {saved && (
            <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 rounded-full bg-jg-50 px-3 py-1 text-[12.5px] font-medium text-jg-700">
              <Check className="size-3.5" /> Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[13rem_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[14px] font-medium ${tab === k ? 'text-pine' : 'text-moss hover:text-pine'}`}>
              {tab === k && <motion.span layoutId="settings-tab" className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-line" />}
              <Icon className="relative size-4" /> <span className="relative">{l}</span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-4">
          {tab === 'account' && (
            <>
        <section className="card overflow-hidden">
          <div className="relative h-24 bg-gradient-to-r from-[#0b1d36] via-[#85082a] to-[#c8103f]">
            <img src="/sensai-enso.png" alt="" className="absolute -bottom-6 right-4 h-28 opacity-40" />
          </div>
          <div className="px-6 pb-6">
            <div className="relative -mt-10 flex flex-wrap items-start gap-4">
              <span className="rounded-full ring-4 ring-card">
                <Avatar size="size-20" />
              </span>
              <div className="mt-12 min-w-0 flex-1">
                <p className="text-[20px] font-semibold">{user?.name}</p>
                <p className="truncate text-[13px] text-moss">{user?.email}</p>
              </div>
              {acc.pro ? (
                <button onClick={() => openUpgrade()} className="mt-14 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-3 py-1 text-[12px] font-bold text-[#3a2400]">
                  <Crown className="size-3.5" /> Humo Pro{acc.plan.until ? ` · until ${new Date(acc.plan.until).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                </button>
              ) : (
                <button onClick={() => openUpgrade()} className="mt-14 inline-flex items-center gap-1 rounded-full bg-jg-50 px-3 py-1 text-[12px] font-semibold text-jg-700">
                  Free plan · <Crown className="size-3.5" /> Upgrade to Pro
                </button>
              )}
            </div>
            <dl className="mt-5 grid gap-3 text-[13.5px] sm:grid-cols-3">
              <div className="rounded-2xl bg-soft p-3.5">
                <dt className="text-[12px] text-moss">Joined</dt>
                <dd className="mt-0.5 font-medium">{joined ? new Date(joined).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</dd>
              </div>
              <div className="rounded-2xl bg-soft p-3.5">
                <dt className="text-[12px] text-moss">Signed in with</dt>
                <dd className="mt-0.5 font-medium">{user?.provider === 'google' ? 'Google' : user?.provider === 'email' ? 'Email & password' : 'Demo'}</dd>
              </div>
              <div className="rounded-2xl bg-soft p-3.5">
                <dt className="text-[12px] text-moss">Goal</dt>
                <dd className="mt-0.5 font-medium">
                  {p.target}
                  {p.testDate ? ` · SAT ${new Date(p.testDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                </dd>
              </div>
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Questions', s.practice.solved + s.attempts.reduce((a, x) => a + x.total, 0)],
                ['Practice tests', s.attempts.length],
                ['Day streak', streak(s.activeDays)],
                ['Words mastered', Object.values(s.vocab).filter((v) => v.reps >= 3).length],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl border border-line p-3.5">
                  <p className="font-serif text-[24px] leading-none tabular-nums">{v}</p>
                  <p className="mt-1 text-[11.5px] text-moss">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="card border-red-200 p-6">
          <h2 className="text-[16px] font-semibold">Account</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                signOut()
                nav('/')
              }}
              className="btn btn-ghost h-10 px-4 text-[13px]"
            >
              <LogOut className="size-4" /> Sign out
            </button>
            <button onClick={() => setDanger('reset')} className="btn h-10 border border-red-200 px-4 text-[13px] text-red-600 hover:bg-red-50">
              <RotateCcw className="size-4" /> Reset progress
            </button>
            <button onClick={() => setDanger('delete')} className="btn h-10 border border-red-200 px-4 text-[13px] text-red-600 hover:bg-red-50">
              <Trash2 className="size-4" /> Delete account
            </button>
          </div>
          <AnimatePresence>
            {danger && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 rounded-2xl bg-red-50 p-4 text-[13.5px] text-red-900">
                  {danger === 'reset' ? 'This erases your tests, practice, vocabulary, plan and chats on this device.' : 'This deletes your Humo AI account and all progress. It cannot be undone.'} Type <b>DELETE</b> to confirm.
                  <div className="mt-3 flex gap-2">
                    <input value={typed} onChange={(e) => setTyped(e.target.value)} className="w-36 rounded-lg border border-red-200 bg-card px-3 py-2 text-[14px] focus:outline-none" />
                    <button
                      disabled={typed !== 'DELETE'}
                      onClick={() => {
                        if (danger === 'reset') {
                          resetStore()
                          setDanger(null)
                          setTyped('')
                          nav('/app')
                        } else deleteAccount()
                      }}
                      className="btn h-10 bg-red-600 px-4 text-[13px] text-white disabled:opacity-40"
                    >
                      {danger === 'reset' ? 'Reset everything' : 'Delete my account'}
                    </button>
                    <button
                      onClick={() => {
                        setDanger(null)
                        setTyped('')
                      }}
                      className="px-3 text-[13px] text-red-900/70"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
            </>
          )}
          {tab === 'preferences' && (
            <>
        <Section icon={Sun} title="Appearance" sub="Light, dark, or follow your device">
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['system', 'System', Monitor],
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
              ] as const
            ).map(([k, l, Icon]) => {
              const on = s.settings.theme === k
              return (
                <motion.button key={k} whileTap={{ scale: 0.97 }} onClick={() => set({ theme: k })} className={`overflow-hidden rounded-2xl border-2 text-left transition ${on ? 'border-jg-500 shadow-[0_0_0_4px_rgb(72_174_79/.15)]' : 'border-line hover:border-line-strong'}`}>
                  <div className={`relative h-20 ${k === 'dark' ? 'bg-[#070f1c]' : k === 'light' ? 'bg-[#f6f7fb]' : 'bg-gradient-to-r from-[#f6f7fb] from-50% to-[#070f1c] to-50%'}`}>
                    <span className="absolute inset-y-2 left-2 w-5 rounded-md bg-[#0b1d36]" />
                    <span className={`absolute left-9 right-3 top-3 h-5 rounded-md ${k === 'dark' ? 'bg-[#0e1a2c]' : 'bg-[#ffffff]'} ring-1 ring-black/5`} />
                    <span className={`absolute bottom-3 left-9 h-5 w-1/3 rounded-md ${k === 'dark' ? 'bg-[#0e1a2c]' : 'bg-[#ffffff]'} ring-1 ring-black/5`} />
                    <span className="absolute bottom-3 right-3 h-5 w-8 rounded-md bg-[#c8103f]" />
                  </div>
                  <span className="flex items-center gap-2 px-3 py-2.5 text-[13.5px] font-medium">
                    <Icon className="size-4" /> {l}
                    {on && <Check className="ml-auto size-4 text-jg-600" />}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </Section>

        <Section icon={Languages} title="Humo" sub="How your tutor talks to you">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[14px] font-medium">Reply language</span>
              <Seg
                value={s.settings.language}
                options={[
                  ['en', 'English'],
                  ['uz', "O'zbekcha"],
                  ['ru', 'Русский'],
                ]}
                onChange={(v) => set({ language: v })}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[14px] font-medium">When I ask about a question</span>
              <Seg
                value={s.settings.humoStyle}
                options={[
                  ['hint', 'Hint first'],
                  ['full', 'Full solution'],
                ]}
                onChange={(v) => set({ humoStyle: v })}
              />
            </div>
            <Toggle on={s.settings.desmosFirst} onChange={(v) => set({ desmosFirst: v })} label="Desmos-first Math" sub="Humo solves math the Desmos way with a checked Desmos screen" />
          </div>
        </Section>

        <Section icon={Bell} title="Goals & reminders">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] font-medium">Daily question goal</span>
            <Seg value={String(s.settings.dailyGoal)} options={['10', '20', '40', '60'].map((n) => [n, n])} onChange={(v) => set({ dailyGoal: Number(v) })} />
          </div>
          <div className="mt-3 divide-y divide-line">
            <Toggle
              on={s.settings.reminders}
              onChange={async (v) => {
                if (v && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
                set({ reminders: v })
              }}
              label="Study reminder"
              sub={`A nudge at ${p.studyTime ?? '18:00'} on study days while Humo AI is open. For phone alerts, add the plan to Google Calendar.`}
            />
            <Toggle on={s.settings.sounds} onChange={(v) => set({ sounds: v })} label="Sounds" sub="Soft sounds for correct answers and streaks" />
          </div>
        </Section>

            </>
          )}
          {tab === 'study' && (
            <>
        <Section icon={CalendarPlus} title="Study schedule & Google Calendar" sub="Used for your plan, reminders and calendar events">
          <p className="text-[13px] text-moss">Study days</p>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {DAY_NAMES.map((d, i) => {
              const on = (p.studyDays ?? [0, 1, 2, 3, 4, 5]).includes(i)
              return (
                <button key={d} onClick={() => prof({ studyDays: on ? (p.studyDays ?? [0, 1, 2, 3, 4, 5]).filter((x) => x !== i) : [...(p.studyDays ?? []), i].sort() })} className={`rounded-xl py-2 text-[12.5px] font-semibold ${on ? 'bg-pine text-cream' : 'bg-cream text-moss'}`}>
                  {d.slice(0, 3)}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Seg value={String(p.minutesPerDay ?? 60)} options={['30', '45', '60', '90', '120'].map((m) => [m, `${m}m`])} onChange={(v) => prof({ minutesPerDay: Number(v) })} />
            <label className="flex items-center gap-2 text-[13px] text-moss">
              Start at
              <input type="time" value={p.studyTime ?? '18:00'} onChange={(e) => prof({ studyTime: e.target.value })} className="rounded-lg border border-line bg-card px-2 py-1.5 text-[14px] text-pine" />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-moss">
              SAT date
              <input type="date" value={p.testDate ?? ''} onChange={(e) => prof({ testDate: e.target.value || null })} className="rounded-lg border border-line bg-card px-2 py-1.5 text-[14px] text-pine" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setStore((st) => ({ ...st, plan: generatePlan(st.profile, st.weakSkills) }))
                flash()
              }}
              className="btn btn-ghost h-10 px-4 text-[13px]"
            >
              <RotateCcw className="size-4" /> Rebuild plan from this schedule
            </button>
            <button onClick={() => downloadIcs(s.plan ?? generatePlan(p, s.weakSkills), p)} className="btn btn-dark h-10 px-4 text-[13px]">
              <Download className="size-4" /> Add plan to Google Calendar (.ics)
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-moss">In Google Calendar: Settings → Import & export → Import the file. Works with Apple Calendar and Outlook too. No access to your Google account is needed.</p>
        </Section>

        <Section icon={Plug} title="Integrations" sub="Connect services that work with your Humo AI study plan">
          <ul className="divide-y divide-line">
            {[
              ['Google Calendar', 'Weekly study events with reminders, until test day', 'calendar', '#1a73e8'],
              ['Desmos', 'Live graphing calculator in lessons, practice and Desmos Lab', 'desmos', '#2d70b3'],
              ['Google sign-in', user?.provider === 'google' ? `Connected as ${user?.email}` : 'Not used — you signed in with email', 'google', '#ea4335'],
            ].map(([n, d, k, c]) => (
              <li key={k} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-xl text-[15px] font-bold text-white" style={{ background: c }}>
                  {n[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{n}</span>
                  <span className="block text-[12px] text-moss">{d}</span>
                </span>
                {k === 'calendar' ? (
                  <button onClick={() => downloadIcs(s.plan ?? generatePlan(p, s.weakSkills), p)} className="btn btn-dark h-9 px-4 text-[12.5px]">
                    Add plan
                  </button>
                ) : (
                  <span className="rounded-full bg-jg-50 px-2.5 py-1 text-[11.5px] font-semibold text-jg-700">{k === 'google' && user?.provider !== 'google' ? 'Off' : 'Connected'}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
            </>
          )}
          {tab === 'data' && <>        <Section icon={Sigma} title="Your data" sub="Progress is saved on this device. Take it with you.">
          <div className="flex flex-wrap gap-2">
            <button onClick={exportData} className="btn btn-ghost h-10 px-4 text-[13px]">
              <Download className="size-4" /> Export progress
            </button>
            <button onClick={() => file.current?.click()} className="btn btn-ghost h-10 px-4 text-[13px]">
              <Upload className="size-4" /> Import progress
            </button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            <button
              onClick={() => {
                setStore((st) => ({ ...st, chats: [] }))
                flash()
              }}
              className="btn btn-ghost h-10 px-4 text-[13px]"
            >
              Clear chat history ({s.chats.length})
            </button>
          </div>
          <p className="mt-3 text-[12px] text-moss">
            {s.attempts.length} tests · {s.drills.length} drills · {Object.keys(s.vocab).length} words studied · {s.chats.length} Humo chats
          </p>
        </Section>

</>}
        </div>
      </div>
    </div>
  )
}
