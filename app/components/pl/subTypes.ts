// Local UI-side types for the sub-dispatch / receivables data added in the
// Aug 2026 rehaul. These mirror the API contract; they intentionally live in
// the components tree (not lib/types.ts) so the UI owns its own view models.

export interface SubPayout {
  id: number;
  sub_id: number;
  sub_name: string;
  payout: number;
  paid_via: string | null;
  status?: 'agreed' | 'paid' | null;
  source?: 'bank' | 'cash' | 'legacy' | null;
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

/** The sub/receivables fields GET /api/jobs now returns alongside every job. */
export interface JobDispatchFields {
  sub_payout_total: number;
  sub_payouts: SubPayout[];
  amount_paid: number;
  outstanding: number;
  cash_position: number;
  is_subbed: boolean;
  paid_status: PaidStatus;
}

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
  ytd_paid: number;
  jobs_count: number;
}

export interface Payee1099 {
  name: string;
  year: number;
  total_paid: number;
  payments: number;
  needs_1099: boolean;
  source: 'labor' | 'subs' | 'both';
}

export const WC_OPTIONS = [
  { value: 'policy', label: 'Has WC policy' },
  { value: 'affidavit', label: 'Exemption affidavit' },
  { value: 'none', label: 'No coverage' },
  { value: 'unknown', label: 'Not asked yet' },
] as const;

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

/** "Sub: Ian $601" / "Subs: Ian $601 · Duo $300" */
export function subLine(payouts: SubPayout[] | undefined): string | null {
  if (!payouts || payouts.length === 0) return null;
  const parts = payouts.map((p) => `${p.sub_name} $${Math.round(p.payout).toLocaleString('en-US')}`);
  return `${payouts.length === 1 ? 'Sub' : 'Subs'}: ${parts.join(' · ')}`;
}

/** Is a COI expiry date missing or in the past? */
export function coiState(expiry: string | null): 'missing' | 'expired' | 'ok' {
  if (!expiry) return 'missing';
  const d = new Date(expiry + 'T23:59:59');
  if (Number.isNaN(d.getTime())) return 'missing';
  return d.getTime() < Date.now() ? 'expired' : 'ok';
}
