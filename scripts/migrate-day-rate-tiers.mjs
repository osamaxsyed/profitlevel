#!/usr/bin/env node
// One-time migration: add jobs.day_units, seed settings.day_rate_targets,
// and backfill day_units from hours_log using the agreed rule:
//   - A job is a "project" (split per-entry into day-units) only if it has
//     >= 3 full-tier entries (each >= 5h). Frank Maurer is the only one today.
//   - Otherwise the job collapses to a SINGLE tier derived from its total hours
//     (so GC check-ins / stop-bys don't inflate the day-count).
// day_units is stored as JSON e.g. {"full":8,"half":1}. Existing jobs with no
// hours at all are left NULL (untagged) for the user to set later.
import { createClient } from '@libsql/client';

const USER_ID = 'user_39VCh0LoaJ36V134l6aTbTfDVLl';
const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN });

const RATES = { full: 900, half: 475, short: 300, visit: 175 };
const tier = (h) => (h >= 5 ? 'full' : h >= 2.5 ? 'half' : h > 1 ? 'short' : 'visit');

async function run() {
  // 1. Add the column (ignore "duplicate column" if re-run)
  try {
    await db.execute('ALTER TABLE jobs ADD COLUMN day_units TEXT');
    console.log('✓ Added jobs.day_units');
  } catch (e) {
    if (/duplicate column/i.test(e.message)) console.log('• jobs.day_units already exists, skipping');
    else throw e;
  }

  // 2. Seed the tier targets into settings (idempotent upsert)
  const existing = await db.execute({
    sql: 'SELECT id FROM settings WHERE key = ? AND user_id = ?',
    args: ['day_rate_targets', USER_ID],
  });
  const targetsJson = JSON.stringify(RATES);
  if (existing.rows.length) {
    await db.execute({ sql: 'UPDATE settings SET value = ? WHERE key = ? AND user_id = ?', args: [targetsJson, 'day_rate_targets', USER_ID] });
    console.log('• Updated settings.day_rate_targets');
  } else {
    await db.execute({ sql: 'INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?)', args: ['day_rate_targets', targetsJson, USER_ID] });
    console.log('✓ Inserted settings.day_rate_targets');
  }

  // 3. Backfill day_units from hours_log
  const jobs = (await db.execute({ sql: 'SELECT id, hours_spent FROM jobs WHERE user_id = ? ORDER BY id', args: [USER_ID] })).rows;
  const hl = (await db.execute('SELECT job_id, hours FROM hours_log')).rows;
  const byJob = {};
  for (const e of hl) (byJob[e.job_id] = byJob[e.job_id] || []).push(e.hours);

  const stmts = [];
  let tagged = 0, skipped = 0;
  for (const j of jobs) {
    const entries = byJob[j.id] || (j.hours_spent > 0 ? [j.hours_spent] : []);
    if (entries.length === 0) { skipped++; continue; } // leave NULL

    const fullCount = entries.filter((h) => h >= 5).length;
    const isProject = fullCount >= 3;
    const units = { full: 0, half: 0, short: 0, visit: 0 };
    if (isProject) {
      for (const h of entries) units[tier(h)]++;
    } else {
      units[tier(entries.reduce((a, b) => a + b, 0))]++;
    }
    // strip zero tiers for compactness
    const compact = Object.fromEntries(Object.entries(units).filter(([, c]) => c > 0));
    stmts.push({ sql: 'UPDATE jobs SET day_units = ? WHERE id = ? AND user_id = ?', args: [JSON.stringify(compact), j.id, USER_ID] });
    tagged++;
  }
  if (stmts.length) await db.batch(stmts, 'write');
  console.log(`✓ Backfilled day_units: ${tagged} jobs tagged, ${skipped} left NULL (no hours)`);

  // 4. Verify
  const check = await db.execute({ sql: 'SELECT id, name, day_units FROM jobs WHERE user_id = ? AND day_units IS NOT NULL ORDER BY id', args: [USER_ID] });
  console.log('\n=== day_units now set ===');
  for (const r of check.rows) console.log(`  ${r.id}  ${(r.name || '').slice(0, 30).padEnd(31)} ${r.day_units}`);
  console.log('\n✅ Migration complete.');
}

run().catch((e) => { console.error('❌ Migration failed:', e); process.exit(1); });
