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
    CREATE TABLE IF NOT EXISTS labor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      helper_name TEXT NOT NULL,
      hours REAL NOT NULL,
      rate REAL NOT NULL,
      is_flat_rate INTEGER DEFAULT 0,
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

  // 1099 subcontractors the owner dispatches jobs to. Single-user app, so no user_id.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT, w9_on_file INTEGER DEFAULT 0,
      hic_number TEXT, hic_verified DATE, coi_gl_expiry DATE, wc_status TEXT,
      notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  `);

  // What was actually paid out to a sub for a job. A job with >= 1 row is "subbed out".
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sub_payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL, sub_id INTEGER NOT NULL, payout REAL NOT NULL,
      paid_via TEXT, paid_date DATE, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (sub_id) REFERENCES subs(id));
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
