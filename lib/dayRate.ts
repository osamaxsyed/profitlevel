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
