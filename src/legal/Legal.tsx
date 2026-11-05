import { Link } from 'react-router-dom'
import { Logo } from '../landing/Landing'

const UPDATED = 'October 17, 2026'

type Section = { h: string; p: string[] }

const PRIVACY: Section[] = [
  {
    h: 'Who we are',
    p: [
      'Humo AI is an online exam-preparation platform based in Tashkent, Uzbekistan ("we", "us"). This policy explains what information we collect when you use Humo AI and how we use it.',
    ],
  },
  {
    h: 'What we collect',
    p: [
      'Account information: when you sign in with Google we receive your name, email address and profile photo from Google. We do not receive your Google password and we do not access your Gmail, Drive, contacts or any other Google data. If you sign up with email, we store your name, email and a securely hashed version of your password.',
      'Learning data: your answers, scores, mock test results, study plan, target score and test date.',
      'Messages to Humo: the questions and essays you send to Humo, our AI tutor.',
      'Technical data: basic logs such as IP address, browser type and error reports, used to keep the service secure and working.',
    ],
  },
  {
    h: 'How we use it',
    p: [
      'To create and secure your account, save your progress, build your study plan, score your practice and mock tests, and let Humo answer your questions.',
      'For Humo AI students who join with an academy code, your teacher can see your progress and scores.',
      'To improve our questions and features using aggregated, non-identifying statistics.',
      'We do not sell your personal information and we do not use it for third-party advertising.',
    ],
  },
  {
    h: 'AI processing',
    p: [
      "Messages you send to Humo are processed by AI providers to generate a reply: Google Gemini first, and Groq or OpenRouter as backups when Gemini is busy. Your email address is not sent with your messages. Don't include sensitive personal information (such as passport numbers or health details) in messages to Humo.",
    ],
  },
  {
    h: 'Sharing',
    p: [
      'We share information only with service providers who help us run Humo AI (hosting, Google sign-in, and the AI providers Google Gemini, Groq and OpenRouter), with your teacher if you joined through Humo AI, or when required by law.',
    ],
  },
  {
    h: 'Storage and retention',
    p: [
      'We keep your information while your account is active. You can ask us to delete your account and data at any time, and we will do so within 30 days, except where the law requires us to keep certain records.',
    ],
  },
  {
    h: 'Your choices',
    p: [
      'You can view and update your profile in the app, ask us for a copy of your data, or ask us to delete it. You can also remove Humo AI\'s access to your Google account at myaccount.google.com → Security → Third-party connections.',
    ],
  },
  {
    h: 'Children',
    p: [
      'Humo AI is intended for students aged 13 and older. If you are under 18, please use Humo AI with the knowledge of a parent or guardian.',
    ],
  },
  {
    h: 'Changes and contact',
    p: [
      `We will post any changes to this policy on this page and update the date above. Questions or requests: contact the Humo AI team.`,
    ],
  },
]

const TERMS: Section[] = [
  {
    h: 'Using Humo AI',
    p: [
      'By creating an account or using Humo AI you agree to these terms. If you do not agree, please do not use the service.',
      'You are responsible for keeping your account secure and for activity under your account. One account is for one student.',
    ],
  },
  {
    h: 'Our content',
    p: [
      'Questions, explanations, mock tests and other materials on Humo AI are owned by Humo AI. You may use them for your own preparation. You may not copy, resell, publish or share them in bulk, or use automated tools to download them.',
    ],
  },
  {
    h: 'Humo and AI answers',
    p: [
      'Humo is an AI tutor and can make mistakes. Check important information, and use official materials as well when preparing for your exam.',
      'Do not use Humo to cheat on real exams or graded assignments, or to generate harmful content.',
    ],
  },
  {
    h: 'Scores and results',
    p: [
      'Score estimates are for practice only. They are not official SAT scores, and we do not guarantee any particular result on a real exam or in university admissions.',
    ],
  },
  {
    h: 'Plans and payments',
    p: [
      'Free features may change over time. Paid plans are billed monthly and you can cancel at any time; you keep access until the end of the period you paid for. Humo AI students receive access as part of their course.',
    ],
  },
  {
    h: 'Ending access',
    p: [
      'You can stop using Humo AI and ask us to delete your account at any time. We may suspend accounts that break these terms, for example by sharing paid content or abusing the service.',
    ],
  },
  {
    h: 'Trademarks',
    p: [
      'SAT® is a trademark of the College Board. The College Board is not affiliated with and does not endorse Humo AI.',
    ],
  },
  {
    h: 'Law and contact',
    p: [
      `These terms are governed by the laws of the Republic of Uzbekistan. We may update them and will post changes on this page. Contact: the Humo AI team.`,
    ],
  },
]

export default function Legal({ page }: { page: 'privacy' | 'terms' }) {
  const isPrivacy = page === 'privacy'
  const sections = isPrivacy ? PRIVACY : TERMS
  return (
    <div className="min-h-svh bg-ink text-cream">
      <header className="border-b border-white/[0.07]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <Link to={isPrivacy ? '/terms' : '/privacy'} className="text-[13px] text-cream/55 hover:text-cream">
            {isPrivacy ? 'Terms of Service' : 'Privacy Policy'}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="display text-[clamp(2.4rem,6vw,3.6rem)]">{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
        <p className="mt-4 text-[14px] text-cream/45">Last updated {UPDATED}</p>
        <div className="mt-12 space-y-10">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-serif text-[22px] tracking-tight">{s.h}</h2>
              <div className="mt-3 space-y-3">
                {s.p.map((t, i) => (
                  <p key={i} className="text-[15.5px] leading-[1.75] text-cream/65">
                    {t}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
