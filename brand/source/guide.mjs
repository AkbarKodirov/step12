// Writes the Humo AI brand book (guidelines/humo-ai-brand-guidelines.html) and prints it to PDF.
// Run after build.mjs, from brand/source:  node guide.mjs
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'
import { humo, poses, expressions, turnaround } from './mascot.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = process.env.OUT || join(here, '..')
const G = join(OUT, 'guidelines')
mkdirSync(G, { recursive: true })
const A = '..' // assets are referenced relative to guidelines/

/* ---------- colour maths ---------- */
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const cmyk = (h) => {
  const [r, g, b] = rgb(h).map((v) => v / 255), k = 1 - Math.max(r, g, b)
  if (k >= 1) return [0, 0, 0, 100]
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100))
}
const lum = (h) => { const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const palette = [
  { group: 'Primary', name: 'Humo Navy', hex: '#03244A', pms: '2767 C', role: 'Main brand colour. Backgrounds, headlines, "Humo" on light.' },
  { group: 'Primary', name: 'Humo Crimson', hex: '#C8103F', pms: '200 C', role: 'The red of Humo, the same red as the 3D Humo. "AI", key buttons, highlights.' },
  { group: 'Secondary', name: 'Midnight', hex: '#03142C', pms: '5395 C', role: 'Deepest background, the end of the navy gradient.' },
  { group: 'Secondary', name: 'Royal Navy', hex: '#0E2F5C', pms: '2758 C', role: 'The start of the navy gradient, raised dark surfaces.' },
  { group: 'Secondary', name: 'Ruby', hex: '#A8092F', pms: '201 C', role: 'The 3D Humo\'s body. Bottom of the Humo gradient, pressed buttons.' },
  { group: 'Secondary', name: 'Rose', hex: '#E0456B', pms: '1925 C', role: 'Middle of the Humo gradient, links and accents on dark.' },
  { group: 'Mascot', name: 'Light Red', hex: '#FF6F86', pms: '1777 C', role: 'Humo the mascot\'s body (och qizil).' },
  { group: 'Mascot', name: 'Sheen', hex: '#FF7A98', pms: '1775 C', role: 'Top of the Humo gradient, glows, the 3D sheen.' },
  { group: 'Mascot', name: 'Petal', hex: '#FFC2D1', pms: '189 C', role: 'Soft fills, the mascot\'s tail tips, the 3D sparkles.' },
  { group: 'Neutral', name: 'Cream', hex: '#F6F7FB', pms: '663 C', role: 'Light page background.' },
  { group: 'Neutral', name: 'Slate', hex: '#56657A', pms: '7545 C', role: 'Secondary text, captions.' },
]
const swatch = (c, big = false) => {
  const [r, g, b] = rgb(c.hex), [C, M, Y, K] = cmyk(c.hex), dark = lum(c.hex) < 0.35
  return `<div class="sw ${big ? 'big' : ''}"><div class="chip" style="background:${c.hex};color:${dark ? '#fff' : '#03244A'}"><b>${c.name}</b></div>
  <dl><dt>HEX</dt><dd>${c.hex}</dd><dt>RGB</dt><dd>${r} ${g} ${b}</dd><dt>CMYK</dt><dd>${C} ${M} ${Y} ${K}</dd><dt>Pantone</dt><dd>${c.pms === '—' ? '—' : '≈ ' + c.pms}</dd></dl>${big ? `<p>${c.role}</p>` : ''}</div>`
}
const pairs = [['#FFFFFF', '#03244A', 'White on Navy'], ['#FF7A98', '#03244A', 'Sheen on Navy'], ['#03244A', '#F6F7FB', 'Navy on Cream'], ['#C8103F', '#FFFFFF', 'Crimson on White'], ['#FFFFFF', '#C8103F', 'White on Crimson'], ['#E0456B', '#03244A', 'Rose on Navy']]
const pairRow = ([fg, bg, label]) => {
  const r = contrast(fg, bg), ok = r >= 4.5 ? 'Pass, any text' : r >= 3 ? 'Large text only' : 'Fail, decoration only'
  return `<div class="pair" style="background:${bg};color:${fg}${bg === '#FFFFFF' ? ';border:1px solid #e3e7ee' : ''}"><b>Aa</b><span>${label}<br><small>${r.toFixed(1)}:1 · ${ok}</small></span></div>`
}

/* ---------- pieces ---------- */
let pageNo = 0
const page = (title, kicker, body, cls = '') => `<section class="page ${cls}">${title ? `<header class="ph"><span class="kick">${kicker}</span><h2>${title}</h2></header>` : ''}${body}<footer><span>Humo AI · Brand Identity &amp; Guidelines</span><span>${String(++pageNo).padStart(2, '0')}</span></footer></section>`
const img = (src, alt, style = '') => `<img src="${A}/${src}" alt="${alt}" style="${style}">`
let mid = 0
const mascot = (p, size = 200) => `<svg viewBox="0 0 600 600" width="${size}" height="${size}">${humo(p, 'g' + mid++)}</svg>`

const misuse = [
  ['Don\'t stretch or squash', 'transform:scaleX(1.45)'],
  ['Don\'t rotate', 'transform:rotate(-14deg)'],
  ['Don\'t recolour', 'filter:hue-rotate(160deg) saturate(1.4)'],
  ['Don\'t add shadows or glows', 'filter:drop-shadow(6px 8px 0 #F2B630)'],
  ['Don\'t make the whole logo red', 'filter:brightness(0) saturate(100%) invert(14%) sepia(90%) saturate(5000%) hue-rotate(338deg)'],
  ['Don\'t lower the opacity', 'opacity:.35'],
]

const pages = []
/* 1 cover */
pages.push(`<section class="page cover"><div class="glow"></div>${img('logo/svg/humo-mark-red.svg', 'Humo mark', 'height:300px')}<h1>Humo <span class="redtext">AI</span></h1><p class="lead">Brand Identity &amp; Guidelines</p><p class="ver">Version 1.0 · November 2026</p></section>`)
/* 2 contents */
pages.push(page('Contents', 'Brand book', `<ol class="toc"><li><b>01</b> Our story</li><li><b>02</b> The logo</li><li><b>03</b> Logo variations</li><li><b>04</b> Colour versions</li><li><b>05</b> Clear space &amp; minimum size</li><li><b>06</b> Logo misuse</li><li><b>07</b> Colour palette</li><li><b>08</b> Colour in use</li><li><b>09</b> Typography</li><li><b>10</b> Humo the mascot</li><li><b>11</b> Mascot turnaround</li><li><b>12</b> Mascot poses</li><li><b>13</b> Mascot expressions</li><li><b>14</b> Mascot rules</li><li><b>15</b> App icons</li><li><b>16</b> Graphic elements</li><li><b>17</b> Instagram</li><li><b>18</b> Telegram &amp; web</li><li><b>19</b> Telegram stickers</li><li><b>20</b> Brand applications</li><li><b>21</b> Files</li></ol>`))
/* 3 story */
pages.push(page('Our story', '01', `<div class="two"><div>
<p class="big">In Uzbek legend, Humo is the bird of happiness. Whoever its shadow falls on is blessed with good fortune.</p>
<p>Humo AI puts that bird beside every student preparing for the Digital SAT. Humo is a patient, clever tutor that explains, encourages and celebrates, and helps students from Tashkent and beyond reach the university they dream of.</p>
<p>The logo shows Humo with its wings raised, rising, and crowned with a four-point spark: the mark of intelligence that sets Humo AI apart.</p></div>
<div><h3>Personality</h3><div class="traits"><div><b>Wise</b><span>Knows the SAT inside out, explains it simply.</span></div><div><b>Warm</b><span>Encouraging, never judging. Mistakes are part of learning.</span></div><div><b>Ambitious</b><span>Aims high: top scores, top universities.</span></div><div><b>Clear</b><span>Short sentences, real steps, no fluff.</span></div></div>
<h3>Voice</h3><div class="voice"><p class="yes">"Nice! That's 3 in a row. Ready for a harder one?"</p><p class="no">"Congratulations on successfully completing the assessment item."</p></div></div></div>`))
/* 4 logo */
pages.push(page('The logo', '02', `<div class="hero dark">${img('logo/svg/humo-ai-horizontal-on-dark.svg', 'Humo AI logo', 'height:220px')}</div>
<div class="three"><div><h4>The Humo</h4><p>The bird of happiness with raised wings: four feathers on each side, five tail plumes, head turned to the right. Drawn in the Humo gradient, the same pink-to-crimson light as the 3D Humo.</p></div><div><h4>The AI spark</h4><p>A four-point star crowning the bird. It stands for intelligence and is the brand's main graphic element.</p></div><div><h4>The wordmark</h4><p>"Humo AI" set in Onest Bold, tracking −2.5%. On dark: "Humo" white, "AI" in rose. On light: "Humo" navy, "AI" crimson. The logo is never all red.</p></div></div>`))
/* 5 variations */
pages.push(page('Logo variations', '03', `<div class="grid3">
<figure><div class="tile dark">${img('logo/svg/humo-ai-horizontal-on-dark.svg', '', 'width:86%')}</div><figcaption><b>Horizontal (primary)</b> Website header, documents, wide spaces.</figcaption></figure>
<figure><div class="tile dark">${img('logo/svg/humo-ai-stacked-on-dark.svg', '', 'height:82%')}</div><figcaption><b>Stacked</b> Square and tall spaces, posters, merch.</figcaption></figure>
<figure><div class="tile light">${img('logo/svg/humo-mark-red.svg', '', 'height:70%')}</div><figcaption><b>Mark</b> When the name is already nearby, or very small sizes.</figcaption></figure>
<figure><div class="tile light">${img('icon/humo-app-icon.svg', '', 'height:74%')}</div><figcaption><b>App icon</b> Phone home screen, favicon, browser tabs.</figcaption></figure>
<figure><div class="tile light">${img('logo/svg/humo-seal.svg', '', 'height:74%')}</div><figcaption><b>Seal</b> Round avatars: Instagram, Telegram, YouTube. A white version exists for light layouts.</figcaption></figure>
<figure><div class="tile dark">${img('logo/svg/humo-ai-wordmark-on-dark.svg', '', 'width:70%')}</div><figcaption><b>Wordmark</b> Only where the bird already appears, e.g. next to the 3D Humo.</figcaption></figure></div>`))
/* 6 colour versions */
pages.push(page('Colour versions', '04', `<div class="grid3">
<figure><div class="tile dark">${img('logo/svg/humo-ai-horizontal-on-dark.svg', '', 'width:86%')}</div><figcaption><b>Full colour on dark</b> The preferred version. Red Humo, white "Humo", rose "AI".</figcaption></figure>
<figure><div class="tile light">${img('logo/svg/humo-ai-horizontal-on-light.svg', '', 'width:86%')}</div><figcaption><b>Full colour on light</b> Navy "Humo", crimson "AI".</figcaption></figure>
<figure><div class="tile pinkbg">${img('logo/svg/humo-ai-horizontal-navy.svg', '', 'width:86%')}</div><figcaption><b>Navy</b> On petal, cream or for one-colour print.</figcaption></figure>
<figure><div class="tile dark">${img('logo/svg/humo-ai-horizontal-white.svg', '', 'width:86%')}</div><figcaption><b>White</b> On photos (with a dark overlay) or coloured backgrounds.</figcaption></figure>
<figure><div class="tile light">${img('logo/svg/humo-ai-horizontal-crimson.svg', '', 'width:86%')}</div><figcaption><b>Flat crimson</b> Embroidery, stamps and one-colour red print, where gradients can't print.</figcaption></figure>
<figure><div class="tile light">${img('logo/svg/humo-mark-black.svg', '', 'height:70%')}</div><figcaption><b>Black</b> Fax, stamps, newspaper. Only when no colour is possible.</figcaption></figure></div>`))
/* 7 clear space */
pages.push(page('Clear space &amp; minimum size', '05', `<div class="two"><div><div class="clear dark"><div class="cs">${img('logo/svg/humo-ai-horizontal-on-dark.svg', '', 'height:180px;display:block')}<i style="left:0;top:0">X</i><i style="right:0;top:0">X</i><i style="left:0;bottom:0">X</i><i style="right:0;bottom:0">X</i></div></div>
<p><b>Clear space.</b> Keep an empty margin of <b>X</b> on every side, where X is one quarter of the mark's height (about the height of the bird's head). The logo files already include this space.</p></div>
<div><h3>Minimum sizes</h3><table class="t"><tr><th></th><th>Screen</th><th>Print</th></tr>
<tr><td>Horizontal logo</td><td>120 px wide</td><td>30 mm wide</td></tr><tr><td>Stacked logo</td><td>72 px wide</td><td>20 mm wide</td></tr><tr><td>Mark</td><td>24 px tall</td><td>8 mm tall</td></tr><tr><td>Seal / avatar</td><td>40 px</td><td>12 mm</td></tr><tr><td>Favicon</td><td>16 px (use favicon.svg)</td><td>—</td></tr></table>
<div class="mins dark">${img('logo/svg/humo-ai-horizontal-on-dark.svg', '', 'width:120px')}${img('logo/svg/humo-mark-red.svg', '', 'height:24px')}${img('icon/favicon.svg', '', 'height:16px')}</div>
<p class="note">Below these sizes the feathers start to merge. Use the favicon version (a slightly larger bird inside the tile) for anything under 32 px.</p></div></div>`))
/* 8 misuse */
pages.push(page('Logo misuse', '06', `<div class="grid4">${misuse.map(([t, s]) => `<figure class="bad"><div class="tile dark sm">${img('logo/svg/humo-ai-horizontal-on-dark.svg', '', `width:78%;${s}`)}</div><figcaption>✕ ${t}</figcaption></figure>`).join('')}
<figure class="bad"><div class="tile light sm">${img('logo/svg/humo-ai-wordmark-on-dark.svg', '', 'width:62%;filter:brightness(1)')}</div><figcaption>✕ Don't put white or rose text on white</figcaption></figure>
<figure class="bad"><div class="tile sm" style="background:repeating-linear-gradient(45deg,#BB0937 0 18px,#FFC2D1 18px 36px,#56657A 36px 54px)">${img('logo/svg/humo-ai-horizontal-on-dark.svg', '', 'width:78%')}</div><figcaption>✕ Don't place on busy backgrounds</figcaption></figure></div>`))
/* 9 palette */
pages.push(page('Colour palette', '07', `<div class="pal-main">${palette.slice(0, 2).map((c) => swatch(c, true)).join('')}</div><div class="pal-rest">${palette.slice(2).map((c) => swatch(c)).join('')}</div>
<p class="note">Pantone values are the nearest Coated matches (≈). CMYK values are starting points; ask the printer for a proof. The Humo gradient should be printed as Crimson (200 C) when gradients aren't possible.</p>`))
/* 10 colour in use */
pages.push(page('Colour in use', '08', `<div class="two"><div><h3>Proportion</h3><div class="ratio"><span style="flex:58;background:#03244A">Navy 58%</span><span style="flex:24;background:#F6F7FB;color:#03244A">Cream 24%</span><span style="flex:13;background:#C8103F">Crimson 13%</span><span style="flex:5;background:#FFC2D1;color:#03244A">5%</span></div>
<p>Navy carries the brand; red brings Humo to life. Use crimson for Humo, "AI", key numbers and the one action that matters on a screen. Never make a whole layout red: the logo and pages are navy first, red second.</p>
<h3>The Humo gradient</h3><div class="grad"></div><p class="mono">linear-gradient(180deg, #FF8FA6 0%, #E0456B 50%, #A8092F 100%)</p>
<div class="grad navy"></div><p class="mono">linear-gradient(135deg, #0E2F5C 0%, #03142C 100%)</p></div>
<div><h3>Contrast (WCAG)</h3><div class="pairs">${pairs.map(pairRow).join('')}</div>
<p class="note">Small red text goes in Crimson on white. On navy use Sheen or Rose; Crimson itself is too dark for small text on navy.</p></div></div>`))
/* 11 typography */
pages.push(page('Typography', '09', `<div class="two"><div><p class="kick2">Primary typeface</p><div class="specimen">Onest</div><p>A modern grotesque with full Latin, Uzbek (oʻ, gʻ) and Cyrillic support. Free under the SIL Open Font License; files are in <span class="mono">brand/fonts</span>.</p>
<div class="weights"><span style="font-weight:400">Regular 400</span><span style="font-weight:500">Medium 500</span><span style="font-weight:600">SemiBold 600</span><span style="font-weight:700">Bold 700</span><span style="font-weight:800">ExtraBold 800</span></div>
<p class="glyphs">Aa Bb Cc Dd Ee Gʻgʻ Oʻoʻ Шш Жж 0123456789 → ✓</p>
<p class="kick2" style="margin-top:22px">Reading typeface</p><div class="specimen serif">Literata</div><p>For SAT reading passages and long-form text, as on the platform.</p></div>
<div><h3>Type scale</h3><table class="t scale">
<tr><td>Display</td><td style="font-size:44px;font-weight:800;letter-spacing:-.03em">Score 1500+</td><td>64 / 800 / −3%</td></tr>
<tr><td>H1</td><td style="font-size:32px;font-weight:700;letter-spacing:-.02em">Practice Test 14</td><td>40 / 700 / −2%</td></tr>
<tr><td>H2</td><td style="font-size:24px;font-weight:600">Reading &amp; Writing</td><td>28 / 600</td></tr>
<tr><td>Body</td><td style="font-size:16px">Humo explains each answer step by step.</td><td>16 / 400–500</td></tr>
<tr><td>Caption</td><td style="font-size:13px;font-weight:500;color:#56657A">Module 1 · 27 questions</td><td>13 / 500</td></tr>
<tr><td>Passage</td><td style="font-size:17px;font-family:Literata">The author's tone shifts from doubt to hope.</td><td>Literata 17 / 400</td></tr></table>
<p class="note">Fallbacks: <span class="mono">ui-sans-serif, system-ui</span> and <span class="mono">Georgia</span>. In Instagram and Telegram graphics, headlines are Onest Bold, sentence case, no full stop on single-line titles.</p></div></div>`))
/* 12 mascot intro */
pages.push(page('Humo the mascot', '10', `<div class="two"><div class="mascot-hero">${mascot(poses.hello, 380)}</div><div>
<p class="big">Humo is the student's friend: a light red little bird of happiness who explains, cheers and never gives up on you.</p>
<h3>Construction</h3><ul class="list"><li><b>Body</b> one pear shape, head and body together, light red (och qizil) lit from the top left.</li><li><b>Crest</b> three crimson feathers; the AI spark floats beside them.</li><li><b>Eyes</b> big, with navy irises and two white sparkles. Brows are short crimson strokes.</li><li><b>Tail</b> three curled plumes in crimson, rose and petal: Humo's signature.</li><li><b>Medal</b> a navy collar with the AI spark medal on the chest.</li><li><b>Wings</b> soft, rounded; they do the acting. Cheeks are blush at 40%.</li></ul>
<div class="mini-pal"><span style="background:#FFC0C9"></span><span style="background:#FF6F86"></span><span style="background:#C8103F"></span><span style="background:#FFF3D1"></span><span style="background:#03244A"></span><span style="background:#E0456B"></span></div>
<p class="note">The 3D Humo on the website keeps its own look. The 2D Humo is for social posts, stickers, app icons and in-app illustrations, in the same crimson family.</p></div></div>`))
/* turnaround */
pages.push(page('Mascot turnaround', '11', `<div class="grid4 turn">${Object.entries(turnaround).map(([k, p]) => `<figure><div class="tile light">${mascot(p, 260)}</div><figcaption><b>${k}</b></figcaption></figure>`).join('')}</div><p class="note" style="margin-top:14px">Use these views to keep Humo on-model when drawing new scenes or briefing an animator. Proportions: height = 1.5 × body width; eyes sit on the upper third; the tail always sweeps to Humo's right (viewer's left).</p>`))
/* 13 poses */
pages.push(page('Mascot poses', '12', `<div class="grid4 poses">${Object.values(poses).map((p) => `<figure><div class="tile light">${mascot(p, 210)}</div><figcaption><b>${p.title}</b> ${p.use}</figcaption></figure>`).join('')}</div>`))
/* 14 expressions */
pages.push(page('Mascot expressions', '13', `<div class="grid4 expr">${Object.entries(expressions).map(([k, p], i) => `<figure><div class="tile ${i % 2 ? 'dark' : 'light'}">${mascot(p, 210)}</div><figcaption><b>${k}</b></figcaption></figure>`).join('')}</div>`))
/* 15 mascot rules */
pages.push(page('Mascot rules', '14', `<div class="grid4">
<figure class="good"><div class="tile light sm">${mascot(poses.cheer, 130)}</div><figcaption>✓ Match the emotion to the moment: cheer after mistakes</figcaption></figure>
<figure class="good"><div class="tile dark sm">${mascot(poses.celebrate, 130)}</div><figcaption>✓ Give Humo room: at least one wing-length of space</figcaption></figure>
<figure class="bad"><div class="tile light sm"><div style="filter:hue-rotate(190deg)">${mascot(poses.hello, 130)}</div></div><figcaption>✕ Don't change Humo's colours</figcaption></figure>
<figure class="bad"><div class="tile light sm"><div style="transform:scaleY(.6)">${mascot(poses.hello, 130)}</div></div><figcaption>✕ Don't squash or stretch Humo</figcaption></figure>
<figure class="bad"><div class="tile light sm">${mascot(expressions.Oops, 130)}</div><figcaption>✕ Don't show Humo sad or angry at a student</figcaption></figure>
<figure class="bad"><div class="tile light sm" style="gap:0">${mascot(poses.hello, 90)}${mascot(poses.hello, 90)}</div><figcaption>✕ Only one Humo per graphic</figcaption></figure>
<figure class="bad"><div class="tile light sm">${img('logo/svg/humo-ai-horizontal-on-light.svg', '', 'width:62%;position:absolute')}<div style="margin-left:120px">${mascot(poses.hello, 110)}</div></div><figcaption>✕ Don't replace or overlap the logo mark with the mascot</figcaption></figure>
<figure class="good"><div class="tile light sm">${mascot(poses.scholar, 130)}</div><figcaption>✓ Props are fine if they're about learning</figcaption></figure></div>`))
/* app icons */
pages.push(page('App icons', '15', `<div class="icons"><div><h3>Logo icon</h3><div class="irow">${img('icon/ios/AppIcon-1024.png', '', 'width:150px;border-radius:34px')}${img('icon/android/ic_launcher_round-xxxhdpi-192.png', '', 'width:110px')}${img('icon/humo-app-icon.svg', '', 'width:72px')}${img('icon/web/favicon-32.png', '', 'width:32px')}${img('icon/web/favicon-16.png', '', 'width:16px')}</div><p>The main icon for the app, the website and the browser tab.</p></div>
<div><h3>Mascot icon</h3><div class="irow">${img('icon/mascot/ios/AppIcon-1024.png', '', 'width:150px;border-radius:34px')}${img('icon/mascot/android/ic_launcher_round-xxxhdpi-192.png', '', 'width:110px')}${img('icon/mascot/humo-mascot-icon.svg', '', 'width:72px')}</div><p>For the Telegram bot, chat avatars and friendly places.</p></div></div>
<h3 style="margin-top:18px">Moods</h3><div class="irow">${['happy', 'wow', 'love', 'focused', 'oops', 'sleepy'].map((m) => img(`icon/mascot/moods/humo-${m}-512.png`, m, 'width:110px;border-radius:24px')).join('')}</div>
<p class="note">Every size is ready: iOS (20–1024 px), Android mdpi–xxxhdpi square and round, adaptive foreground/background, Play Store 512, web favicons, Apple touch icon and a maskable PWA icon.</p>`))
/* 16 graphic elements */
pages.push(page('Graphic elements', '16', `<div class="three ge"><div><div class="tile dark">${img('logo/svg/humo-mark-red.svg', '', 'height:0')}<svg viewBox="-24 -24 48 48" width="120" height="120"><path d="M0 -22 C4 -4 4 -4 22 0 C4 4 4 4 0 22 C-4 4 -4 4 -22 0 C-4 -4 -4 -4 0 -22Z" fill="#E0456B"/></svg></div><h4>The AI spark</h4><p>Use it as a bullet, a "new" marker, a rating star or to frame a key number. Always crimson, rose or white, never rotated.</p></div>
<div><div class="tile dark pattern"></div><h4>Spark field</h4><p>A quiet grid of sparks at 8% opacity behind dark social graphics, with a soft rose glow behind the hero.</p></div>
<div><div class="tile light shapes"><span class="sq"></span><span class="pill">Start practice</span><span class="badge">✦ New</span></div><h4>Shapes</h4><p>Rounded corners everywhere: tiles 22% of their size, cards 20–28 px, buttons fully rounded. Icons: Lucide line icons, 2 px stroke.</p></div></div>`))
/* 17 instagram */
pages.push(page('Instagram', '17', `<div class="social"><figure>${img('social/instagram/humo-instagram-profile-1080.png', '', 'width:200px;border-radius:50%')}<figcaption><b>Profile</b> 1080×1080, Seal</figcaption></figure>
<figure>${img('social/instagram/humo-instagram-post-template-1080x1350.png', '', 'height:330px;border-radius:12px')}<figcaption><b>Post</b> 1080×1350 (4:5)</figcaption></figure>
<figure>${img('social/instagram/humo-instagram-story-template-1080x1920.png', '', 'height:330px;border-radius:12px')}<figcaption><b>Story / Reel cover</b> 1080×1920</figcaption></figure>
<div class="rules"><h4>Rules</h4><ul class="list"><li>Logo top-left on posts, top-centre on stories, at least 64 px from the edge.</li><li>One headline, max 8 words, Onest Bold, white; a rose kicker line above.</li><li>Keep text inside the middle 1080×1420 of stories (the safe zone).</li><li>Humo bottom-right on posts, never covering text.</li><li>Carousels: same background on every slide, page number in rose.</li></ul></div></div>`))
/* 18 telegram & web */
pages.push(page('Telegram &amp; web', '18', `<div class="social"><figure>${img('social/telegram/humo-telegram-avatar-640.png', '', 'width:180px;border-radius:50%')}<figcaption><b>Channel / bot avatar</b> 640×640</figcaption></figure>
<figure>${img('social/telegram/humo-telegram-post-cover-1280x720.png', '', 'width:420px;border-radius:12px')}<figcaption><b>Post cover</b> 1280×720 (16:9)</figcaption></figure>
<figure>${img('social/web/humo-link-preview-1200x630.png', '', 'width:360px;border-radius:12px')}<figcaption><b>Link preview (OG image)</b> 1200×630</figcaption></figure></div>
<div class="tgmock"><div class="tgchat">${img('social/telegram/humo-telegram-avatar-640.png', '', 'width:44px;border-radius:50%')}<div><b>Humo AI</b><small>channel · SAT prep with Humo</small></div></div><p class="note">Channel name: <b>Humo AI</b>. Description starts with what students get: "Daily SAT tips, practice tests and your AI tutor Humo." Use ✦ as the bullet in posts.</p></div>`))
/* stickers */
const stickerNames = ['hello', 'celebrate', 'explain', 'reading', 'thinking', 'scholar', 'cheer', 'rest', 'happy', 'wow', 'love', 'oops']
pages.push(page('Telegram stickers', '19', `<div class="stickers">${stickerNames.map((n) => `<figure>${img(`social/telegram/stickers/humo-${n}-512.png`, n, 'width:150px')}<figcaption>${n}</figcaption></figure>`).join('')}</div><p class="note">512×512 transparent PNGs, ready for Telegram's @Stickers bot. 16 stickers in total in social/telegram/stickers.</p>`))
/* 19 applications */
const card = `<div class="bcard front">${img('logo/svg/humo-ai-stacked-on-dark.svg', '', 'height:120px')}</div><div class="bcard back"><div><b>Akbarjon</b><small>Founder</small></div><div class="ct">Humo AI · Tashkent<br>step12.onrender.com</div>${img('logo/svg/humo-mark-red.svg', '', 'position:absolute;right:22px;top:22px;height:44px')}</div>`
const tee = `<svg viewBox="0 0 300 300" width="250"><path d="M90 30 L60 40 L18 90 L50 120 L72 100 L72 280 L228 280 L228 100 L250 120 L282 90 L240 40 L210 30 Q150 70 90 30Z" fill="#03244A"/><image href="${A}/logo/svg/humo-ai-stacked-on-dark.svg" x="105" y="95" width="90" height="90"/></svg>`
const sticker = `<div class="sticker">${mascot(poses.celebrate, 170)}</div>`
pages.push(page('Brand applications', '20', `<div class="apps"><figure><div class="cards">${card}</div><figcaption><b>Business card</b> 90×50 mm, navy with a crimson foil Humo</figcaption></figure>
<figure>${tee}<figcaption><b>T-shirt / hoodie</b> Stacked logo, crimson and white embroidery</figcaption></figure>
<figure>${sticker}<figcaption><b>Stickers</b> Humo with a white die-cut border; the full set is in social/telegram/stickers</figcaption></figure>
<figure><div class="cert"><span>Certificate of Achievement</span><b>Digital SAT Practice</b>${img('logo/svg/humo-seal.svg', '', 'height:70px')}</div><figcaption><b>Certificates</b> Seal as the stamp</figcaption></figure></div>`))
/* 20 files */
pages.push(page('Files', '21', `<div class="two"><div><table class="t files">
<tr><td class="mono">logo/svg, logo/png</td><td>Horizontal, stacked, mark, seal, wordmark in every colour version</td></tr>
<tr><td class="mono">icon/</td><td>Logo and mascot app icons for iOS, Android and web; mood icons</td></tr>
<tr><td class="mono">mascot/</td><td>Turnaround, 8 poses and 8 expressions, SVG + PNG</td></tr>
<tr><td class="mono">social/</td><td>Instagram profile, post, story; Telegram avatar, post cover and 16 stickers; link preview</td></tr>
<tr><td class="mono">fonts/</td><td>Onest and Literata (SIL Open Font License)</td></tr>
<tr><td class="mono">source/</td><td>The scripts that draw every file, so the whole kit can be rebuilt</td></tr></table></div>
<div><h3>Which file do I use?</h3><ul class="list"><li><b>SVG</b> for the website, Figma, Canva and print shops. It's sharp at any size.</li><li><b>PNG</b> for Instagram, Telegram, slides and anywhere SVG isn't accepted.</li><li>Transparent background: <span class="mono">-on-dark</span> files go on dark backgrounds, <span class="mono">-on-light</span> on light.</li><li>For printing, send the SVG together with this guide's colour page.</li></ul></div></div>`))

const css = `
.turn .tile{height:330px}.icons{display:grid;grid-template-columns:1fr 1fr;gap:40px}.irow{display:flex;gap:22px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.stickers{display:grid;grid-template-columns:repeat(6,1fr);gap:4px 10px;text-align:center}.stickers figcaption{margin-top:0}
@font-face{font-family:Onest;src:url(../fonts/Onest-400.ttf);font-weight:400}@font-face{font-family:Onest;src:url(../fonts/Onest-500.ttf);font-weight:500}@font-face{font-family:Onest;src:url(../fonts/Onest-600.ttf);font-weight:600}@font-face{font-family:Onest;src:url(../fonts/Onest-700.ttf);font-weight:700}@font-face{font-family:Onest;src:url(../fonts/Onest-800.ttf);font-weight:800}
@font-face{font-family:Literata;src:url(../fonts/Literata-400.ttf);font-weight:400}
@page{size:1280px 720px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html{background:#d9dee7}body{font-family:Onest,system-ui,sans-serif;color:#03244A;font-size:15px;line-height:1.5}
.page{width:1280px;height:720px;margin:24px auto;background:#fff;position:relative;padding:56px 64px 60px;overflow:hidden;page-break-after:always;break-after:page;box-shadow:0 10px 40px -20px #03142c66}
@media print{html{background:#fff}.page{margin:0;box-shadow:none}}
.ph{margin-bottom:26px}.kick{font-weight:700;color:#C8103F;letter-spacing:.12em;font-size:13px}.ph h2{font-size:38px;letter-spacing:-.025em;line-height:1.1}
footer{position:absolute;left:64px;right:64px;bottom:22px;display:flex;justify-content:space-between;font-size:12px;color:#56657A;font-weight:500}
h3{font-size:18px;margin:4px 0 10px}h4{font-size:16px;margin:12px 0 4px}p{margin-bottom:10px}
.big{font-size:24px;line-height:1.35;font-weight:600;letter-spacing:-.01em;margin-bottom:18px}
.note{font-size:13px;color:#56657A}.mono{font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:48px}.three{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 22px}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 18px}
figure{margin:0}figcaption{font-size:13px;color:#56657A;margin-top:8px}figcaption b{color:#03244A;display:block;font-size:14px}
.tile{height:170px;border-radius:18px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}.tile.sm{height:150px}
.poses .tile{height:210px}.expr .tile{height:210px}.poses figcaption,.expr figcaption{margin-top:4px}
.dark,.cover{background:radial-gradient(120% 140% at 15% 0%,#0E2F5C,#03142C)}.light{background:#F6F7FB}.pinkbg{background:#FFC2D1}
.cover{color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.cover h1{font-size:96px;letter-spacing:-.035em;line-height:1;margin-top:18px}.cover .lead{font-size:26px;font-weight:500;margin-top:14px;color:#dfe6f2}.cover .ver{font-size:14px;color:#93a3ba;margin-top:36px}
.cover .glow{position:absolute;inset:0;background:radial-gradient(40% 50% at 50% 34%,#E0456B40,transparent)}
.redtext{background:linear-gradient(180deg,#FF8FA6,#E0456B);-webkit-background-clip:text;color:transparent}
.toc{list-style:none;columns:2;column-gap:64px;font-size:19px;font-weight:600}.toc li{padding:6px 0;border-bottom:1px solid #e3e7ee;break-inside:avoid}.toc b{color:#C8103F;margin-right:18px;font-size:16px}
.traits{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}.traits div{background:#F6F7FB;border-radius:14px;padding:12px 14px}.traits b{display:block;font-size:17px}.traits span{font-size:13px;color:#56657A}
.voice p{border-radius:14px;padding:10px 14px;font-weight:500}.yes{background:#eaf7ee}.yes:before{content:"✓ Say  ";color:#167a3d;font-weight:700}.no{background:#fdf0f3}.no:before{content:"✕ Not  ";color:#BB0937;font-weight:700}
.hero{height:330px;border-radius:24px;display:flex;align-items:center;justify-content:center;margin-bottom:22px}
.clear{border-radius:20px;padding:40px;display:flex;justify-content:center;margin-bottom:16px}.cs{outline:2px dashed #FF7A98;outline-offset:0;position:relative}
.cs i{position:absolute;width:30px;height:30px;background:#E0456B30;border:1px solid #FF7A98;color:#FF7A98;font-style:normal;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center}
.t{width:100%;border-collapse:collapse;font-size:14px}.t td,.t th{padding:9px 8px;border-bottom:1px solid #e3e7ee;text-align:left;vertical-align:middle}.t th{font-size:12px;color:#56657A;letter-spacing:.06em}
.mins{display:flex;gap:28px;align-items:center;border-radius:14px;padding:18px 22px;margin:16px 0}
.bad figcaption{color:#BB0937;font-weight:600}.good figcaption{color:#167a3d;font-weight:600}
.pal-main{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:14px}.pal-rest{display:grid;grid-template-columns:repeat(9,1fr);gap:10px;margin-bottom:10px}
.sw .chip{height:64px;border-radius:12px;padding:10px;display:flex;align-items:flex-end;font-size:12px}.sw.big{display:grid;grid-template-columns:200px 1fr;gap:6px 16px}.sw.big .chip{height:150px;font-size:18px;grid-row:span 2;border-radius:16px}.sw.big p{font-size:13px;color:#56657A}
.sw dl{display:grid;grid-template-columns:auto 1fr;gap:0 8px;font-size:11px;margin-top:6px}.sw dt{color:#56657A;font-weight:500}.sw dd{font-weight:600}.sw.big dl{font-size:14px;align-self:end}
.ratio{display:flex;height:64px;border-radius:14px;overflow:hidden;margin-bottom:12px}.ratio span{display:flex;align-items:center;padding:0 12px;color:#fff;font-weight:600;font-size:13px}
.grad{height:46px;border-radius:12px;background:linear-gradient(90deg,#FF8FA6,#E0456B 50%,#A8092F);margin:6px 0}.grad.navy{background:linear-gradient(135deg,#0E2F5C,#03142C)}
.pairs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.pair{border-radius:14px;padding:12px 14px;display:flex;gap:14px;align-items:center}.pair b{font-size:30px}.pair span{font-weight:600;font-size:14px;line-height:1.25}.pair small{font-weight:500;font-size:12px;opacity:.85}
.kick2{font-weight:700;color:#C8103F;letter-spacing:.1em;font-size:12px;text-transform:uppercase}.specimen{font-size:84px;font-weight:700;letter-spacing:-.03em;line-height:1.05;margin-bottom:6px}.specimen.serif{font-family:Literata;font-weight:400;font-size:60px}
.weights{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:18px;margin:8px 0}.glyphs{font-size:20px;font-weight:600;color:#0E2F5C}
.scale td:first-child{color:#56657A;font-size:12px;width:70px}.scale td:last-child{color:#56657A;font-size:12px;white-space:nowrap}
.mascot-hero{background:#F6F7FB;border-radius:24px;display:flex;align-items:center;justify-content:center;height:560px}
.list{list-style:none}.list li{padding:5px 0 5px 22px;position:relative;font-size:14px}.list li:before{content:"✦";position:absolute;left:0;color:#C8103F}
.mini-pal{display:flex;gap:8px;margin:14px 0}.mini-pal span{width:40px;height:40px;border-radius:50%;border:1px solid #e3e7ee}
.ge .tile{height:220px}.pattern{background-image:radial-gradient(40% 50% at 50% 45%,#E0456B44,transparent),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M20 12 Q21 19 28 20 Q21 21 20 28 Q19 21 12 20 Q19 19 20 12Z' fill='%23FF7A98' fill-opacity='.18'/%3E%3C/svg%3E"),radial-gradient(120% 140% at 15% 0%,#0E2F5C,#03142C)}
.shapes{gap:14px;flex-wrap:wrap;padding:20px}.shapes .sq{width:64px;height:64px;border-radius:22%;background:linear-gradient(135deg,#0E2F5C,#03142C)}.pill{color:#fff;background:linear-gradient(135deg,#E0456B,#A8092F);border-radius:99px;padding:12px 22px;font-weight:700}.badge{background:#03244A;color:#FF7A98;border-radius:99px;padding:6px 12px;font-weight:700;font-size:13px}
.social{display:flex;gap:28px;align-items:flex-end;margin-bottom:18px}.social figure{text-align:center}.rules{flex:1;align-self:center}
.tgmock{display:flex;gap:24px;align-items:center}.tgchat{display:flex;gap:12px;align-items:center;background:#F6F7FB;border-radius:16px;padding:10px 18px 10px 10px;min-width:300px}.tgchat small{display:block;color:#56657A}
.apps{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;gap:26px;align-items:end}.apps figure{text-align:center}
.cards{position:relative;height:330px}.bcard{width:290px;height:161px;border-radius:10px;position:absolute;box-shadow:0 18px 30px -18px #03142c99}.bcard.front{background:radial-gradient(120% 140% at 15% 0%,#0E2F5C,#03142C);display:flex;align-items:center;justify-content:center;left:0;top:0}
.bcard.back{background:#fff;border:1px solid #e3e7ee;left:60px;top:168px;padding:22px;text-align:left;font-size:13px}.bcard.back b{display:block;font-size:17px}.bcard.back small{color:#C8103F;font-weight:600}.bcard .ct{position:absolute;bottom:18px;left:22px;color:#56657A;font-size:12px}
.sticker{display:inline-flex;background:#fff;border-radius:50%;padding:10px;filter:drop-shadow(0 6px 10px #03142c44);margin-bottom:30px}
.cert{border:3px double #C8103F;border-radius:6px;background:#FFF8FA;height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px}.cert span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C8103F;font-weight:700}.cert b{font-family:Literata;font-size:18px}
`
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Humo AI Brand Guidelines</title><style>${css}</style></head><body>${pages.join('\n')}</body></html>`
writeFileSync(join(G, 'humo-ai-brand-guidelines.html'), html)

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
await p.goto('file://' + join(G, 'humo-ai-brand-guidelines.html'))
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(500)
await p.pdf({ path: join(G, 'humo-ai-brand-guidelines.pdf'), width: '1280px', height: '720px', printBackground: true })
if (process.env.SHOTS) {
  await p.emulateMedia({ media: 'print' })
  const n = await p.locator('.page').count()
  for (let i = 0; i < n; i++) await p.locator('.page').nth(i).screenshot({ path: join(process.env.SHOTS, `p${String(i + 1).padStart(2, '0')}.png`) })
}
await b.close()
console.log('guide written')
