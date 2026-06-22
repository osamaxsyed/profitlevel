import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { parseTargets, DEFAULT_DAY_RATE_TARGETS, TIER_ORDER } from '@/lib/dayRate';

// Day-rate tier targets ($ gross profit per tier), stored as JSON in
// settings.day_rate_targets. This is the real, user-editable config behind the
// day-rate model (replaces the abandoned hourly goals).

export async function GET() {
  try {
    const userId = await getUserId();
    const row = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ? AND user_id = ?',
      args: ['day_rate_targets', userId],
    });
    const targets = parseTargets((row.rows[0] as { value?: string } | undefined)?.value);
    return NextResponse.json(targets);
  } catch {
    return NextResponse.json(DEFAULT_DAY_RATE_TARGETS, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();

    // Accept partial; merge over defaults, coerce to numbers, drop junk.
    const merged = { ...DEFAULT_DAY_RATE_TARGETS };
    for (const t of TIER_ORDER) {
      const v = Number(body?.[t]);
      if (Number.isFinite(v) && v >= 0) merged[t] = v;
    }

    // settings has a UNIQUE constraint on `key` (single-user app), so upsert on key.
    await db.execute({
      sql: `INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value, user_id = excluded.user_id`,
      args: ['day_rate_targets', JSON.stringify(merged), userId],
    });

    return NextResponse.json({ success: true, targets: merged });
  } catch (error) {
    console.error('Error saving day-rate targets:', error);
    return NextResponse.json({ error: 'Failed to save day-rate targets' }, { status: 500 });
  }
}
