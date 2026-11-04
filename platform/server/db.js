/* oddball database layer.
 * Production: real Postgres via DATABASE_URL (Neon, Supabase, Render Postgres…).
 * Development: embedded Postgres (PGlite) in ./data — same SQL, no install needed.
 * On Render without DATABASE_URL the embedded database lives on a disk that is wiped on every
 * deploy/restart; the admin overview warns about this loudly. */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { MIGRATIONS } from './migrations.js';

let impl = null;

export async function initDb() {
  if (impl) return impl;
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false }, max: 6 });
    impl = {
      kind: 'postgres',
      query: (sql, params) => pool.query(sql, params),
      tx: async (fn) => {
        const c = await pool.connect();
        try { await c.query('BEGIN'); const r = await fn({ query: (s, p) => c.query(s, p).then((x) => x.rows) }); await c.query('COMMIT'); return r; }
        catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
      },
    };
  } else {
    if (process.env.RENDER) {
      // the embedded database needs about 1 GB to start; Render's free instance has 512 MB and would crash-loop
      const e = new Error('DATABASE_URL is not set. Add it in Render → Environment. The embedded database is for local development only.');
      e.fatal = true; throw e;
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR || path.resolve('data/pglite');
    fs.mkdirSync(dir, { recursive: true });
    const db = new PGlite(dir);
    await db.waitReady;
    impl = {
      kind: 'embedded',
      query: (sql, params) => db.query(sql, params),
      tx: (fn) => db.transaction((t) => fn({ query: (s, p) => t.query(s, p).then((x) => x.rows) })),
    };
  }
  await migrate();
  return impl;
}

export const q = async (sql, params = []) => (await impl.query(sql, params)).rows;
export const one = async (sql, params = []) => (await q(sql, params))[0] || null;
export const tx = (fn) => impl.tx(fn);
export function storageInfo() {
  const persistent = impl.kind === 'postgres' || !process.env.RENDER;
  return { kind: impl.kind, persistent, warning: persistent ? null : 'Data is stored on Render’s temporary disk and will be lost on the next deploy or restart. Add a DATABASE_URL to keep accounts and settings.' };
}

/* Additive, versioned migrations. Each runs once, inside a transaction. Nothing is ever dropped. */
async function migrate() {
  await impl.query('create table if not exists schema_migrations (id int primary key, name text not null, applied_at timestamptz not null default now())');
  const done = new Set((await impl.query('select id from schema_migrations')).rows.map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await impl.tx(async (t) => {
      for (const stmt of m.sql.split(';').map((s) => s.trim()).filter(Boolean)) await t.query(stmt);
      await t.query('insert into schema_migrations (id, name) values ($1, $2)', [m.id, m.name]);
    });
    console.log(`db: applied migration ${m.id} ${m.name}`);
  }
}
