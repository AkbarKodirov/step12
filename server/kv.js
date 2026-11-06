/**
 * Tiny key–value store for users and student progress.
 * - With DATABASE_URL (any Postgres, e.g. a free Neon or Supabase database) data survives restarts and redeploys.
 * - Without it, data is kept in JSON files under server/data/kv — fine locally, but Render's free disk is wiped on every restart.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'data', 'kv')
let pool = null
let ready = null

if (process.env.DATABASE_URL) {
  const { default: pg } = await import('pg')
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false }, max: 4 })
  ready = pool.query('create table if not exists kv (ns text not null, k text not null, v jsonb not null, updated_at timestamptz not null default now(), primary key (ns, k))')
}

const file = (ns, k) => join(DIR, ns, createHash('sha1').update(k).digest('hex') + '.json')

export const kvBackend = pool ? 'postgres' : 'files'

export async function kvGet(ns, k) {
  if (pool) {
    await ready
    const r = await pool.query('select v from kv where ns = $1 and k = $2', [ns, k])
    return r.rows[0]?.v ?? null
  }
  const f = file(ns, k)
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null
}

export async function kvSet(ns, k, v) {
  if (pool) {
    await ready
    await pool.query('insert into kv (ns, k, v, updated_at) values ($1, $2, $3, now()) on conflict (ns, k) do update set v = excluded.v, updated_at = now()', [ns, k, JSON.stringify(v)])
    return
  }
  mkdirSync(join(DIR, ns), { recursive: true })
  writeFileSync(file(ns, k), JSON.stringify(v))
}

export async function kvDel(ns, k) {
  if (pool) {
    await ready
    await pool.query('delete from kv where ns = $1 and k = $2', [ns, k])
    return
  }
  rmSync(file(ns, k), { force: true })
}

export async function kvAll(ns) {
  if (pool) {
    await ready
    return (await pool.query('select v from kv where ns = $1', [ns])).rows.map((r) => r.v)
  }
  const d = join(DIR, ns)
  return existsSync(d) ? readdirSync(d).map((f) => JSON.parse(readFileSync(join(d, f), 'utf8'))) : []
}
