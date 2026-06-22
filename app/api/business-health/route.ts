import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // Format: YYYY-MM

    // Get monthly revenue, job count, and billable hours.
    // Billable hours prefer the hours_log sum per job (the source of truth);
    // fall back to jobs.hours_spent for legacy jobs with no log rows.
    const jobStatsResult = await db.execute({
      sql: `SELECT
        COALESCE(SUM(j.contract_price), 0) as total_revenue,
        COALESCE(SUM(COALESCE(hl.total_hours, j.hours_spent, 0)), 0) as total_billable_hours,
        COUNT(j.id) as job_count
      FROM jobs j
      LEFT JOIN (
        SELECT job_id, SUM(hours) as total_hours
        FROM hours_log
        GROUP BY job_id
      ) hl ON j.id = hl.job_id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?`,
      args: [userId, month]
    });

    const jobStats = jobStatsResult.rows[0] as unknown as {
      total_revenue: number;
      total_billable_hours: number;
      job_count: number;
    };

    // Get monthly expenses (materials) - filter by user via job
    const materialsTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(m.cost + m.tax), 0) as total
      FROM materials m
      INNER JOIN jobs j ON m.job_id = j.id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?`,
      args: [userId, month]
    });

    const materialsTotal = materialsTotalResult.rows[0] as unknown as { total: number };

    // Get monthly expenses (labor) - filter by user via job
    const laborTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(CASE WHEN l.is_flat_rate = 1 THEN l.rate ELSE l.hours * l.rate END), 0) as total
      FROM labor l
      INNER JOIN jobs j ON l.job_id = j.id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?`,
      args: [userId, month]
    });

    const laborTotal = laborTotalResult.rows[0] as unknown as { total: number };

    // Get monthly expenses (mileage) - filter by user via job
    const mileageTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(m.miles * m.rate), 0) as total
      FROM mileage m
      INNER JOIN jobs j ON m.job_id = j.id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?`,
      args: [userId, month]
    });

    const mileageTotal = mileageTotalResult.rows[0] as unknown as { total: number };

    // Get monthly overhead
    const overheadResultQuery = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total
      FROM overhead
      WHERE user_id = ? AND strftime('%Y-%m', expense_date) = ?`,
      args: [userId, month]
    });

    const overheadResult = overheadResultQuery.rows[0] as unknown as { total: number };

    // Calculate totals
    const totalExpenses = materialsTotal.total + laborTotal.total + mileageTotal.total + overheadResult.total;
    const netProfit = jobStats.total_revenue - totalExpenses;
    const netHourlyRate = jobStats.total_billable_hours > 0 ? netProfit / jobStats.total_billable_hours : 0;

    return NextResponse.json({
      revenue: jobStats.total_revenue,
      net_profit: netProfit,
      net_hourly_rate: netHourlyRate,
      billable_hours: jobStats.total_billable_hours,
      job_count: jobStats.job_count,
      overhead: overheadResult.total,
    });
  } catch (error) {
    console.error('Error fetching business health:', error);
    return NextResponse.json({ error: 'Failed to fetch business health' }, { status: 500 });
  }
}
