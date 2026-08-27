export interface Job {
  id: number;
  name: string;
  client_name: string | null;
  contract_price: number;
  job_date: string;
  hours_spent: number | null;
  created_at: string;
  paid_via?: string | null;
  paid_date?: string | null;
}

/** A 1099 subcontractor the owner dispatches work to. */
export interface Sub {
  id: number;
  name: string;
  phone: string | null;
  w9_on_file: number;
  hic_number: string | null;
  hic_verified: string | null;
  coi_gl_expiry: string | null;
  wc_status: string | null;
  notes: string | null;
  created_at: string;
}

/** Compliance/volume rollups added by GET /api/subs. */
export interface SubWithTotals extends Sub {
  ytd_paid: number;
  jobs_count: number;
}

/** A payment made to a sub for a job. */
export interface SubPayout {
  id: number;
  job_id: number;
  sub_id: number;
  payout: number;
  paid_via: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
}

/** A sub payout joined with the sub's name, as returned on a job. */
export interface SubPayoutWithName extends SubPayout {
  sub_name: string;
}

/** Money collected from the client for a job. */
export interface JobPayment {
  id: number;
  job_id: number;
  amount: number;
  method: string | null;
  paid_date: string | null;
  note: string | null;
  created_at: string;
}

export type PaidStatus = 'paid' | 'partial' | 'unpaid';

/** A payee (helper or sub) rolled up per year for 1099-NEC tracking. */
export interface Payee1099 {
  name: string;
  year: string;
  total_paid: number;
  payments: number;
  needs_1099: boolean;
  source: 'labor' | 'subs' | 'both';
}

export interface Material {
  id: number;
  job_id: number;
  item_name: string;
  cost: number;
  tax: number;
  created_at: string;
}

export interface Labor {
  id: number;
  job_id: number;
  helper_name: string;
  hours: number;
  rate: number;
  is_flat_rate: number;
  created_at: string;
}

export interface Mileage {
  id: number;
  job_id: number;
  miles: number;
  rate: number;
  created_at: string;
}

export interface HoursLog {
  id: number;
  job_id: number;
  log_date: string;
  hours: number;
  note: string | null;
  created_at: string;
}

export interface JobWithCosts extends Job {
  materials_total: number;
  labor_total: number;
  mileage_total: number;
  gross_profit: number;
  gross_hourly_rate: number | null;
  hours_logged: number;
  day_units?: import('./dayRate').DayUnits | null;
  day_rate?: import('./dayRate').DayRateResult;
  /** SUM of sub_payouts.payout for this job. */
  sub_payout_total: number;
  sub_payouts: SubPayoutWithName[];
  /** SUM of job_payments.amount, or contract_price for legacy paid_via-only jobs. */
  amount_paid: number;
  /** contract_price - amount_paid, floored at 0. */
  outstanding: number;
  /** amount_paid - materials - labor - sub payouts (mileage excluded: non-cash). */
  cash_position: number;
  is_subbed: boolean;
  paid_status: PaidStatus;
}

export interface IRSRate {
  id: number;
  year: number;
  rate: number;
}

export interface Overhead {
  id: number;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  created_at: string;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
}

export interface BusinessHealth {
  total_monthly_overhead: number;
  total_billable_hours: number;
  overhead_per_hour: number;
  breakeven_hours: number;
}
