// Local UI-side types for the crew ledger. These mirror the API contract; they
// intentionally live in the components tree (not lib/types.ts) so the UI owns
// its own view models.
//
// Since the crew migration there is ONE payout entry: who worked, whether they
// led or assisted, flat or hourly, and where the money stands.

import type { CrewKind, PayType, PayoutRole, PayoutStatus } from '@/lib/crew';

export type { CrewKind, PayType, PayoutRole, PayoutStatus };

export interface Payout {
  id: number;
  job_id: number;
  crew_id: number;
  crew_name: string;
  crew_kind: CrewKind;
  role: PayoutRole;
  pay_type: PayType;
  hours: number | null;
  rate: number | null;
  amount: number;
  status: PayoutStatus;
  source?: string | null;
  paid_via: string | null;
  paid_date: string | null;
  notes?: string | null;
}

export interface JobPayment {
  id: number;
  job_id: number;
  amount: number;
  method: string | null;
  paid_date: string | null;
  note: string | null;
  created_at?: string;
}

export type PaidStatus = 'paid' | 'partial' | 'unpaid';

/** The crew/receivables fields GET /api/jobs returns alongside every job. */
export interface JobDispatchFields {
  crew_cost: number;
  crew_planned: number;
  payouts: Payout[];
  amount_paid: number;
  outstanding: number;
  cash_position: number;
  has_crew: boolean;
  paid_status: PaidStatus;
}

export interface Crew {
  id: number;
  name: string;
  phone: string | null;
  kind: CrewKind;
  default_pay: string | null;
  default_rate: number | null;
  blocked: number;
  needs_name: number;
  active: number;
  w9_on_file: number;
  hic_number: string | null;
  hic_verified: string | null;
  coi_gl_expiry: string | null;
  wc_status: string | null;
  notes: string | null;
  ytd_paid: number;
  ytd_planned: number;
  jobs_count: number;
}

export interface Payee1099 {
  crew_id: number;
  name: string;
  kind: CrewKind;
  needs_name: boolean;
  year: string;
  total_paid: number;
  total_agreed: number;
  payments: number;
  needs_1099: boolean;
}

export const WC_OPTIONS = [
  { value: 'policy', label: 'Has WC policy' },
  { value: 'affidavit', label: 'Exemption affidavit' },
  { value: 'none', label: 'No coverage' },
  { value: 'unknown', label: 'Not asked yet' },
] as const;

/** Led / assisted, as the payout form shows them. */
export const ROLE_OPTIONS: { value: PayoutRole; label: string; hint: string }[] = [
  { value: 'led', label: 'Led', hint: 'they ran the job' },
  { value: 'assisted', label: 'Assisted', hint: 'they helped you' },
];

/** Where the money stands. */
export const STATUS_OPTIONS: { value: PayoutStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'agreed', label: 'Agreed' },
  { value: 'paid', label: 'Paid' },
];

/** IRS 1099-NEC filing threshold for tax year 2026. */
export const THRESHOLD_1099 = 2000;

/* ---- Semantic tokens for paid status, matched to the app palette ---- */
export const PAID_TOKENS: Record<PaidStatus, { label: string; color: string; bg: string; bd: string }> = {
  paid: { label: 'Paid', color: '#FF6A1A', bg: 'rgba(255,106,26,0.12)', bd: 'rgba(255,106,26,0.32)' },
  partial: { label: 'Partial', color: '#E8B530', bg: 'rgba(232,181,48,0.12)', bd: 'rgba(232,181,48,0.34)' },
  unpaid: { label: 'Unpaid', color: '#E0764E', bg: 'rgba(224,118,78,0.1)', bd: 'rgba(224,118,78,0.32)' },
};

/** Coalesce a possibly-missing number from the API (backend may lag). */
export function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** The name to show for a crew row that may not have a real one yet. */
export function crewLabel(name: string, needsName: boolean | number): string {
  return needsName ? `${name} (needs a name)` : name;
}

/** "Crew: Ian $601" / "Crew: Ian $601 · Duo $300" — only money that counts. */
export function crewLine(payouts: Payout[] | undefined): string | null {
  if (!payouts || payouts.length === 0) return null;
  const counted = payouts.filter((p) => p.status !== 'planned');
  if (counted.length === 0) return null;
  const parts = counted.map((p) => `${p.crew_name} $${Math.round(p.amount).toLocaleString('en-US')}`);
  return `Crew: ${parts.join(' · ')}`;
}

/** How a payout reads under the name: "Led · 6h × $45" / "Assisted · flat". */
export function payoutDetail(p: Payout): string {
  const role = p.role === 'led' ? 'Led' : 'Assisted';
  const money =
    p.pay_type === 'hourly' && p.hours != null && p.rate != null
      ? `${p.hours}h × $${p.rate}/hr`
      : 'flat';
  return `${role} · ${money}`;
}

/** Is a COI expiry date missing or in the past? */
export function coiState(expiry: string | null): 'missing' | 'expired' | 'ok' {
  if (!expiry) return 'missing';
  const d = new Date(expiry + 'T23:59:59');
  if (Number.isNaN(d.getTime())) return 'missing';
  return d.getTime() < Date.now() ? 'expired' : 'ok';
}
