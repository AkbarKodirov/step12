// Builds every Humo AI brand file (SVG + PNG) into ../ (the brand/ folder).
// Run from brand/source:  npm i --no-save opentype.js@1.3.4 playwright && node build.mjs
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'
import { renderMark } from './markrender.mjs'
import { text, capHeight } from './wm.mjs'
import { humo, poses, expressions, turnaround } from './mascot.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = process.env.OUT || join(here, '..')
export const K = {
  navy: '#03244A', midnight: '#03142C', royal: '#0E2F5C',
  crimson: '#C8103F', ruby: '#A8092F', rose: '#E0456B', sheen: '#FF7A98', petal: '#FFC2D1', lightRed: '#FF6F86',
  cream: '#F6F7FB', slate: '#56657A', white: '#FFFFFF', sparkLight: '#FFE3EA',
}
const BOX = { x: 64, y: 93, w: 384, h: 375 } // the mark's bounds on its 512 grid

// The Humo red: pink sheen at the top falling to the 3D Humo's metallic crimson, like light on the 3D bird.
const redGrad = (id, y1 = BOX.y, y2 = BOX.y + BOX.h) => `<linearGradient id="${id}" x1="0" y1="${y1}" x2="0" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FF8FA6"/><stop offset=".5" stop-color="${K.rose}"/><stop offset="1" stop-color="${K.ruby}"/></linearGradient>`
const textRed = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8FA6"/><stop offset="1" stop-color="${K.rose}"/></linearGradient>`
const navyGrad = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${K.royal}"/><stop offset="1" stop-color="${K.midnight}"/></linearGradient>`

