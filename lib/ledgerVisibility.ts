// Ledger visibility (jobs migration, 2026-08-27).
//
// Since the migration there is ONE `jobs` table: leads (New/Contacted/Quoted),
// live work (Won/Scheduled/Done) and off-ramps (Lost/Referred/Spam/Duplicate)
// are all rows in it. ProfitLevel is the books, so it must only ever see work
// that was actually sold — a lead has no revenue and no costs.
//
// Append this to any list or aggregate that reads `jobs`. It is deliberately a
// fragment rather than a view join so the existing `WHERE j.user_id = ?` shape
// (and its arg order) is untouched.
//
// Ownership lookups are the ONE exception: `SELECT user_id FROM jobs WHERE id=?`
// answers "may this user touch this row", which must stay true for every stage.
export const LEDGER_STAGES = ['Won', 'Scheduled', 'Done'] as const;

/** `AND j.stage IN ('Won','Scheduled','Done')` — pass the alias used in the query. */
export const ledgerVisible = (alias = 'j') =>
  ` AND ${alias}.stage IN ('Won', 'Scheduled', 'Done')`;
