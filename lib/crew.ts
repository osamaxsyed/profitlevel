// Shared helpers for the crew ledger (crew + payouts), added in the crew migration.
//
// One table holds everyone the owner pays — a person or a whole crew — and one
// table holds every payout, whether the owner led the job and someone assisted,
// or the work was handed off entirely.

/** Roles a payout can carry. `led` = they ran the job; `assisted` = they helped. */
export const PAYOUT_ROLES = ['led', 'assisted'] as const;
export type PayoutRole = (typeof PAYOUT_ROLES)[number];

/** How the money is figured: a flat amount, or hours * rate. */
export const PAY_TYPES = ['flat', 'hourly'] as const;
export type PayType = (typeof PAY_TYPES)[number];

/** planned = pencilled in (excluded from cost), agreed = owed, paid = settled. */
export const PAYOUT_STATUSES = ['planned', 'agreed', 'paid'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** A crew row is one person, or a crew that works (and gets paid) as a unit. */
export const CREW_KINDS = ['person', 'crew'] as const;
export type CrewKind = (typeof CREW_KINDS)[number];

export const isRole = (v: unknown): v is PayoutRole =>
  typeof v === 'string' && (PAYOUT_ROLES as readonly string[]).includes(v);
export const isPayType = (v: unknown): v is PayType =>
  typeof v === 'string' && (PAY_TYPES as readonly string[]).includes(v);
export const isStatus = (v: unknown): v is PayoutStatus =>
  typeof v === 'string' && (PAYOUT_STATUSES as readonly string[]).includes(v);
export const isKind = (v: unknown): v is CrewKind =>
  typeof v === 'string' && (CREW_KINDS as readonly string[]).includes(v);

/**
 * The match key for "is this the same person?" — lowercased, whitespace
 * collapsed, trimmed. Used to find an existing crew row before making a new one
 * so typing "ian " twice doesn't create two Ians.
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * `payouts.amount` is always materialized so every reader can just SUM(amount)
 * instead of re-deriving flat-vs-hourly. Flat pays the rate outright; hourly is
 * hours * rate. An explicit amount only wins when neither can be computed.
 */
export function materializeAmount(input: {
  pay_type: PayType;
  hours?: number | null;
  rate?: number | null;
  amount?: number | null;
}): number {
  const rate = Number(input.rate ?? 0);
  if (input.pay_type === 'hourly') {
    const hours = Number(input.hours ?? 0);
    return Math.round(hours * rate * 100) / 100;
  }
  if (input.rate != null && Number.isFinite(rate)) return Math.round(rate * 100) / 100;
  const amount = Number(input.amount ?? 0);
  return Math.round(amount * 100) / 100;
}
