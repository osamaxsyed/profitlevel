// Day-rate tier model. A job is tagged with `day_units` (JSON like
// {"full":8,"half":1}); its target = sum of each tier's count x rate, and it's
// judged against gross profit. See memory: day-rate-model.

export type DayTier = 'full' | 'half' | 'short' | 'visit';
export type DayUnits = Partial<Record<DayTier, number>>;
export type DayRateTargets = Record<DayTier, number>;

export const DEFAULT_DAY_RATE_TARGETS: DayRateTargets = {
  full: 900,
  half: 475,
  short: 300,
  visit: 175,
};

export const TIER_ORDER: DayTier[] = ['full', 'half', 'short', 'visit'];
export const TIER_LABELS: Record<DayTier, string> = {
  full: 'Full day',
  half: 'Half day',
  short: 'Short job',
  visit: 'Site visit',
};

/* ---- UI palette (redesign) ---- */
export const PL_ACCENT = '#FF6A1A'; // cleared / on-pace
export const PL_CLAY = '#E0764E'; // missed / under

/** Compact "$1,155" currency for the redesign's mono numerals. */
export function fmtMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/** Build a one-line tier summary from day_units, e.g. "Full day" or "8 Full · 1 Half". */
export function tierSummary(units: DayUnits | null): string {
  if (!units) return 'Untagged';
  const parts = TIER_ORDER.filter((t) => (units[t] || 0) > 0).map((t) => {
    const c = units[t] || 0;
    return c === 1 ? TIER_LABELS[t] : `${c} ${TIER_LABELS[t]}`;
  });
  return parts.length ? parts.join(' · ') : 'Untagged';
}

/** Result color/background/border tokens for a cleared vs under job. */
export function resultTokens(met: boolean | null) {
  if (met === null) {
    return { color: '#9A9183', bg: 'rgba(255,255,255,0.04)', bd: 'rgba(255,255,255,0.08)' };
  }
  return met
    ? { color: PL_ACCENT, bg: 'rgba(255,106,26,0.12)', bd: 'rgba(255,106,26,0.32)' }
    : { color: PL_CLAY, bg: 'rgba(224,118,78,0.1)', bd: 'rgba(224,118,78,0.32)' };
}

/** Parse the day_units JSON column safely. Returns null if unset/invalid. */
export function parseDayUnits(raw: string | null | undefined): DayUnits | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj as DayUnits;
  } catch {
    /* fall through */
  }
  return null;
}

/** Parse the day_rate_targets setting, falling back to defaults. */
export function parseTargets(raw: string | null | undefined): DayRateTargets {
  const parsed = parseDayUnits(raw);
  return { ...DEFAULT_DAY_RATE_TARGETS, ...(parsed as Partial<DayRateTargets> | null) };
}

/** Total number of day-units across all tiers. */
export function dayCount(units: DayUnits | null): number {
  if (!units) return 0;
  return TIER_ORDER.reduce((n, t) => n + (units[t] || 0), 0);
}

/** Target gross profit = sum over tiers of count x rate. */
export function dayTarget(units: DayUnits | null, targets: DayRateTargets): number {
  if (!units) return 0;
  return TIER_ORDER.reduce((sum, t) => sum + (units[t] || 0) * targets[t], 0);
}

export interface DayRateResult {
  day_units: DayUnits | null;
  day_count: number;
  target: number; // 0 when untagged
  actual: number; // gross profit
  delta: number; // actual - target
  met: boolean | null; // null when untagged (no target to judge against)
  per_day: number | null; // actual / day_count, null when untagged
}

/** Compute the full day-rate verdict for one job. */
export function evaluateJob(
  units: DayUnits | null,
  grossProfit: number,
  targets: DayRateTargets
): DayRateResult {
  const count = dayCount(units);
  if (!units || count === 0) {
    return { day_units: units, day_count: 0, target: 0, actual: grossProfit, delta: grossProfit, met: null, per_day: null };
  }
  const target = dayTarget(units, targets);
  return {
    day_units: units,
    day_count: count,
    target,
    actual: grossProfit,
    delta: grossProfit - target,
    met: grossProfit >= target,
    per_day: grossProfit / count,
  };
}