/** The Humo mark on its 512 grid. */
function mark(fill, spark = fill) {
  return renderMark(fill, spark)
}
const svgDoc = (w, h, body, title = 'Humo AI') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${title}</title>${body}</svg>\n`

const files = [] // [relPath, svg, [[pngPath, width]...]]
const add = (rel, svg, pngs = []) => files.push([rel, svg, pngs])

/* ---------- Mark (bird only, tight crop) ---------- */
const markOnly = (fill, spark, defs = '') => svgDoc(BOX.w, BOX.h, `<defs>${defs}</defs><g transform="translate(${-BOX.x} ${-BOX.y})">${mark(fill, spark)}</g>`)
add('logo/svg/humo-mark-red.svg', markOnly('url(#g)', K.crimson, redGrad('g')), [['logo/png/humo-mark-red-1024.png', 1024], ['logo/png/humo-mark-red-512.png', 512]])
add('logo/svg/humo-mark-crimson-flat.svg', markOnly(K.crimson, K.crimson), [['logo/png/humo-mark-crimson-flat-1024.png', 1024]])
add('logo/svg/humo-mark-navy.svg', markOnly(K.navy, K.crimson), [['logo/png/humo-mark-navy-1024.png', 1024]])
add('logo/svg/humo-mark-white.svg', markOnly(K.white, K.white), [['logo/png/humo-mark-white-1024.png', 1024]])
add('logo/svg/humo-mark-black.svg', markOnly('#000', '#000'), [['logo/png/humo-mark-black-1024.png', 1024]])

/* ---------- App icon (navy tile, red Humo) ---------- */
const iconBody = (rx = 116, scale = 0.88, bg = true) => `<defs>${navyGrad('bg')}${redGrad('g')}<radialGradient id="glow" cx=".5" cy=".46" r=".5"><stop offset="0" stop-color="${K.rose}" stop-opacity=".28"/><stop offset="1" stop-color="${K.rose}" stop-opacity="0"/></radialGradient></defs>${bg ? `<rect width="512" height="512" rx="${rx}" fill="url(#bg)"/><rect width="512" height="512" rx="${rx}" fill="url(#glow)"/>` : ''}<g transform="translate(256 256) scale(${scale}) translate(-256 -${BOX.y + BOX.h / 2 - 6})">${mark('url(#g)', K.sparkLight)}</g>`
const ICON = svgDoc(512, 512, iconBody())
const ICON_SQ = svgDoc(512, 512, iconBody(0))
const ICON_ROUND = svgDoc(512, 512, iconBody(256, 0.8))
add('icon/humo-app-icon.svg', ICON, [['icon/humo-app-icon-1024.png', 1024], ['icon/humo-app-icon-512.png', 512]])
add('icon/humo-app-icon-square.svg', ICON_SQ)
add('icon/humo-app-icon-round.svg', ICON_ROUND)
add('icon/favicon.svg', svgDoc(512, 512, iconBody(116, 1.1)))
add('icon/humo-maskable.svg', svgDoc(512, 512, iconBody(0, 0.74)), [['icon/web/humo-maskable-512.png', 512]])
add('icon/android/adaptive-foreground.svg', svgDoc(432, 432, `<g transform="scale(${432 / 512})">${iconBody(0, 0.62, false)}</g>`), [['icon/android/adaptive-foreground-432.png', 432]])
add('icon/android/adaptive-background.svg', svgDoc(432, 432, `<defs>${navyGrad('bg')}</defs><rect width="432" height="432" fill="url(#bg)"/>`), [['icon/android/adaptive-background-432.png', 432]])
const iconSets = (svgSq, svgRounded, svgRound, prefix = 'icon') => {
  add(`${prefix}/ios/AppIcon.svg`, svgSq, [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024].map((n) => [`${prefix}/ios/AppIcon-${n}.png`, n]))
  add(`${prefix}/android/ic_launcher.svg`, svgRounded, [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].map(([d, n]) => [`${prefix}/android/ic_launcher-${d}-${n}.png`, n]).concat([[`${prefix}/android/play-store-512.png`, 512]]))
  add(`${prefix}/android/ic_launcher_round.svg`, svgRound, [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].map(([d, n]) => [`${prefix}/android/ic_launcher_round-${d}-${n}.png`, n]))
}
iconSets(ICON_SQ, ICON, ICON_ROUND)
add('icon/web/favicon.svg', svgDoc(512, 512, iconBody(116, 1.1)), [['icon/web/favicon-16.png', 16], ['icon/web/favicon-32.png', 32], ['icon/web/favicon-48.png', 48], ['icon/web/icon-192.png', 192], ['icon/web/icon-512.png', 512]])
add('icon/web/apple-touch-icon.svg', ICON_SQ, [['icon/web/apple-touch-icon-180.png', 180]])

/* ---------- Mascot app icon (Humo's face) ---------- */
const faceIcon = (rx, id, pose = { eyes: 'open', beak: 'open' }) => `<defs>${navyGrad('fbg')}<radialGradient id="fglow" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="${K.rose}" stop-opacity=".35"/><stop offset="1" stop-color="${K.rose}" stop-opacity="0"/></radialGradient><clipPath id="fc"><rect width="512" height="512" rx="${rx}"/></clipPath></defs><g clip-path="url(#fc)"><rect width="512" height="512" fill="url(#fbg)"/><rect width="512" height="512" fill="url(#fglow)"/><g transform="translate(-89 6) scale(1.15)">${humo({ ...pose, after: '' }, id)}</g></g>`
add('icon/mascot/humo-mascot-icon.svg', svgDoc(512, 512, faceIcon(116, 'fi1')), [['icon/mascot/humo-mascot-icon-1024.png', 1024], ['icon/mascot/humo-mascot-icon-512.png', 512]])
iconSets(svgDoc(512, 512, faceIcon(0, 'fi2')), svgDoc(512, 512, faceIcon(116, 'fi3')), svgDoc(512, 512, faceIcon(256, 'fi4')), 'icon/mascot')
const moods = { happy: expressions.Happy, wow: expressions.Wow, love: expressions.Love, focused: expressions.Focused, oops: expressions.Oops, sleepy: expressions.Sleepy }
let fi = 10
for (const [k, p] of Object.entries(moods)) add(`icon/mascot/moods/humo-${k}.svg`, svgDoc(512, 512, faceIcon(116, 'fi' + fi++, p)), [[`icon/mascot/moods/humo-${k}-512.png`, 512]])

/* ---------- Seal (round avatar) ---------- */
const sealBody = (s = 0.76) => `<defs>${navyGrad('bg')}${redGrad('g')}<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${K.rose}" stop-opacity=".25"/><stop offset="1" stop-color="${K.rose}" stop-opacity="0"/></radialGradient><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${K.sheen}"/><stop offset="1" stop-color="${K.ruby}"/></linearGradient></defs><circle cx="256" cy="256" r="250" fill="url(#bg)"/><circle cx="256" cy="256" r="250" fill="url(#glow)"/><circle cx="256" cy="256" r="228" fill="none" stroke="url(#ring)" stroke-width="8"/><g transform="translate(256 262) scale(${s}) translate(-256 -${BOX.y + BOX.h / 2})">${mark('url(#g)', K.sparkLight)}</g>`
add('logo/svg/humo-seal.svg', svgDoc(512, 512, sealBody()), [['logo/png/humo-seal-1024.png', 1024], ['logo/png/humo-seal-512.png', 512]])
add('logo/svg/humo-seal-light.svg', svgDoc(512, 512, `<defs>${redGrad('g')}</defs><circle cx="256" cy="256" r="250" fill="#fff"/><circle cx="256" cy="256" r="228" fill="none" stroke="${K.navy}" stroke-width="8"/><g transform="translate(256 262) scale(.76) translate(-256 -${BOX.y + BOX.h / 2})">${mark('url(#g)', K.navy)}</g>`), [['logo/png/humo-seal-light-1024.png', 1024]])

/* ---------- Lockups ---------- */
function horizontal(humoFill, aiFill, markFill, sparkFill, defs = '') {
  const H = 200, s = H / BOX.h, size = (H * 0.5) / capHeight(1)
  const humo = text('Humo', 0, 0, size), space = text(' ', 0, 0, size).width * 0.8, ai = text('AI', 0, 0, size)
  const gap = H * 0.2, pad = H * 0.25
  const tx = pad + BOX.w * s + gap, base = pad + H / 2 + capHeight(size) / 2 + 4
  const W = Math.ceil(tx + humo.width + space + ai.width + pad), HH = H + pad * 2
  const h = text('Humo', tx, base, size), a = text('AI', tx + humo.width + space, base, size)
  return svgDoc(W, HH, `<defs>${defs}</defs><g transform="translate(${pad} ${pad}) scale(${s}) translate(${-BOX.x} ${-BOX.y})">${mark(markFill, sparkFill)}</g><path d="${h.d}" fill="${humoFill}"/><path d="${a.d}" fill="${aiFill}"/>`)
}
function stacked(humoFill, aiFill, markFill, sparkFill, defs = '') {
  const H = 260, s = H / BOX.h, size = H * 0.36 / capHeight(1)
  const humo = text('Humo', 0, 0, size), space = text(' ', 0, 0, size).width * 0.8, ai = text('AI', 0, 0, size)
  const tw = humo.width + space + ai.width, pad = H * 0.2
  const W = Math.ceil(Math.max(tw, BOX.w * s) + pad * 2), gap = H * 0.14
  const base = pad + H + gap + capHeight(size)
  const HH = Math.ceil(base + pad + 6), x0 = (W - tw) / 2
  const h = text('Humo', x0, base, size), a = text('AI', x0 + humo.width + space, base, size)
  return svgDoc(W, HH, `<defs>${defs}</defs><g transform="translate(${(W - BOX.w * s) / 2} ${pad}) scale(${s}) translate(${-BOX.x} ${-BOX.y})">${mark(markFill, sparkFill)}</g><path d="${h.d}" fill="${humoFill}"/><path d="${a.d}" fill="${aiFill}"/>`)
}
const lockups = {
  'on-dark': [K.white, 'url(#t)', 'url(#g)', K.sparkLight, redGrad('g') + textRed('t')],
  'on-light': [K.navy, K.crimson, 'url(#g)', K.crimson, redGrad('g')],
  'navy': [K.navy, K.navy, K.navy, K.navy],
  'white': [K.white, K.white, K.white, K.white],
  'crimson': [K.crimson, K.crimson, K.crimson, K.crimson],
}
for (const [name, a] of Object.entries(lockups)) {
  add(`logo/svg/humo-ai-horizontal-${name}.svg`, horizontal(...a), [[`logo/png/humo-ai-horizontal-${name}-2000.png`, 2000], [`logo/png/humo-ai-horizontal-${name}-800.png`, 800]])
  add(`logo/svg/humo-ai-stacked-${name}.svg`, stacked(...a), [[`logo/png/humo-ai-stacked-${name}-1200.png`, 1200]])
}
{
  const size = 200, h = text('Humo', 20, 20 + capHeight(size), size), sp = text(' ', 0, 0, size).width * 0.8
  const a = text('AI', 20 + h.width + sp, 20 + capHeight(size), size)
  const W = Math.ceil(40 + h.width + sp + a.width), HH = Math.ceil(40 + capHeight(size) + 6)
  add('logo/svg/humo-ai-wordmark-on-dark.svg', svgDoc(W, HH, `<defs>${textRed('t')}</defs><path d="${h.d}" fill="${K.white}"/><path d="${a.d}" fill="url(#t)"/>`), [['logo/png/humo-ai-wordmark-on-dark-1600.png', 1600]])
  add('logo/svg/humo-ai-wordmark-on-light.svg', svgDoc(W, HH, `<path d="${h.d}" fill="${K.navy}"/><path d="${a.d}" fill="${K.crimson}"/>`), [['logo/png/humo-ai-wordmark-on-light-1600.png', 1600]])
}

/* ---------- Mascot ---------- */
let mi = 0
for (const [k, p] of Object.entries(turnaround)) add(`mascot/svg/turnaround/humo-${k.toLowerCase().replace(/\W+/g, '-')}.svg`, svgDoc(600, 600, humo(p, 'h' + mi++), `Humo — ${k}`), [[`mascot/png/turnaround/humo-${k.toLowerCase().replace(/\W+/g, '-')}-1200.png`, 1200]])
for (const [k, p] of Object.entries(poses)) add(`mascot/svg/poses/humo-${k}.svg`, svgDoc(600, 600, humo(p, 'h' + mi++), `Humo — ${p.title}`), [[`mascot/png/poses/humo-${k}-1200.png`, 1200], [`mascot/png/poses/humo-${k}-512.png`, 512]])
for (const [k, p] of Object.entries(expressions)) add(`mascot/svg/expressions/humo-${k.toLowerCase()}.svg`, svgDoc(600, 600, humo(p, 'h' + mi++), `Humo — ${k}`), [[`mascot/png/expressions/humo-${k.toLowerCase()}-1024.png`, 1024]])
// Telegram sticker set: 512 x 512, transparent, mascot only
for (const [k, p] of Object.entries({ ...poses, ...Object.fromEntries(Object.entries(expressions).map(([a, b]) => [a.toLowerCase(), b])) })) add(`social/telegram/stickers/humo-${k}.svg`, svgDoc(512, 512, `<g transform="scale(0.8533)">${humo(p, 'st' + mi++)}</g>`), [[`social/telegram/stickers/humo-${k}-512.png`, 512]])

/* ---------- Social ---------- */
const pattern = (w, h, op = 0.08) => {
  let s = ''
  for (let y = 40, r = 0; y < h; y += 90, r++) for (let x = (r % 2) * 45 + 30; x < w; x += 90) s += `<path d="M${x} ${y - 9} Q${x + 1.6} ${y - 1.6} ${x + 9} ${y} Q${x + 1.6} ${y + 1.6} ${x} ${y + 9} Q${x - 1.6} ${y + 1.6} ${x - 9} ${y} Q${x - 1.6} ${y - 1.6} ${x} ${y - 9}Z"/>`
  return `<g fill="${K.sheen}" opacity="${op}">${s}</g>`
}
const bgDark = (w, h, gx = 0.5, gy = 0.38) => `<defs>${navyGrad('bg')}${redGrad('g')}${textRed('t')}<radialGradient id="glow" cx="${gx}" cy="${gy}" r=".55"><stop offset="0" stop-color="${K.rose}" stop-opacity=".3"/><stop offset="1" stop-color="${K.rose}" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/>${pattern(w, h)}<rect width="${w}" height="${h}" fill="url(#glow)"/>`
add('social/instagram/humo-instagram-profile.svg', svgDoc(1080, 1080, `<g transform="scale(${1080 / 512})">${sealBody(0.76)}</g>`), [['social/instagram/humo-instagram-profile-1080.png', 1080]])
add('social/instagram/humo-instagram-profile-mascot.svg', svgDoc(1080, 1080, `<g transform="scale(${1080 / 512})">${faceIcon(256, 'ipm')}</g>`), [['social/instagram/humo-instagram-profile-mascot-1080.png', 1080]])
add('social/telegram/humo-telegram-avatar.svg', svgDoc(640, 640, `<defs>${navyGrad('bg')}${redGrad('g')}<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${K.rose}" stop-opacity=".3"/><stop offset="1" stop-color="${K.rose}" stop-opacity="0"/></radialGradient></defs><rect width="640" height="640" fill="url(#bg)"/><rect width="640" height="640" fill="url(#glow)"/><g transform="translate(320 322) scale(1.04) translate(-256 -${BOX.y + BOX.h / 2})">${mark('url(#g)', K.sparkLight)}</g>`), [['social/telegram/humo-telegram-avatar-640.png', 640]])
const lockupInline = (x, y, H, center = false) => {
  const s = H / BOX.h, size = (H * 0.5) / capHeight(1)
  const hw = text('Humo', 0, 0, size).width, sp = text(' ', 0, 0, size).width * 0.8, aw = text('AI', 0, 0, size).width
  const total = BOX.w * s + H * 0.2 + hw + sp + aw
  const x0 = center ? x - total / 2 : x, tx = x0 + BOX.w * s + H * 0.2, base = y + H / 2 + capHeight(size) / 2 + H * 0.02
  return `<g transform="translate(${x0} ${y}) scale(${s}) translate(${-BOX.x} ${-BOX.y})">${mark('url(#g)', K.sparkLight)}</g><path d="${text('Humo', tx, base, size).d}" fill="${K.white}"/><path d="${text('AI', tx + hw + sp, base, size).d}" fill="url(#t)"/>`
}
const lines = (arr, x, y, size, fill, lh = 1.12, center = false) => arr.map((t, i) => {
  const o = text(t, 0, 0, size, -0.03)
  return `<path d="${text(t, center ? x - o.width / 2 : x, y + i * size * lh, size, -0.03).d}" fill="${fill}"/>`
}).join('')
const mascotAt = (pose, x, y, s, id) => `<g transform="translate(${x} ${y}) scale(${s})">${humo(pose, id)}</g>`
add('social/instagram/humo-instagram-post-template.svg', svgDoc(1080, 1350, bgDark(1080, 1350, 0.7, 0.72) +
  lockupInline(80, 80, 74) +
  lines(['Tip of the day'], 80, 330, 40, K.sheen) +
  lines(['Read the question', 'before the passage.'], 80, 430, 84, K.white) +
  lines(['Swipe for the full method →'], 80, 700, 36, '#C9D3E3') +
  mascotAt(poses.explain, 470, 740, 1.0, 'p1') +
  `<rect x="80" y="1210" width="200" height="6" rx="3" fill="${K.rose}"/>`), [['social/instagram/humo-instagram-post-template-1080x1350.png', 1080]])
add('social/instagram/humo-instagram-story-template.svg', svgDoc(1080, 1920, bgDark(1080, 1920, 0.5, 0.36) +
  lockupInline(540, 140, 80, true) +
  mascotAt(poses.celebrate, 210, 360, 1.1, 's1') +
  lines(['New practice test', 'is live!'], 540, 1180, 92, K.white, 1.12, true) +
  lines(['Practice Test 14 · Reading & Writing'], 540, 1420, 40, K.sheen, 1.1, true) +
  `<defs><linearGradient id="btn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${K.rose}"/><stop offset="1" stop-color="${K.ruby}"/></linearGradient></defs><rect x="300" y="1600" width="480" height="120" rx="60" fill="url(#btn)"/>` + lines(['Start now'], 540, 1678, 48, K.white, 1, true)), [['social/instagram/humo-instagram-story-template-1080x1920.png', 1080]])
add('social/telegram/humo-telegram-post-cover.svg', svgDoc(1280, 720, bgDark(1280, 720, 0.78, 0.5) +
  lockupInline(80, 70, 64) +
  lines(['SAT Math in 5 minutes:'], 80, 300, 46, K.sheen) +
  lines(['Systems of equations', 'with Desmos'], 80, 400, 76, K.white) +
  mascotAt(poses.thinking, 780, 130, 0.95, 't1')), [['social/telegram/humo-telegram-post-cover-1280x720.png', 1280]])
add('social/web/humo-link-preview.svg', svgDoc(1200, 630, bgDark(1200, 630, 0.5, 0.4) +
  lockupInline(600, 150, 140, true) +
  lines(['Your AI tutor for the Digital SAT'], 600, 450, 52, K.white, 1, true)), [['social/web/humo-link-preview-1200x630.png', 1200]])

/* ---------- Write ---------- */
for (const [rel, svg] of files) { mkdirSync(dirname(join(OUT, rel)), { recursive: true }); writeFileSync(join(OUT, rel), svg) }
const browser = await chromium.launch()
const page = await browser.newPage()
let n = 0
for (const [, svg, pngs] of files) {
  for (const [out, width] of pngs) {
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number)
    const height = Math.round((width * h) / w)
    await page.setViewportSize({ width, height })
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`)
    mkdirSync(dirname(join(OUT, out)), { recursive: true })
    await page.screenshot({ path: join(OUT, out), omitBackground: true }); n++
  }
}
await browser.close()
console.log(`wrote ${files.length} SVGs and ${n} PNGs to ${OUT}`)
