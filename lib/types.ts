import type { CrewKind, PayType, PayoutRole, PayoutStatus } from './crew';

export type { CrewKind, PayType, PayoutRole, PayoutStatus };

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

/** Anyone the owner pays: one person, or a crew paid as a unit. */
export interface Crew {
  id: number;
  name: string;
  phone: string | null;
  kind: CrewKind;
  default_pay: string | null;
  default_rate: number | null;
  notes: string | null;
  blocked: number;
  /** 1 when the row is a placeholder the owner still has to put a real name to. */
  needs_name: number;
  w9_on_file: number;
  hic_number: string | null;
  hic_verified: string | null;
  coi_gl_expiry: string | null;
  wc_status: string | null;
  active: number;
  created_at: string;
  updated_at: string | null;
}

/** Compliance/volume rollups added by GET /api/crew. */
export interface CrewWithTotals extends Crew {
  ytd_paid: number;
  ytd_planned: number;
  jobs_count: number;
}

/** One person's pay on one job. `amount` is always materialized. */
export interface Payout {
  id: number;
  job_id: number;
  crew_id: number;
  role: PayoutRole;
  pay_type: PayType;
  hours: number | null;
  rate: number | null;
  amount: number;
  status: PayoutStatus;
  source: string | null;
  paid_via: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
}

/** A payout joined with the crew member's name, as returned on a job. */
export interface PayoutWithCrew extends Payout {
  crew_name: string;
  crew_kind: CrewKind;
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

/** A crew member rolled up per year for 1099-NEC tracking. */
export interface Payee1099 {
  crew_id: number;
  name: string;
  kind: CrewKind;
  /** True while the payee is still a placeholder with no real name on file. */
  needs_name: boolean;
  year: string;
  total_paid: number;
  /** Owed but not yet paid — not 1099 income until it settles. */
  total_agreed: number;
  payments: number;
  needs_1099: boolean;
}

export interface Material {
  id: number;
  job_id: number;
  item_name: string;
  cost: number;
  tax: number;
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
  mileage_total: number;
  gross_profit: number;
  gross_hourly_rate: number | null;
  hours_logged: number;
  day_units?: import('./dayRate').DayUnits | null;
  day_rate?: import('./dayRate').DayRateResult;
  /** SUM of payouts.amount for this job, excluding `planned` rows. */
  crew_cost: number;
  /** SUM of payouts.amount for `planned` rows — pencilled in, not yet owed. */
  crew_planned: number;
  payouts: PayoutWithCrew[];
  /** SUM of job_payments.amount, or contract_price for legacy paid_via-only jobs. */
  amount_paid: number;
  /** contract_price - amount_paid, floored at 0. */
  outstanding: number;
  /** amount_paid - materials - crew cost (mileage excluded: non-cash). */
  cash_position: number;
  /** True when anyone other than the owner was paid on this job. */
  has_crew: boolean;
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
