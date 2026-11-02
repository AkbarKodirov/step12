// Builds every Humo AI brand file (SVG + PNG) into ../ (the brand/ folder).
// Run from brand/source:  npm i --no-save opentype.js playwright && node build.mjs
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'
import { crest } from './marks.mjs'
import { text, capHeight } from './wm.mjs'
import { humo, poses, expressions } from './mascot.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = process.env.OUT || join(here, '..')
export const COLORS = {
  navy: '#03244A', midnight: '#03142C', navyLight: '#0E2F5C',
  gold: '#F2B630', goldLight: '#FFE29A', goldDeep: '#C98A12', goldInk: '#8A5E00',
  crimson: '#BB0937', cream: '#F6F7FB', slate: '#56657A', white: '#FFFFFF',
}
const K = COLORS
const M = crest()
const BOX = { x: 70, y: 99, w: 372, h: 371 } // the mark's bounds on its 512 grid

const goldGrad = (id, y1 = BOX.y, y2 = BOX.y + BOX.h) => `<linearGradient id="${id}" x1="0" y1="${y1}" x2="0" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${K.goldLight}"/><stop offset=".55" stop-color="${K.gold}"/><stop offset="1" stop-color="${K.goldDeep}"/></linearGradient>`
const navyGrad = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${K.navyLight}"/><stop offset="1" stop-color="${K.midnight}"/></linearGradient>`
const eyeHole = () => { const [x, y, r] = M.eye; return `M${x} ${y - r} a${r} ${r} 0 1 1 -0.1 0Z` }

