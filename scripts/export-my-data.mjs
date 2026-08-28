#!/usr/bin/env node
import { createClient } from '@libsql/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const USER_ID = 'user_39VCh0LoaJ36V134l6aTbTfDVLl';
const OUT = path.resolve('my-data-export');
await fs.mkdir(OUT, { recursive: true });

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function q(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows.map(row => Object.fromEntries(Object.entries(row)));
}

const jobs = await q('SELECT * FROM jobs WHERE user_id = ? ORDER BY id', [USER_ID]);
const jobIds = jobs.map(j => j.id);
const placeholders = jobIds.length ? jobIds.map(() => '?').join(',') : 'NULL';

const materials = jobIds.length ? await q(`SELECT * FROM materials WHERE job_id IN (${placeholders}) ORDER BY id`, jobIds) : [];
const payouts   = jobIds.length ? await q(`SELECT p.*, c.name AS crew_name, c.kind AS crew_kind FROM payouts p LEFT JOIN crew c ON c.id = p.crew_id WHERE p.job_id IN (${placeholders}) ORDER BY p.id`, jobIds) : [];
const mileage   = jobIds.length ? await q(`SELECT * FROM mileage   WHERE job_id IN (${placeholders}) ORDER BY id`, jobIds) : [];
const hours_log = jobIds.length ? await q(`SELECT * FROM hours_log WHERE job_id IN (${placeholders}) ORDER BY id`, jobIds) : [];

const overhead  = await q('SELECT * FROM overhead  WHERE user_id = ? ORDER BY expense_date', [USER_ID]);
const settings  = await q('SELECT * FROM settings  WHERE user_id = ? OR user_id IS NULL', [USER_ID]);
const irs_rates = await q('SELECT * FROM irs_rates WHERE user_id = ? OR user_id IS NULL ORDER BY year', [USER_ID]);

const crew = await q('SELECT * FROM crew ORDER BY id');

const tables = { jobs, materials, payouts, crew, mileage, hours_log, overhead, settings, irs_rates };

for (const [name, rows] of Object.entries(tables)) {
  await fs.writeFile(path.join(OUT, `${name}.json`), JSON.stringify(rows, null, 2));
}

// Jobs with nested children for easy reading
const byJob = Object.fromEntries(jobIds.map(id => [id, { materials: [], payouts: [], mileage: [], hours_log: [] }]));
for (const r of materials) byJob[r.job_id]?.materials.push(r);
for (const r of payouts)   byJob[r.job_id]?.payouts.push(r);
for (const r of mileage)   byJob[r.job_id]?.mileage.push(r);
for (const r of hours_log) byJob[r.job_id]?.hours_log.push(r);

const jobsExpanded = jobs.map(j => ({ ...j, ...byJob[j.id] }));
await fs.writeFile(path.join(OUT, 'jobs_full.json'), JSON.stringify(jobsExpanded, null, 2));

const summary = {
  exported_at: new Date().toISOString(),
  user_id: USER_ID,
  counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
};
await fs.writeFile(path.join(OUT, '_summary.json'), JSON.stringify(summary, null, 2));

console.log(JSON.stringify(summary, null, 2));
console.log(`\nWrote ${Object.keys(tables).length + 1} files to ${OUT}/`);
