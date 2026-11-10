import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Crown, Link2, Loader2, Share2, Trophy, Users, X } from 'lucide-react'
import { GoldSwords } from '../icons'
import { Confetti } from '../../components/motion'
import { useAuth } from '../../lib/auth'
import { useStore } from '../store'
import { markLimit, noteUse, openUpgrade, useAccount } from '../account'
import { Passage } from './TakeTest'

type Lang = 'en' | 'ru' | 'uz'
const T: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Duels', sub: 'Challenge a friend or a student online. Same SAT questions, same clock, fastest correct answers win.',
    find: 'Find an opponent', findSub: 'Match with a student who is online now', invite: 'Invite a friend', inviteSub: 'Share a link or a code',
    haveCode: 'Have a code?', join: 'Join', codePh: 'Enter code', left: 'free duels left today', none: 'Your free duels for today are used. Go Pro or come back tomorrow.', pro: 'Unlimited duels with Pro',
    how: 'How it works', how1: '7 questions, the same for both', how2: '45 seconds each', how3: 'Correct = 100 points + up to 50 for speed',
    searching: 'Looking for an opponent…', searchingSub: 'Stay on this screen. We stop looking after 45 seconds.', online: 'searching now', cancel: 'Cancel',
    timeout: 'No opponent is online right now', timeoutSub: 'Try again in a minute, or invite a friend with a link.', again: 'Try again',
    waiting: 'Waiting for your friend…', share: 'Send this link or code to a friend', copy: 'Copy link', copied: 'Copied', shareBtn: 'Share', code: 'Code', cancelInvite: 'Cancel invite',
    ready: 'Duel starts in', vs: 'vs', round: 'Question', you: 'You', them: 'Opponent', answered: 'answered', thinking: 'thinking…', waitOpp: 'Waiting for your opponent…',
    correct: 'Correct', wrong: 'Wrong', timeUp: "Time's up", next: 'Next question in a moment',
    win: 'You won!', loss: 'You lost', draw: "It's a draw", leftWin: 'Your opponent left the duel, so you win.', leftLoss: 'You left the duel.', score: 'points', right: 'correct',
    rematch: 'Back to Duels', board: "This week's top duelists", wins: 'wins', noBoard: 'No wins yet this week. Be the first.', hist: 'Your record', w: 'W', l: 'L', d: 'D', recent: 'Recent duels',
    lost: 'This duel is over or could not be found.', err: 'Something went wrong. Check your connection and try again.', conn: 'Reconnecting…', question: 'Question', review: 'Review',
    expired: 'That invite is no longer open.',
  },
  ru: {
    title: 'Дуэли', sub: 'Бросьте вызов другу или студенту онлайн. Одни и те же вопросы SAT, одно время, побеждает самый быстрый верный ответ.',
    find: 'Найти соперника', findSub: 'Соперник, который сейчас онлайн', invite: 'Пригласить друга', inviteSub: 'Отправьте ссылку или код',
    haveCode: 'Есть код?', join: 'Войти', codePh: 'Введите код', left: 'бесплатных дуэлей сегодня', none: 'Бесплатные дуэли на сегодня закончились. Подключите Pro или вернитесь завтра.', pro: 'Безлимитные дуэли с Pro',
    how: 'Как это работает', how1: '7 одинаковых вопросов для обоих', how2: 'по 45 секунд на вопрос', how3: 'Верно = 100 очков + до 50 за скорость',
    searching: 'Ищем соперника…', searchingSub: 'Оставайтесь на этом экране. Поиск длится 45 секунд.', online: 'ищут сейчас', cancel: 'Отмена',
    timeout: 'Сейчас нет соперников онлайн', timeoutSub: 'Попробуйте через минуту или пригласите друга по ссылке.', again: 'Повторить',
    waiting: 'Ждём вашего друга…', share: 'Отправьте другу ссылку или код', copy: 'Копировать ссылку', copied: 'Скопировано', shareBtn: 'Поделиться', code: 'Код', cancelInvite: 'Отменить приглашение',
    ready: 'Дуэль начнётся через', vs: 'против', round: 'Вопрос', you: 'Вы', them: 'Соперник', answered: 'ответил', thinking: 'думает…', waitOpp: 'Ждём соперника…',
    correct: 'Верно', wrong: 'Неверно', timeUp: 'Время вышло', next: 'Следующий вопрос сейчас',
    win: 'Вы победили!', loss: 'Вы проиграли', draw: 'Ничья', leftWin: 'Соперник вышел из дуэли, вы победили.', leftLoss: 'Вы вышли из дуэли.', score: 'очков', right: 'верно',
    rematch: 'К дуэлям', board: 'Лучшие дуэлянты недели', wins: 'побед', noBoard: 'На этой неделе побед ещё нет. Будьте первым.', hist: 'Ваш рекорд', w: 'П', l: 'Пр', d: 'Н', recent: 'Недавние дуэли',
    lost: 'Эта дуэль закончилась или не найдена.', err: 'Что-то пошло не так. Проверьте интернет и попробуйте снова.', conn: 'Переподключение…', question: 'Вопрос', review: 'Разбор',
    expired: 'Это приглашение больше не действует.',
  },
  uz: {
    title: 'Duellar', sub: "Do'stingiz yoki onlayn talaba bilan bellashing. Bir xil SAT savollari, bir xil vaqt, eng tez to'g'ri javob yutadi.",
    find: 'Raqib topish', findSub: 'Hozir onlayn bo‘lgan talaba bilan', invite: "Do'stni taklif qilish", inviteSub: 'Havola yoki kodni yuboring',
    haveCode: 'Kod bormi?', join: 'Qo‘shilish', codePh: 'Kodni kiriting', left: 'ta bepul duel qoldi', none: 'Bugungi bepul duellar tugadi. Pro oling yoki ertaga qayting.', pro: 'Pro bilan cheksiz duellar',
    how: 'Qanday ishlaydi', how1: 'Ikkalangiz uchun bir xil 7 ta savol', how2: 'Har biriga 45 soniya', how3: "To'g'ri = 100 ball + tezlik uchun 50 gacha",
    searching: 'Raqib qidirilmoqda…', searchingSub: 'Shu ekranda qoling. Qidiruv 45 soniya davom etadi.', online: 'hozir qidirmoqda', cancel: 'Bekor qilish',
    timeout: 'Hozir onlayn raqib yo‘q', timeoutSub: "Bir daqiqadan keyin urinib ko'ring yoki do'stingizni havola orqali taklif qiling.", again: 'Qayta urinish',
    waiting: "Do'stingiz kutilmoqda…", share: "Do'stingizga bu havola yoki kodni yuboring", copy: 'Havolani nusxalash', copied: 'Nusxalandi', shareBtn: 'Ulashish', code: 'Kod', cancelInvite: 'Taklifni bekor qilish',
    ready: 'Duel boshlanishiga', vs: 'qarshi', round: 'Savol', you: 'Siz', them: 'Raqib', answered: 'javob berdi', thinking: "o'ylamoqda…", waitOpp: 'Raqib kutilmoqda…',
    correct: "To'g'ri", wrong: "Noto'g'ri", timeUp: 'Vaqt tugadi', next: 'Keyingi savol hozir',
    win: 'Siz yutdingiz!', loss: 'Siz yutqazdingiz', draw: 'Durang', leftWin: 'Raqibingiz duelni tark etdi, siz yutdingiz.', leftLoss: 'Siz duelni tark etdingiz.', score: 'ball', right: "to'g'ri",
    rematch: 'Duellarga qaytish', board: 'Hafta eng yaxshi duelchilari', wins: 'g‘alaba', noBoard: "Bu hafta hali g'alaba yo'q. Birinchi bo'ling.", hist: 'Sizning natijangiz', w: 'G', l: 'M', d: 'D', recent: 'So‘nggi duellar',
    lost: 'Bu duel tugagan yoki topilmadi.', err: "Xatolik yuz berdi. Internetni tekshirib, qayta urinib ko'ring.", conn: 'Qayta ulanmoqda…', question: 'Savol', review: 'Tahlil',
    expired: 'Bu taklif endi amal qilmaydi.',
  },
}