/** The Humo mark on its 512 grid. fill = colour or url(); spark = colour for the AI spark. */
function mark(fill, spark = fill) {
  return `<path d="${M.body}" fill="${fill}"/><path d="${M.head} ${eyeHole()}" fill="${fill}" fill-rule="evenodd"/><path d="${M.spark}" fill="${spark}"/>`
}
const svgDoc = (w, h, body, title = 'Humo AI') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${title}</title>${body}</svg>\n`

const files = [] // [relPath, svg, [pngSizes as [name, width]]]
const add = (rel, svg, pngs = []) => files.push([rel, svg, pngs])

/* ---------- Mark (bird only, tight crop) ---------- */
const markOnly = (fill, spark, defs = '') => svgDoc(BOX.w, BOX.h, `<defs>${defs}</defs><g transform="translate(${-BOX.x} ${-BOX.y})">${mark(fill, spark)}</g>`)
add('logo/svg/humo-mark-gold.svg', markOnly('url(#g)', 'url(#g)', goldGrad('g')), [['logo/png/humo-mark-gold-1024.png', 1024], ['logo/png/humo-mark-gold-512.png', 512]])
add('logo/svg/humo-mark-gold-flat.svg', markOnly(K.gold, K.gold), [['logo/png/humo-mark-gold-flat-1024.png', 1024]])
add('logo/svg/humo-mark-navy.svg', markOnly(K.navy, K.navy), [['logo/png/humo-mark-navy-1024.png', 1024]])
add('logo/svg/humo-mark-white.svg', markOnly(K.white, K.white), [['logo/png/humo-mark-white-1024.png', 1024]])
add('logo/svg/humo-mark-black.svg', markOnly('#000', '#000'), [['logo/png/humo-mark-black-1024.png', 1024]])

/* ---------- App icon (navy tile) ---------- */
const iconBody = (rx = 116, scale = 1) => `<defs>${navyGrad('bg')}${goldGrad('g')}</defs><rect width="512" height="512" rx="${rx}" fill="url(#bg)"/><g transform="translate(256 256) scale(${scale}) translate(-256 -${BOX.y + BOX.h / 2 - 6})">${mark('url(#g)', '#FFF3C9')}</g>`
const icon = svgDoc(512, 512, iconBody(116, 0.88))
add('icon/humo-app-icon.svg', icon, [['icon/humo-app-icon-1024.png', 1024], ['icon/humo-app-icon-512.png', 512], ['icon/humo-app-icon-192.png', 192]])
add('icon/humo-app-icon-square.svg', svgDoc(512, 512, iconBody(0, 0.88)), [['icon/apple-touch-icon-180.png', 180]])
add('icon/humo-maskable.svg', svgDoc(512, 512, iconBody(0, 0.78)), [['icon/humo-maskable-512.png', 512]])
add('icon/favicon.svg', svgDoc(512, 512, iconBody(116, 1.12)), [['icon/favicon-32.png', 32], ['icon/favicon-16.png', 16]])

/* ---------- Seal (round avatar) ---------- */
const sealBody = (s = 0.78) => `<defs>${goldGrad('g', 6, 506)}</defs><circle cx="256" cy="256" r="250" fill="url(#g)"/><circle cx="256" cy="256" r="226" fill="none" stroke="${K.navy}" stroke-width="7"/><g transform="translate(256 262) scale(${s}) translate(-256 -${BOX.y + BOX.h / 2})">${mark(K.navy)}</g>`
add('logo/svg/humo-seal.svg', svgDoc(512, 512, sealBody()), [['logo/png/humo-seal-1024.png', 1024], ['logo/png/humo-seal-512.png', 512]])
add('logo/svg/humo-seal-navy.svg', svgDoc(512, 512, `<defs>${navyGrad('bg')}${goldGrad('g')}</defs><circle cx="256" cy="256" r="250" fill="url(#bg)"/><circle cx="256" cy="256" r="226" fill="none" stroke="${K.gold}" stroke-width="7"/><g transform="translate(256 262) scale(.78) translate(-256 -${BOX.y + BOX.h / 2})">${mark('url(#g)', '#FFF3C9')}</g>`), [['logo/png/humo-seal-navy-1024.png', 1024]])

/* ---------- Lockups ---------- */
// Horizontal: mark height H; caps = 0.5H; gap = 0.2H. Clear space = height of the head-to-spark (0.25H) on every side.
function horizontal(humoFill, aiFill, markFill, sparkFill, bg, defs = '') {
  const H = 200, s = H / BOX.h, size = (H * 0.5) / capHeight(1)
  const humo = text('Humo', 0, 0, size), space = text(' ', 0, 0, size).width * 0.8, ai = text('AI', 0, 0, size)
  const gap = H * 0.2, pad = H * 0.25
  const tx = pad + BOX.w * s + gap, base = pad + H / 2 + capHeight(size) / 2 + 4
  const W = Math.ceil(tx + humo.width + space + ai.width + pad), HH = H + pad * 2
  const h = text('Humo', tx, base, size), a = text('AI', tx + humo.width + space, base, size)
  return svgDoc(W, HH, `<defs>${defs}</defs>${bg ? `<rect width="${W}" height="${HH}" fill="${bg}"/>` : ''}<g transform="translate(${pad} ${pad}) scale(${s}) translate(${-BOX.x} ${-BOX.y})">${mark(markFill, sparkFill)}</g><path d="${h.d}" fill="${humoFill}"/><path d="${a.d}" fill="${aiFill}"/>`)
}
function stacked(humoFill, aiFill, markFill, sparkFill, bg, defs = '') {
  const H = 260, s = H / BOX.h, size = H * 0.36 / capHeight(1)
  const humo = text('Humo', 0, 0, size), space = text(' ', 0, 0, size).width * 0.8, ai = text('AI', 0, 0, size)
  const tw = humo.width + space + ai.width, pad = H * 0.2
  const W = Math.ceil(Math.max(tw, BOX.w * s) + pad * 2), gap = H * 0.14
  const base = pad + H + gap + capHeight(size)
  const HH = Math.ceil(base + pad + 6), x0 = (W - tw) / 2
  const h = text('Humo', x0, base, size), a = text('AI', x0 + humo.width + space, base, size)
  return svgDoc(W, HH, `<defs>${defs}</defs>${bg ? `<rect width="${W}" height="${HH}" fill="${bg}"/>` : ''}<g transform="translate(${(W - BOX.w * s) / 2} ${pad}) scale(${s}) translate(${-BOX.x} ${-BOX.y})">${mark(markFill, sparkFill)}</g><path d="${h.d}" fill="${humoFill}"/><path d="${a.d}" fill="${aiFill}"/>`)
}
const textGold = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.goldLight}"/><stop offset=".55" stop-color="${K.gold}"/><stop offset="1" stop-color="${K.goldDeep}"/></linearGradient>`
const lockups = {
  'on-dark': ['url(#t)', K.white, 'url(#g)', 'url(#g)', null, goldGrad('g') + textGold('t')],
  'on-light': [K.navy, K.goldDeep, 'url(#g)', 'url(#g)', null, goldGrad('g')],
  'navy': [K.navy, K.navy, K.navy, K.navy, null],
  'white': [K.white, K.white, K.white, K.white, null],
  'gold': [K.gold, K.gold, K.gold, K.gold, null],
}
for (const [name, a] of Object.entries(lockups)) {
  add(`logo/svg/humo-ai-horizontal-${name}.svg`, horizontal(...a), [[`logo/png/humo-ai-horizontal-${name}-2000.png`, 2000], [`logo/png/humo-ai-horizontal-${name}-800.png`, 800]])
  add(`logo/svg/humo-ai-stacked-${name}.svg`, stacked(...a), [[`logo/png/humo-ai-stacked-${name}-1200.png`, 1200]])
}
// Wordmark only
{
  const size = 200, h = text('Humo', 20, 20 + capHeight(size), size), sp = text(' ', 0, 0, size).width * 0.8
  const a = text('AI', 20 + h.width + sp, 20 + capHeight(size), size)
  const W = Math.ceil(40 + h.width + sp + a.width), HH = Math.ceil(40 + capHeight(size) + 6)
  add('logo/svg/humo-ai-wordmark-on-dark.svg', svgDoc(W, HH, `<defs>${textGold('t')}</defs><path d="${h.d}" fill="url(#t)"/><path d="${a.d}" fill="${K.white}"/>`), [['logo/png/humo-ai-wordmark-on-dark-1600.png', 1600]])
  add('logo/svg/humo-ai-wordmark-on-light.svg', svgDoc(W, HH, `<path d="${h.d}" fill="${K.navy}"/><path d="${a.d}" fill="${K.goldDeep}"/>`), [['logo/png/humo-ai-wordmark-on-light-1600.png', 1600]])
}

