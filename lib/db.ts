import { createClient } from '@libsql/client';

// Use Turso in production, local SQLite in development
const isProduction = process.env.NODE_ENV === 'production' || process.env.TURSO_URL;

const db = isProduction
  ? createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_TOKEN!,
    })
  : createClient({
      url: 'file:profitlevel.db',
    });

// Initialize database schema
async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contract_price REAL NOT NULL,
      job_date DATE,
      hours_spent REAL,
      client_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      cost REAL NOT NULL,
      tax REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS mileage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      miles REAL NOT NULL,
      rate REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS irs_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL UNIQUE,
      rate REAL NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS hours_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      log_date DATE NOT NULL,
      hours REAL NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
    );
  `);

  // Per-month gross income goals. One row per (user, year, month) the user has set;
  // unset months default to $0. Annual target = sum of the year's set months.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS monthly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount REAL NOT NULL,
      UNIQUE (user_id, year, month)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS overhead (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      expense_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Everyone the owner pays: a person, or a crew that works and gets paid as a
  // unit. Single-user app, so no user_id. Replaced `subs` in the crew migration.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS crew (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      kind TEXT NOT NULL DEFAULT 'person',
      default_pay TEXT,
      default_rate REAL,
      notes TEXT,
      blocked INTEGER DEFAULT 0,
      needs_name INTEGER DEFAULT 0,
      w9_on_file INTEGER DEFAULT 0,
      hic_number TEXT,
      hic_verified DATE,
      coi_gl_expiry DATE,
      wc_status TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT);
  `);

  // Every payout on a job, replacing the old labor/sub_payouts split. `role`
  // says whether they led the job or assisted; `amount` is always materialized
  // (flat: amount = rate; hourly: amount = hours * rate) so readers just SUM it.
  // `planned` rows are pencilled in and excluded from job cost.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      crew_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      pay_type TEXT NOT NULL DEFAULT 'flat',
      hours REAL,
      rate REAL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      source TEXT,
      paid_via TEXT,
      paid_date TEXT,
      bank_tx_ids TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      legacy_table TEXT,
      legacy_id INTEGER);
  `);

  // Money actually collected from the client. Supports deposits / partial payments.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS job_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL, amount REAL NOT NULL, method TEXT,
      paid_date DATE, note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE);
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );
  `);

  // Reporting views over the crew ledger. Crew cost counts everything that is
  // not merely `planned`; `sub_payout` stays as an alias so older callers that
  // still ask for it get the same number, and helper_labor is now always 0.
  await db.execute(`
    CREATE VIEW IF NOT EXISTS v_job_margin AS
     SELECT j.id, j.name, j.client_name, j.job_date, j.contract_price,
       COALESCE(m.mat,0) AS materials,
       COALESCE(pc.crew,0) AS crew_cost,
       COALESCE(pc.crew,0) AS sub_payout,
       0 AS helper_labor,
       COALESCE(pp.planned,0) AS crew_planned,
       ROUND(j.contract_price - COALESCE(m.mat,0) - COALESCE(pc.crew,0),2) AS margin,
       ROUND(100.0*(j.contract_price - COALESCE(m.mat,0) - COALESCE(pc.crew,0))/NULLIF(j.contract_price,0),1) AS margin_pct
     FROM jobs j
     LEFT JOIN (SELECT job_id, SUM(cost+COALESCE(tax,0)) mat FROM materials GROUP BY job_id) m ON m.job_id=j.id
     LEFT JOIN (SELECT job_id, SUM(amount) crew FROM payouts WHERE status <> 'planned' GROUP BY job_id) pc ON pc.job_id=j.id
     LEFT JOIN (SELECT job_id, SUM(amount) planned FROM payouts WHERE status = 'planned' GROUP BY job_id) pp ON pp.job_id=j.id;
  `);

  await db.execute(`
    CREATE VIEW IF NOT EXISTS v_job_cash AS
     SELECT j.id, j.name, j.client_name, j.contract_price,
       COALESCE(p.paid,0) AS collected,
       CASE WHEN p.paid IS NULL AND j.paid_via IS NOT NULL THEN j.contract_price ELSE COALESCE(p.paid,0) END AS collected_effective,
       j.contract_price - CASE WHEN p.paid IS NULL AND j.paid_via IS NOT NULL THEN j.contract_price ELSE COALESCE(p.paid,0) END AS outstanding,
       ROUND(CASE WHEN p.paid IS NULL AND j.paid_via IS NOT NULL THEN j.contract_price ELSE COALESCE(p.paid,0) END
         - COALESCE(m.mat,0) - COALESCE(pc.crew,0), 2) AS cash_position
     FROM jobs j
     LEFT JOIN (SELECT job_id, SUM(amount) paid FROM job_payments GROUP BY job_id) p ON p.job_id=j.id
     LEFT JOIN (SELECT job_id, SUM(cost+COALESCE(tax,0)) mat FROM materials GROUP BY job_id) m ON m.job_id=j.id
     LEFT JOIN (SELECT job_id, SUM(amount) crew FROM payouts WHERE status <> 'planned' GROUP BY job_id) pc ON pc.job_id=j.id;
  `);

  // Per-payee, per-year 1099 rollup. Planned money is not income to anyone.
  await db.execute(`
    CREATE VIEW IF NOT EXISTS v_payee_1099 AS
     SELECT c.id AS crew_id, c.name, c.kind, c.needs_name,
       strftime('%Y', COALESCE(p.paid_date, p.created_at)) AS yr,
       ROUND(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END),2) AS total_paid,
       ROUND(SUM(CASE WHEN p.status = 'agreed' THEN p.amount ELSE 0 END),2) AS total_agreed,
       COUNT(*) AS payments,
       CASE WHEN SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END)
         >= COALESCE((SELECT CAST(value AS REAL) FROM settings WHERE key='1099_threshold'), 2000)
         THEN '1099-NEC REQUIRED' ELSE 'under threshold' END AS status
     FROM payouts p JOIN crew c ON c.id = p.crew_id
     WHERE p.status <> 'planned'
     GROUP BY c.id, yr;
  `);

  // Insert default IRS rates if table is empty
  const rateCount = await db.execute('SELECT COUNT(*) as count FROM irs_rates');
  if (rateCount.rows[0].count === 0) {
    const defaultRates = [
      { year: 2022, rate: 0.625 },
      { year: 2023, rate: 0.655 },
      { year: 2024, rate: 0.67 },
      { year: 2025, rate: 0.70 },
      { year: 2026, rate: 0.70 },
    ];

    for (const { year, rate } of defaultRates) {
      await db.execute({
        sql: 'INSERT INTO irs_rates (year, rate) VALUES (?, ?)',
        args: [year, rate],
      });
    }
  }

  // Insert default settings if they don't exist
  const settingsCount = await db.execute('SELECT COUNT(*) as count FROM settings');
  if (settingsCount.rows[0].count === 0) {
    const defaultSettings = [
      { key: 'gross_hourly_goal', value: '195' },
      { key: 'net_hourly_goal', value: '120' },
      { key: 'yearly_goal_hours', value: '2000' },
    ];

    for (const { key, value } of defaultSettings) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: [key, value],
      });
    }
  } else {
    // Add yearly_goal_hours if it doesn't exist
    const yearlyGoalExists = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ?',
      args: ['yearly_goal_hours'],
    });
    if (yearlyGoalExists.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: ['yearly_goal_hours', '2000'],
      });
    }
  }
}

// Initialize on module load
initializeDatabase().catch(console.error);

export default db;