type Person = { id: string; name: string; picture: string | null }
type Round = { id: string; section: string; skill: string; passage: string | null; question: string; options: string[]; correct?: number; mine: { choice: number | null; ok?: boolean; pts?: number } | null; theirsAnswered: boolean; theirs: { choice: number | null; ok: boolean; pts: number } | null }
type Duel = {
  id: string; kind: 'invite' | 'queue'; code: string | null; status: 'waiting' | 'live' | 'done'; now: number; roundStart: number; closedAt: number; round: number; rounds: Round[]; total: number; answerMs: number; revealMs: number
  me: Person | null; opp: Person | null; scores: Record<string, number>; result: null | { winner: string | null; reason: string; scores: Record<string, number>; correct: Record<string, number> }
}
type Row = { id: string; name: string; picture: string | null; wins: number; played: number }
type Hist = { wins: number; losses: number; draws: number; recent: { at: number; res: 'win' | 'loss' | 'draw'; opp: string; you: number; them: number }[] }

function Face({ p, size = 'size-12' }: { p: Person | null; size?: string }) {
  return p?.picture ? (
    <img src={p.picture} alt="" referrerPolicy="no-referrer" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} grid place-items-center rounded-full bg-white/15 text-[16px] font-semibold`}>{(p?.name || '?')[0]?.toUpperCase()}</span>
  )
}

export default function Duels() {
  const s = useStore()
  const t = T[(s.settings.language as Lang) in T ? (s.settings.language as Lang) : 'en']
  const { token } = useAuth()
  const acc = useAccount()
  const [params, setParams] = useSearchParams()
  const duelId = params.get('d')
  const [mode, setMode] = useState<'lobby' | 'searching' | 'timeout' | 'invite' | 'duel'>(duelId ? 'duel' : 'lobby')
  const [duel, setDuel] = useState<Duel | null>(null)
  const [offset, setOffset] = useState(0)
  const [tick, setTick] = useState(0)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [searchInfo, setSearchInfo] = useState<{ searching: number; waited: number }>({ searching: 0, waited: 0 })
  const [pending, setPending] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [board, setBoard] = useState<Row[] | null>(null)
  const [hist, setHist] = useState<Hist | null>(null)
  const [offline, setOffline] = useState(false)
  const joined = useRef(false)

  const api = useCallback(
    async (path: string, method = 'GET', body?: unknown) => {
      const r = await fetch(`/api/duels${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined })
      const data = await r.json().catch(() => ({}))
      return { r, data }
    },
    [token],
  )
  const left = acc.left('duel')
  const limited = !acc.pro && acc.loaded && left <= 0

  const loadLobby = useCallback(() => {
    fetch('/api/duels/board').then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => setBoard(d.rows)).catch(() => setBoard(null))
    api('/history').then(({ r, data }) => r.ok && setHist(data)).catch(() => {})
  }, [api])
  useEffect(() => {
    if (mode === 'lobby') loadLobby()
  }, [mode, loadLobby])

  const goDuel = (id: string) => {
    setPending(null)
    setDuel(null)
    setParams({ d: id }, { replace: true })
    setMode('duel')
  }
  const toLobby = (note = '') => {
    setDuel(null)
    setPending(null)
    setMsg(note)
    setParams({}, { replace: true })
    setMode('lobby')
  }

  /** Free students have a daily duel cap: the server counts it; this opens the Pro pop-up when it is used. */
  function limitHit(r: Response, data: any) {
    if (r.status !== 402) return false
    markLimit('duel')
    openUpgrade()
    setMsg(data.error || t.none)
    return true
  }

  async function findOpponent() {
    if (limited) return openUpgrade()
    setBusy(true)
    setMsg('')
    try {
      const { r, data } = await api('/queue', 'POST')
      if (limitHit(r, data)) return
      if (!r.ok) return setMsg(data.error || t.err)
      if (!acc.pro) noteUse('duel')
      if (data.status === 'matched') return goDuel(data.id)
      setSearchInfo({ searching: 1, waited: 0 })
      setMode('searching')
    } catch {
      setMsg(t.err)
    } finally {
      setBusy(false)
    }
  }

  async function createInvite() {
    if (limited) return openUpgrade()
    setBusy(true)
    setMsg('')
    try {
      const { r, data } = await api('/invite', 'POST')
      if (limitHit(r, data)) return
      if (!r.ok) return setMsg(data.error || t.err)
      if (!acc.pro) noteUse('duel')
      setParams({ d: data.id }, { replace: true })
      setMode('duel')
    } catch {
      setMsg(t.err)
    } finally {
      setBusy(false)
    }
  }

  async function joinCode(c: string) {
    const clean = c.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!clean) return
    if (limited) return openUpgrade()
    setBusy(true)
    setMsg('')
    try {
      const { r, data } = await api('/join', 'POST', { code: clean })
      if (limitHit(r, data)) return
      if (!r.ok) return setMsg(data.error || t.err)
      if (!acc.pro) noteUse('duel')
      goDuel(data.id)
    } catch {
      setMsg(t.err)
    } finally {
      setBusy(false)
    }
  }

  // an invite link (/app/duels?join=CODE) joins straight away
  useEffect(() => {
    const j = params.get('join')
    if (j && !joined.current && token) {
      joined.current = true
      setParams({}, { replace: true })
      joinCode(j)
    }
  }, [token])

  // searching: poll the queue
  useEffect(() => {
    if (mode !== 'searching') return
    let stop = false
    const run = async () => {
      try {
        const { data } = await api('/queue')
        if (stop) return
        if (data.status === 'matched') return goDuel(data.id)
        if (data.status === 'timeout') return setMode('timeout')
        if (data.status === 'none') return setMode('timeout')
        setSearchInfo({ searching: data.searching || 1, waited: data.waitedMs || 0 })
      } catch {
        /* keep trying */
      }
    }
    const iv = setInterval(run, 1500)
    return () => {
      stop = true
      clearInterval(iv)
    }
  }, [mode])

  // a duel (waiting for a friend, countdown, live, result): poll the server every second
  useEffect(() => {
    if (mode !== 'duel' || !duelId) return
    let stop = false
    const run = async () => {
      try {
        const { r, data } = await api(`/${duelId}`)
        if (stop) return
        if (r.status === 404) return toLobby(t.lost)
        if (r.ok) {
          setOffline(false)
          setOffset((data as Duel).now - Date.now())
          setDuel(data as Duel)
        }
      } catch {
        if (!stop) setOffline(true)
      }
    }
    run()
    const iv = setInterval(run, 1000)
    return () => {
      stop = true
      clearInterval(iv)
    }
  }, [mode, duelId])

  // a quick clock for the countdown and the answer timer
  useEffect(() => {
    if (mode !== 'duel') return
    const iv = setInterval(() => setTick((x) => x + 1), 250)
    return () => clearInterval(iv)
  }, [mode])

  // a new question clears the local pick
  useEffect(() => setPending(null), [duel?.round])

  async function answer(choice: number) {
    if (!duel || pending != null || duel.rounds[duel.round]?.mine) return
    setPending(choice)
    try {
      const { r, data } = await api(`/${duel.id}/answer`, 'POST', { round: duel.round, choice })
      if (r.ok) {
        setOffset((data as Duel).now - Date.now())
        setDuel(data as Duel)
      }
    } catch {
      setOffline(true)
    }
  }

  const link = duel?.code ? `${location.origin}/app/duels?join=${duel.code}` : ''
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked */
    }
  }
  async function shareLink() {
    const text = `${t.title}: ${duel?.code}`
    if (navigator.share) navigator.share({ title: 'Humo AI Duels', text, url: link }).catch(() => {})
    else copy()
  }
  async function leave() {
    if (duel) await api(`/${duel.id}`, 'DELETE').catch(() => {})
    toLobby()
  }
  async function cancelSearch() {
    await api('/queue', 'DELETE').catch(() => {})
    toLobby()
  }

  /* ---------- lobby ---------- */
  if (mode === 'lobby')
    return (
      <div className="mx-auto max-w-2xl">
        <div className="relative overflow-hidden rounded-[28px] bg-pine p-6 text-center text-cream sm:p-10">
          <div className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-orange-500/25 blur-3xl" />
          <img src="/brand/humo-mark.svg" alt="" className="relative mx-auto size-14 rounded-2xl" />
          <h1 className="display relative mt-4 flex items-center justify-center gap-3 text-[40px] sm:text-[44px]">
            <GoldSwords className="size-9" /> {t.title}
          </h1>
          <p className="relative mx-auto mt-2 max-w-md text-[14.5px] text-cream/65">{t.sub}</p>
          <div className="relative mt-7 grid gap-3 sm:grid-cols-2">
            <button disabled={busy} onClick={findOpponent} className="btn h-auto flex-col gap-0.5 bg-orange-500 px-5 py-4 text-white hover:bg-orange-400 disabled:opacity-50">
              <span className="flex items-center gap-2 text-[15px] font-semibold">
                <Users className="size-5" /> {limited ? t.pro : t.find}
              </span>
              <span className="text-[12px] font-normal text-white/80">{t.findSub}</span>
            </button>
            <button disabled={busy} onClick={createInvite} className="btn h-auto flex-col gap-0.5 bg-white/10 px-5 py-4 text-cream hover:bg-white/15 disabled:opacity-50">
              <span className="flex items-center gap-2 text-[15px] font-semibold">
                <Link2 className="size-5" /> {t.invite}
              </span>
              <span className="text-[12px] font-normal text-cream/60">{t.inviteSub}</span>
            </button>
          </div>
          <form
            className="relative mx-auto mt-4 flex max-w-sm items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              joinCode(code)
            }}
          >
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} placeholder={`${t.haveCode} ${t.codePh}`} aria-label={t.codePh} className="h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-center text-[14px] uppercase tracking-widest text-cream placeholder:normal-case placeholder:tracking-normal placeholder:text-cream/45 focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <button disabled={busy || !code.trim()} className="btn h-11 bg-cream px-5 text-[14px] text-pine disabled:opacity-40">
              {t.join}
            </button>
          </form>
          {acc.loaded && !acc.pro && <p className="relative mt-4 text-[12.5px] text-cream/60">{left > 0 ? `${left} ${t.left}` : t.none}</p>}
          {msg && <p className="relative mt-3 text-[13px] text-orange-300">{msg}</p>}
          <div className="relative mt-6 grid gap-2 text-left text-[12.5px] text-cream/70 sm:grid-cols-3">
            {[t.how1, t.how2, t.how3].map((x) => (
              <p key={x} className="rounded-2xl bg-white/[0.06] p-3">
                {x}
              </p>
            ))}
          </div>
        </div>

        {hist && hist.wins + hist.losses + hist.draws > 0 && (
          <div className="card mt-4 p-5">
            <p className="text-[14px] font-semibold">{t.hist}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                [hist.wins, t.w, 'text-emerald-600'],
                [hist.losses, t.l, 'text-red-500'],
                [hist.draws, t.d, 'text-moss'],
              ].map(([n, l, c]) => (
                <div key={l as string} className="rounded-2xl bg-cream p-3">
                  <p className={`font-serif text-[26px] tabular-nums ${c}`}>{n as number}</p>
                  <p className="text-[12px] text-moss">{l as string}</p>
                </div>
              ))}
            </div>
            {hist.recent.length > 0 && (
              <>
                <p className="mt-4 text-[12.5px] font-semibold text-moss">{t.recent}</p>
                <ul className="mt-1 divide-y divide-line">
                  {hist.recent.slice(0, 5).map((h, i) => (
                    <li key={i} className="flex items-center gap-3 py-2 text-[13.5px]">
                      <span className={`w-5 text-center font-bold ${h.res === 'win' ? 'text-emerald-600' : h.res === 'loss' ? 'text-red-500' : 'text-moss'}`}>{h.res === 'win' ? t.w : h.res === 'loss' ? t.l : t.d}</span>
                      <span className="flex-1 truncate">{h.opp}</span>
                      <span className="tabular-nums text-moss">
                        {h.you} : {h.them}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="card mt-4 p-5">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <Trophy className="size-4 text-orange-500" /> {t.board}
          </p>
          {!board || board.length === 0 ? (
            <p className="mt-3 text-[13px] text-moss">{t.noBoard}</p>
          ) : (
            <ol className="mt-3 divide-y divide-line">
              {board.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-[14px]">
                  <span className={`w-6 text-center tabular-nums ${i < 3 ? 'text-orange-500' : 'text-moss'}`}>{i + 1}</span>
                  {r.picture ? <img src={r.picture} alt="" referrerPolicy="no-referrer" className="size-7 rounded-full" /> : <span className="grid size-7 place-items-center rounded-full bg-cream text-[12px] font-semibold">{r.name[0]}</span>}
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="font-serif text-[18px] tabular-nums">{r.wins}</span>
                  <span className="text-[12px] text-moss">{t.wins}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    )

  /* ---------- searching / no opponent ---------- */
  if (mode === 'searching' || mode === 'timeout')
    return (
      <div className="mx-auto max-w-md">
        <div className="relative overflow-hidden rounded-[28px] bg-pine p-8 text-center text-cream">
          <div className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 rounded-full bg-orange-500/25 blur-3xl" />
          <img src="/brand/humo-mark.svg" alt="" className={`relative mx-auto size-16 rounded-2xl ${mode === 'searching' ? 'animate-pulse' : ''}`} />
          <h1 className="display relative mt-5 text-[28px]">{mode === 'searching' ? t.searching : t.timeout}</h1>
          <p className="relative mt-2 text-[14px] text-cream/65">{mode === 'searching' ? t.searchingSub : t.timeoutSub}</p>
          {mode === 'searching' ? (
            <>
              <div className="relative mx-auto mt-6 h-2 max-w-[240px] overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-orange-500 transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (searchInfo.waited / 45000) * 100)}%` }} />
              </div>
              <p className="relative mt-3 text-[12.5px] text-cream/55">
                {searchInfo.searching} {t.online}
              </p>
              <button onClick={cancelSearch} className="btn relative mt-6 h-11 bg-white/10 px-6 text-cream hover:bg-white/15">
                {t.cancel}
              </button>
            </>
          ) : (
            <div className="relative mt-6 flex flex-col gap-2">
              <button onClick={findOpponent} disabled={busy} className="btn h-11 bg-orange-500 px-6 text-white hover:bg-orange-400">
                {t.again}
              </button>
              <button onClick={createInvite} disabled={busy} className="btn h-11 bg-white/10 px-6 text-cream hover:bg-white/15">
                {t.invite}
              </button>
              <button onClick={() => toLobby()} className="mt-1 text-[13px] text-cream/60 underline">
                {t.rematch}
              </button>
            </div>
          )}
        </div>
      </div>
    )

  /* ---------- duel ---------- */
  if (!duel)
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-7 animate-spin text-moss" />
      </div>
    )

  const clock = Date.now() + offset + tick * 0
  const me = duel.me
  const opp = duel.opp

  if (duel.status === 'waiting')
    return (
      <div className="mx-auto max-w-md">
        <div className="relative overflow-hidden rounded-[28px] bg-pine p-7 text-center text-cream">
          <div className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 rounded-full bg-orange-500/25 blur-3xl" />
          <img src="/brand/humo-mark.svg" alt="" className="relative mx-auto size-14 animate-pulse rounded-2xl" />
          <h1 className="display relative mt-4 text-[26px]">{t.waiting}</h1>
          <p className="relative mt-1 text-[13.5px] text-cream/65">{t.share}</p>
          <div className="relative mt-5 rounded-2xl bg-white/10 p-4">
            <p className="text-[12px] uppercase tracking-widest text-cream/50">{t.code}</p>
            <p className="mt-1 font-mono text-[34px] font-bold tracking-[0.25em]">{duel.code}</p>
          </div>
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <button onClick={copy} className="btn h-11 bg-white/10 text-cream hover:bg-white/15">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t.copied : t.copy}
            </button>
            <button onClick={shareLink} className="btn h-11 bg-orange-500 text-white hover:bg-orange-400">
              <Share2 className="size-4" /> {t.shareBtn}
            </button>
          </div>
          <button onClick={leave} className="relative mt-5 text-[13px] text-cream/60 underline">
            {t.cancelInvite}
          </button>
        </div>
      </div>
    )

  const r = duel.rounds[duel.round]
  const countdown = duel.status === 'live' && duel.round === 0 && clock < duel.roundStart

  if (duel.status === 'live' && countdown)
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-[28px] bg-pine p-8 text-center text-cream">
          <div className="flex items-center justify-center gap-5">
            <div className="text-center">
              <Face p={me} size="size-16" />
              <p className="mt-2 max-w-[110px] truncate text-[13px]">{me?.name}</p>
            </div>
            <GoldSwords className="size-8" />
            <div className="text-center">
              <Face p={opp} size="size-16" />
              <p className="mt-2 max-w-[110px] truncate text-[13px]">{opp?.name}</p>
            </div>
          </div>
          <p className="mt-6 text-[13px] text-cream/60">{t.ready}</p>
          <motion.p key={Math.ceil((duel.roundStart - clock) / 1000)} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="display mt-1 text-[72px] leading-none text-orange-400">
            {Math.max(1, Math.ceil((duel.roundStart - clock) / 1000))}
          </motion.p>
        </div>
      </div>
    )

  if (duel.status === 'live' && r) {
    const revealed = r.correct != null
    const total = duel.answerMs / 1000
    const secs = revealed ? 0 : Math.max(0, Math.min(total, Math.ceil((duel.roundStart + duel.answerMs - clock) / 1000)))
    const mineChoice = r.mine?.choice ?? pending
    const answeredByMe = r.mine != null || pending != null
    return (
      <div className="mx-auto max-w-3xl">
        {offline && <p className="mb-2 rounded-xl bg-amber-100 px-3 py-2 text-center text-[12.5px] text-amber-900">{t.conn}</p>}
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-pine p-3 text-cream">
          <div className="flex min-w-0 items-center gap-2">
            <Face p={me} size="size-9" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[12.5px] text-cream/70">{t.you}</p>
              <p className="font-serif text-[22px] tabular-nums">{duel.scores[me?.id ?? ''] ?? 0}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-cream/50">
              {t.round} {duel.round + 1}/{duel.total}
            </p>
            <p className={`font-serif text-[26px] tabular-nums ${secs <= 10 && !revealed ? 'text-red-400' : 'text-cream'}`}>{revealed ? '·' : secs}</p>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2">
            <div className="min-w-0 text-right leading-tight">
              <p className="truncate text-[12.5px] text-cream/70">{opp?.name}</p>
              <p className="font-serif text-[22px] tabular-nums">{duel.scores[opp?.id ?? ''] ?? 0}</p>
            </div>
            <Face p={opp} size="size-9" />
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft">
          <div className={`h-full rounded-full transition-[width] duration-300 ease-linear ${secs <= 10 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${revealed ? 0 : (secs / total) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={duel.round} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="card mt-4 p-5 sm:p-7">
            {r.passage && (
              <div className="mb-5 rounded-2xl bg-cream p-4">
                <Passage html={r.passage} />
              </div>
            )}
            <p className="whitespace-pre-wrap text-[16px] font-medium">{r.question}</p>
            <div className="mt-5 grid gap-2">
              {r.options.map((o, k) => {
                const right = revealed && r.correct === k
                const wrong = revealed && mineChoice === k && r.correct !== k
                const mineSel = mineChoice === k
                return (
                  <button key={k} disabled={answeredByMe || revealed} onClick={() => answer(k)} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[14.5px] ${right ? 'border-emerald-500 bg-emerald-50' : wrong ? 'border-red-400 bg-red-50' : mineSel ? 'border-orange-500 bg-orange-50' : 'border-line hover:border-line-strong'}`}>
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-pine/30 text-[11px] font-bold">{'ABCD'[k]}</span>
                    <span className="prose-q flex-1" dangerouslySetInnerHTML={{ __html: o }} />
                    {right && <Check className="size-5 text-emerald-600" />}
                    {wrong && <X className="size-5 text-red-500" />}
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-center text-[13px] text-moss">
              {revealed ? (
                <>
                  {r.mine?.choice == null ? t.timeUp : r.mine.ok ? `${t.correct} +${r.mine.pts}` : t.wrong}
                  {' · '}
                  {opp?.name}: {r.theirs == null || r.theirs.choice == null ? t.timeUp : r.theirs.ok ? `${t.correct} +${r.theirs.pts}` : t.wrong}
                </>
              ) : answeredByMe ? (
                r.theirsAnswered ? t.next : t.waitOpp
              ) : r.theirsAnswered ? (
                `${opp?.name} ${t.answered}`
              ) : (
                ''
              )}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  /* ---------- result ---------- */
  const res = duel.result
  const mine = duel.me?.id ?? ''
  const theirId = duel.opp?.id ?? ''
  const outcome = !res || res.winner == null ? 'draw' : res.winner === mine ? 'win' : 'loss'
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-[28px] bg-pine p-6 text-center text-cream sm:p-9">
        <div className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-orange-500/25 blur-3xl" />
        <Confetti fire={outcome === 'win'} />
        {outcome === 'win' ? <Crown className="relative mx-auto size-10 text-amber-300" /> : <GoldSwords className="relative mx-auto size-10" />}
        <h1 className="display relative mt-3 text-[38px]">{outcome === 'win' ? t.win : outcome === 'loss' ? t.loss : t.draw}</h1>
        {res?.reason === 'left' && <p className="relative mt-1 text-[13.5px] text-cream/65">{outcome === 'win' ? t.leftWin : t.leftLoss}</p>}
        <div className="relative mt-6 grid grid-cols-2 gap-3">
          {[
            [duel.me, mine],
            [duel.opp, theirId],
          ].map(([p, id], i) => (
            <div key={i} className={`rounded-2xl p-4 ${res?.winner === id ? 'bg-orange-500/25 ring-2 ring-orange-400' : 'bg-white/[0.07]'}`}>
              <div className="flex justify-center">
                <Face p={p as Person | null} size="size-12" />
              </div>
              <p className="mt-2 truncate text-[13.5px]">{(p as Person | null)?.name}</p>
              <p className="font-serif text-[34px] tabular-nums">{res?.scores[id as string] ?? 0}</p>
              <p className="text-[12px] text-cream/55">
                {t.score} · {res?.correct[id as string] ?? 0}/{duel.total} {t.right}
              </p>
            </div>
          ))}
        </div>
        <button onClick={() => toLobby()} className="btn relative mt-7 h-12 bg-orange-500 px-8 text-[15px] text-white hover:bg-orange-400">
          {t.rematch}
        </button>
      </div>

      <div className="card mt-4 p-5">
        <p className="text-[14px] font-semibold">{t.review}</p>
        <ol className="mt-3 divide-y divide-line">
          {duel.rounds.map((q, i) => (
            <li key={q.id + i} className="py-3 text-[13.5px]">
              <p className="text-moss">
                {t.question} {i + 1} · {q.skill}
              </p>
              <p className="mt-1 line-clamp-2">{q.question}</p>
              <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                <span className={q.mine?.ok ? 'text-emerald-600' : 'text-red-500'}>
                  {t.you}: {q.mine?.choice == null ? '—' : 'ABCD'[q.mine.choice]} {q.mine?.ok ? '✓' : '✗'}
                </span>
                <span className={q.theirs?.ok ? 'text-emerald-600' : 'text-red-500'}>
                  {duel.opp?.name}: {q.theirs?.choice == null ? '—' : 'ABCD'[q.theirs.choice]} {q.theirs?.ok ? '✓' : '✗'}
                </span>
                {q.correct != null && <span className="text-moss">{'ABCD'[q.correct]}</span>}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