/* ---------- Mascot ---------- */
let mi = 0
for (const [k, p] of Object.entries(poses)) {
  add(`mascot/svg/humo-${k}.svg`, svgDoc(400, 400, humo(p, 'h' + mi++), `Humo — ${p.title}`), [[`mascot/png/humo-${k}-1024.png`, 1024]])
}
for (const [k, p] of Object.entries(expressions)) {
  add(`mascot/svg/expressions/humo-${k.toLowerCase()}.svg`, svgDoc(400, 400, humo(p, 'h' + mi++), `Humo — ${k}`), [[`mascot/png/expressions/humo-${k.toLowerCase()}-512.png`, 512]])
}

/* ---------- Social ---------- */
const pattern = (w, h, op = 0.07) => {
  // a quiet field of AI sparks, the brand's graphic element
  let s = ''
  for (let y = 40, r = 0; y < h; y += 90, r++) for (let x = (r % 2) * 45 + 30; x < w; x += 90) s += `<path d="M${x} ${y - 9} Q${x + 1.6} ${y - 1.6} ${x + 9} ${y} Q${x + 1.6} ${y + 1.6} ${x} ${y + 9} Q${x - 1.6} ${y + 1.6} ${x - 9} ${y} Q${x - 1.6} ${y - 1.6} ${x} ${y - 9}Z"/>`
  return `<g fill="${K.gold}" opacity="${op}">${s}</g>`
}
const bgDark = (w, h) => `<defs>${navyGrad('bg')}<radialGradient id="glow" cx=".5" cy=".38" r=".55"><stop offset="0" stop-color="${K.gold}" stop-opacity=".22"/><stop offset="1" stop-color="${K.gold}" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/>${pattern(w, h)}<rect width="${w}" height="${h}" fill="url(#glow)"/>`
// Instagram + Telegram profile pictures (circle-safe)
add('social/instagram/humo-instagram-profile.svg', svgDoc(1080, 1080, `<g transform="scale(${1080 / 512})">${sealBody(0.78)}</g>`), [['social/instagram/humo-instagram-profile-1080.png', 1080]])
add('social/telegram/humo-telegram-avatar.svg', svgDoc(640, 640, `<defs>${navyGrad('bg')}${goldGrad('g')}</defs><rect width="640" height="640" fill="url(#bg)"/><g transform="translate(320 322) scale(1.08) translate(-256 -${BOX.y + BOX.h / 2})">${mark('url(#g)', '#FFF3C9')}</g>`), [['social/telegram/humo-telegram-avatar-640.png', 640]])
// Templates: post 1080x1350, story 1080x1920, Telegram post cover 1280x720, link preview 1200x630
const lockupInline = (x, y, H, center = false) => {
  const s = H / BOX.h, size = (H * 0.5) / capHeight(1)
  const hw = text('Humo', 0, 0, size).width, sp = text(' ', 0, 0, size).width * 0.8, aw = text('AI', 0, 0, size).width
  const total = BOX.w * s + H * 0.2 + hw + sp + aw
  const x0 = center ? x - total / 2 : x, tx = x0 + BOX.w * s + H * 0.2, base = y + H / 2 + capHeight(size) / 2 + H * 0.02
  return `<g transform="translate(${x0} ${y}) scale(${s}) translate(${-BOX.x} ${-BOX.y})">${mark('url(#g)', '#FFF3C9')}</g><path d="${text('Humo', tx, base, size).d}" fill="url(#g)"/><path d="${text('AI', tx + hw + sp, base, size).d}" fill="${K.white}"/>`
}
const lines = (arr, x, y, size, fill, lh = 1.12, anchorCenter = false) => arr.map((t, i) => {
  const o = text(t, 0, 0, size, -0.03)
  return `<path d="${text(t, anchorCenter ? x - o.width / 2 : x, y + i * size * lh, size, -0.03).d}" fill="${fill}"/>`
}).join('')
const gd = `<defs>${textGold('g')}</defs>`
const mascotAt = (pose, x, y, s, id) => `<g transform="translate(${x} ${y}) scale(${s})">${humo(poses[pose], id)}</g>`
add('social/instagram/humo-instagram-post-template.svg', svgDoc(1080, 1350, bgDark(1080, 1350) + gd +
  lockupInline(80, 80, 74) +
  lines(['Tip of the day'], 80, 330, 40, K.gold) +
  lines(['Read the question', 'before the passage.'], 80, 430, 84, K.white) +
  lines(['Swipe for the full method →'], 80, 700, 36, '#C9D3E3') +
  mascotAt('hello', 560, 760, 1.25, 'p1') +
  `<rect x="80" y="1210" width="200" height="6" rx="3" fill="${K.gold}"/>`), [['social/instagram/humo-instagram-post-template-1080x1350.png', 1080]])
