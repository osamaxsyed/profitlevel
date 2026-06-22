import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

// GET /api/monthly-goals?year=2026
// Returns the 12 months' goals for the year (0 if unset), the actual gross per
// month, and the year-to-date pace (sum of goals through the current month vs
// actual YTD gross). Used by the Goals screen and the dashboard pace tracker.
export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

    // Goals set for this year
    const goalsResult = await db.execute({
      sql: 'SELECT month, amount FROM monthly_goals WHERE user_id = ? AND year = ?',
      args: [userId, year],
    });
    const goalByMonth: Record<number, number> = {};
    for (const row of goalsResult.rows) {
      const r = row as unknown as { month: number; amount: number };
      goalByMonth[r.month] = r.amount;
    }

    // Actual gross profit per month for this year (contract - materials - labor - mileage)
    const actualResult = await db.execute({
      sql: `SELECT
          CAST(strftime('%m', j.job_date) AS INTEGER) AS month,
          SUM(
            j.contract_price
            - COALESCE((SELECT SUM(cost + tax) FROM materials WHERE job_id = j.id), 0)
            - COALESCE((SELECT SUM(CASE WHEN is_flat_rate = 1 THEN rate ELSE hours * rate END) FROM labor WHERE job_id = j.id), 0)
            - COALESCE((SELECT SUM(miles * rate) FROM mileage WHERE job_id = j.id), 0)
          ) AS gross
        FROM jobs j
        WHERE j.user_id = ? AND strftime('%Y', j.job_date) = ?
        GROUP BY month`,
      args: [userId, String(year)],
    });
    const actualByMonth: Record<number, number> = {};
    for (const row of actualResult.rows) {
      const r = row as unknown as { month: number; gross: number };
      actualByMonth[r.month] = r.gross || 0;
    }

    const now = new Date();
    const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : 12;

    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      return {
        month: m,
        goal: goalByMonth[m] || 0,
        actual: actualByMonth[m] || 0,
      };
    });

    const annualTarget = months.reduce((s, m) => s + m.goal, 0);
    const annualActual = months.reduce((s, m) => s + m.actual, 0);
    // Pace = goals for months Jan..currentMonth (only meaningful for the in-progress/current year)
    const paceTarget = months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.goal, 0);
    const paceActual = months.filter((m) => m.month <= currentMonth).reduce((s, m) => s + m.actual, 0);

    return NextResponse.json({
      year,
      months,
      annual_target: annualTarget,
      annual_actual: annualActual,
      pace_target: paceTarget,
      pace_actual: paceActual,
      pace_delta: paceActual - paceTarget,
      current_month: currentMonth,
    });
  } catch (error) {
    console.error('Error fetching monthly goals:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly goals' }, { status: 500 });
  }
}

// POST /api/monthly-goals  { year, month, amount }  — upsert one month's goal.
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const { year, month, amount } = await request.json();

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Valid year and month (1-12) required' }, { status: 400 });
    }

    await db.execute({
      sql: `INSERT INTO monthly_goals (user_id, year, month, amount)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (user_id, year, month) DO UPDATE SET amount = excluded.amount`,
      args: [userId, year, month, Number(amount) || 0],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving monthly goal:', error);
    return NextResponse.json({ error: 'Failed to save monthly goal' }, { status: 500 });
  }
}
