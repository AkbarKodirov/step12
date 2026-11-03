/**
 * Humo AI video lessons. The video files live on Cloudflare R2 (bucket "humo-lessons"),
 * at <VIDEO_BASE>/<slug>/<slug>-720p.mp4, -1080p.mp4 and -poster.jpg. They are too big for git.
 * Each lesson id here matches a lesson id in courses.ts.
 */
export const VIDEO_BASE = 'https://pub-74c3fe78d2fd419fbb39853077b9141c.r2.dev/lessons'

export type Chapter = { id: string; t: number; title: string; part: 'Intro' | 'Lesson' | 'Practice' | 'Recap' }
export type MasteryQ = { text?: string; notes?: string[]; goal?: string; question: string; choices: string[]; answer: number; why: string; chapter: string }
export type VideoLesson = { slug: string; duration: number; chapters: Chapter[]; mastery: MasteryQ[] }

export const videoSrc = (v: VideoLesson, q: '720p' | '1080p') => `${VIDEO_BASE}/${v.slug}/${v.slug}-${q}.mp4`
export const posterSrc = (v: VideoLesson) => `${VIDEO_BASE}/${v.slug}/${v.slug}-poster.jpg`

export const VIDEOS: Record<string, VideoLesson> = {
  transitions: {
    slug: 'transitions',
    duration: 1159,
    chapters: [
      { id: 'intro', t: 0, title: 'Welcome', part: 'Intro' },
      { id: 'what', t: 24, title: 'What is a transition?', part: 'Lesson' },
      { id: 'flex', t: 58, title: 'One word, three stories', part: 'Lesson' },
      { id: 'author', t: 113, title: 'You are not the author', part: 'Lesson' },
      { id: 'families', t: 158, title: 'Three families of transitions', part: 'Lesson' },
      { id: 'contra', t: 195, title: 'Contradict words: turn around', part: 'Lesson' },
      { id: 'compare', t: 271, title: 'Contradiction or comparison?', part: 'Lesson' },
      { id: 'continue', t: 308, title: 'Continue words: keep going', part: 'Lesson' },
      { id: 'cause', t: 378, title: 'Cause & effect words', part: 'Lesson' },
      { id: 'tricky', t: 428, title: 'Two tricky words', part: 'Lesson' },
      { id: 'bank', t: 477, title: 'More words from the word bank', part: 'Lesson' },
      { id: 'method', t: 548, title: 'The 4-step method', part: 'Lesson' },
      { id: 'worked', t: 599, title: 'Worked example', part: 'Lesson' },
      { id: 'yourturn', t: 665, title: 'Your turn', part: 'Lesson' },
      { id: 'practice', t: 705, title: 'SAT-style questions', part: 'Practice' },
      { id: 'recap', t: 1136, title: 'Remember these four rules', part: 'Recap' },
    ],
    mastery: [
      {
        text: 'The new bridge cut the drive into the city from forty minutes to ten. ______ traffic in the old town centre fell by almost half within a year.',
        question: 'Which choice completes the text with the most logical transition?',
        choices: ['However,', 'As a result,', 'For example,', 'Similarly,'],
        answer: 1,
        why: 'The shorter route came first and the drop in traffic followed from it. That is cause and effect, so the road sign says "here comes the result".',
        chapter: 'cause',
      },
      {
        text: 'Most desert plants store water in thick, fleshy stems. The welwitschia of Namibia, ______, gets much of its water from coastal fog that settles on its two long leaves.',
        question: 'Which choice completes the text with the most logical transition?',
        choices: ['therefore', 'for instance', 'by contrast', 'in addition'],
        answer: 2,
        why: 'The welwitschia does something different from most desert plants, so the second idea turns around: a contradict word.',
        chapter: 'contra',
      },
      {
        text: "Samarkand's Registan was once the busiest marketplace on the Silk Road. ______ it was home to three of the most important madrasas in Central Asia.",
        question: 'Which choice completes the text with the most logical transition?',
        choices: ['In addition,', 'Nevertheless,', 'Instead,', 'Consequently,'],
        answer: 0,
        why: 'Both sentences praise the Registan, so the idea keeps going in the same direction. Nothing is caused and nothing is contradicted.',
        chapter: 'continue',
      },
      {
        text: 'The study was small, with only twelve volunteers. ______ its results were striking enough to start three much larger trials.',
        question: 'Which choice completes the text with the most logical transition?',
        choices: ['Therefore,', 'Still,', 'For instance,', 'Likewise,'],
        answer: 1,
        why: 'A small study would normally not matter much, but this one did. "Still" admits the first point and then pushes against it.',
        chapter: 'tricky',
      },
      {
        text: 'Some animals use simple tools to find food. ______ sea otters float on their backs and crack open shellfish with stones balanced on their chests.',
        question: 'Which choice completes the text with the most logical transition?',
        choices: ['However,', 'As a result,', 'For example,', 'Instead,'],
        answer: 2,
        why: 'The second sentence gives one case of the general idea in the first, so it continues the idea with an example.',
        chapter: 'continue',
      },
    ],
  },
  synthesis: {
    slug: 'rhetorical-synthesis',
    duration: 825,
    chapters: [
      { id: 'intro', t: 0, title: 'Welcome', part: 'Intro' },
      { id: 'where', t: 24, title: 'Where it appears in each module', part: 'Lesson' },
      { id: 'anatomy', t: 55, title: 'How does a question look?', part: 'Lesson' },
      { id: 'skip', t: 98, title: 'The trick: skip the notes!', part: 'Lesson' },
      { id: 'demo', t: 139, title: 'Try it: goal and choices only', part: 'Lesson' },
      { id: 'wrong', t: 184, title: 'Three kinds of wrong answers', part: 'Lesson' },
      { id: 'goals', t: 228, title: 'Goals you must know', part: 'Lesson' },
      { id: 'sim', t: 279, title: 'Your turn: similarity', part: 'Lesson' },
      { id: 'dif', t: 308, title: 'Your turn: difference', part: 'Lesson' },
      { id: 'gen', t: 345, title: 'Your turn: generalization', part: 'Lesson' },
      { id: 'gs', t: 377, title: 'Generalization and support', part: 'Lesson' },
      { id: 'unf', t: 419, title: 'Your turn: unfamiliar audience', part: 'Lesson' },
      { id: 'fam', t: 459, title: 'Your turn: familiar audience', part: 'Lesson' },
      { id: 'keys', t: 500, title: 'Details of a study: key words', part: 'Lesson' },
      { id: 'aim', t: 537, title: 'Your turn: aim, method or finding?', part: 'Lesson' },
      { id: 'practice', t: 573, title: 'Fight time!', part: 'Practice' },
      { id: 'recap', t: 798, title: 'Remember', part: 'Recap' },
    ],
    mastery: [
      {
        notes: ['Lake Baikal is in Russia.', 'It formed about 25 million years ago.', 'Lake Tanganyika is in East Africa.', 'It formed about 10 million years ago.', 'Both lakes are more than 1,400 meters deep.'],
        goal: 'The student wants to emphasize a similarity between the two lakes.',
        question: 'Which choice most effectively uses relevant information from the notes to accomplish this goal?',
        choices: [
          'Lake Baikal, in Russia, formed about 25 million years ago.',
          'Lake Baikal and Lake Tanganyika are both more than 1,400 meters deep.',
          'Lake Tanganyika formed about 15 million years after Lake Baikal.',
          'Lake Baikal is in Russia, while Lake Tanganyika is in East Africa.',
        ],
        answer: 1,
        why: 'A similarity needs both lakes and one thing they share. Only B names both lakes with something in common.',
        chapter: 'sim',
      },
      {
        notes: ['Alisher Navoi (1441–1501) was a poet from Herat.', 'He wrote most of his poems in Chagatai Turkic.', 'Hafez (c. 1315–1390) was a poet from Shiraz.', 'He wrote his poems in Persian.'],
        goal: 'The student wants to contrast the languages the two poets wrote in.',
        question: 'Which choice most effectively uses relevant information from the notes to accomplish this goal?',
        choices: [
          'Navoi and Hafez were both famous poets.',
          'Hafez, a poet from Shiraz, lived in the fourteenth century.',
          'Navoi wrote most of his poems in Chagatai Turkic, whereas Hafez wrote in Persian.',
          'Navoi was born in 1441, about fifty years after Hafez died.',
        ],
        answer: 2,
        why: 'The goal is a difference in language. C gives both languages and a contrast word. D is a difference, but in dates, not language.',
        chapter: 'dif',
      },
      {
        notes: ['Mary Anning (1799–1847) was an English fossil collector.', 'She helped uncover the first ichthyosaur skeleton to be correctly identified.', 'She was about 12 years old at the time.'],
        goal: 'The student wants to introduce Mary Anning to an audience unfamiliar with her.',
        question: 'Which choice most effectively uses relevant information from the notes to accomplish this goal?',
        choices: [
          'Anning was about 12 years old when the skeleton was uncovered.',
          'Mary Anning, an English fossil collector, was about 12 when she helped uncover the first ichthyosaur skeleton to be correctly identified.',
          'The first ichthyosaur skeleton to be correctly identified was found in England.',
          'Mary Anning lived from 1799 to 1847.',
        ],
        answer: 1,
        why: 'An unfamiliar audience needs to know who she is. B gives her full name, what she was, and why she matters.',
        chapter: 'unf',
      },
      {
        notes: ['A team of researchers studied 40 honeybee colonies.', 'They wanted to find out whether city bees make more honey than country bees.', 'They weighed the honey from each colony at the end of summer.', 'The city colonies made about 30% more honey.'],
        goal: 'The student wants to present the aim of the study.',
        question: 'Which choice most effectively uses relevant information from the notes to accomplish this goal?',
        choices: [
          'The city colonies in the study made about 30% more honey than the country colonies.',
          'The researchers weighed the honey from each colony at the end of summer.',
          'The researchers wanted to find out whether city bees make more honey than country bees.',
          'A team of researchers studied 40 honeybee colonies.',
        ],
        answer: 2,
        why: 'The aim is what the researchers wanted to learn. A is the finding and B is the method.',
        chapter: 'aim',
      },
      {
        notes: ['Many desert animals are active mainly at night.', 'The fennec fox hunts after dark.', 'The kangaroo rat stays in its burrow during the day.'],
        goal: 'The student wants to make a generalization about desert animals.',
        question: 'Which choice most effectively uses relevant information from the notes to accomplish this goal?',
        choices: [
          'The fennec fox hunts after dark.',
          'The kangaroo rat stays in its burrow during the day.',
          'Many desert animals are active mainly at night.',
          'The fennec fox and the kangaroo rat both live in the desert.',
        ],
        answer: 2,
        why: 'A generalization is about the whole group, not one animal. Only C talks about desert animals in general.',
        chapter: 'gen',
      },
    ],
  },
}

/** Lessons whose videos are being made now. They show a "video coming soon" card. */
export const VIDEO_SOON: Record<string, string> = {
  wic: 'Video arriving this week',
  inferences: 'Video arriving soon',
  central: 'Video arriving soon',
  structure: 'Video in production',
  coe: 'Video in production',
  boundaries: 'Video in production',
  form: 'Video in production',
}

export const fmtTime = (s: number) => {
  s = Math.max(0, Math.floor(s))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