add('social/instagram/humo-instagram-story-template.svg', svgDoc(1080, 1920, bgDark(1080, 1920) + gd +
  lockupInline(540, 140, 80, true) +
  mascotAt('celebrate', 240, 420, 1.5, 's1') +
  lines(['New practice test', 'is live!'], 540, 1180, 92, K.white, 1.12, true) +
  lines(['Practice Test 14 · Reading & Writing'], 540, 1420, 40, K.gold, 1.1, true) +
  `<rect x="300" y="1600" width="480" height="120" rx="60" fill="url(#g)"/>` + lines(['Start now'], 540, 1678, 48, K.navy, 1, true)), [['social/instagram/humo-instagram-story-template-1080x1920.png', 1080]])
add('social/telegram/humo-telegram-post-cover.svg', svgDoc(1280, 720, bgDark(1280, 720) + gd +
  lockupInline(80, 70, 64) +
  lines(['SAT Math in 5 minutes:'], 80, 300, 46, K.gold) +
  lines(['Systems of equations', 'with Desmos'], 80, 400, 76, K.white) +
  mascotAt('thinking', 820, 230, 1.1, 't1')), [['social/telegram/humo-telegram-post-cover-1280x720.png', 1280]])
add('social/web/humo-link-preview.svg', svgDoc(1200, 630, bgDark(1200, 630) + gd +
  lockupInline(600, 150, 140, true) +
  lines(['Your AI tutor for the Digital SAT'], 600, 450, 52, K.white, 1, true)), [['social/web/humo-link-preview-1200x630.png', 1200]])

/* ---------- Write ---------- */
for (const [rel, svg] of files) { mkdirSync(dirname(join(OUT, rel)), { recursive: true }); writeFileSync(join(OUT, rel), svg) }
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [rel, svg, pngs] of files) {
  for (const [out, width] of pngs) {
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number)
    const height = Math.round((width * h) / w)
    await page.setViewportSize({ width, height })
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`)
    mkdirSync(dirname(join(OUT, out)), { recursive: true })
    await page.screenshot({ path: join(OUT, out), omitBackground: true })
  }
}
await browser.close()
console.log(`wrote ${files.length} SVGs and ${files.reduce((n, f) => n + f[2].length, 0)} PNGs to ${OUT}`)
