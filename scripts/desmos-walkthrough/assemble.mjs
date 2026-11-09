// Builds the mp4s from frames + per-step audio. Usage: node assemble.mjs <framesDir> <audioDir> <outDir>
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const [frames, audio, out] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const meta = JSON.parse(fs.readFileSync(path.join(frames, 'meta.json'), 'utf8'))
const dur = JSON.parse(fs.readFileSync(path.join(audio, 'durations.json'), 'utf8'))
const PAD = 0.55 // quiet beat after every step
const byStep = {}
for (const m of meta) (byStep[`${m.seg}-${String(m.step).padStart(2, '0')}`] ||= []).push(m)

const vlist = [], alist = [], chapters = []
let t = 0
const segSeen = new Set()
for (const [key, ms] of Object.entries(byStep)) {
  const seg = ms[0].seg
  if (!segSeen.has(seg)) { segSeen.add(seg); chapters.push({ id: seg, t: Math.round(t) }) }
  const d = dur[key] + PAD
  const total = ms.reduce((a, m) => a + m.chars, 0)
  ms.forEach((m, i) => {
    const part = i === ms.length - 1 ? d - (ms.slice(0, -1).reduce((a, x) => a + (d * x.chars) / total, 0)) : (d * m.chars) / total
    vlist.push(`file '${path.resolve(frames, m.file)}'\nduration ${part.toFixed(3)}`)
  })
  vlist.push() // keep order
  const wav = path.join(audio, key + '.wav')
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(audio, key + '.mp3'), '-ar', '44100', '-ac', '1', '-af', `apad=pad_dur=${PAD}`, wav])
  alist.push(`file '${path.resolve(wav)}'`)
  t += d
}
const last = meta[meta.length - 1].file
vlist.push(`file '${path.resolve(frames, last)}'`)
fs.writeFileSync(path.join(out, 'v.txt'), vlist.join('\n'))
fs.writeFileSync(path.join(out, 'a.txt'), alist.join('\n'))
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(out, 'a.txt'), '-c:a', 'aac', '-b:a', '64k', path.join(out, 'audio.m4a')])
const common = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(out, 'v.txt'), '-i', path.join(out, 'audio.m4a'), '-r', '25', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'stillimage', '-crf', '27', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-shortest']
execFileSync('ffmpeg', [...common, '-vf', 'scale=1920:1080:flags=lanczos', path.join(out, 'desmos-walkthrough-1080p.mp4')])
execFileSync('ffmpeg', [...common, '-vf', 'scale=1280:720:flags=lanczos', path.join(out, 'desmos-walkthrough-720p.mp4')])
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(frames, meta[0].file), '-vf', 'scale=1280:720', '-q:v', '3', path.join(out, 'desmos-walkthrough-poster.jpg')])
fs.writeFileSync(path.join(out, 'chapters.json'), JSON.stringify({ duration: Math.round(t), chapters }, null, 1))
console.log('duration', Math.round(t), 's', chapters.length, 'chapters')
