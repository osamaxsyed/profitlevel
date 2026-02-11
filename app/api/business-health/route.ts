import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // Format: YYYY-MM

    // Get monthly revenue, job count, and billable hours
    const jobStatsResult = await db.execute({
      sql: `SELECT
        COALESCE(SUM(contract_price), 0) as total_revenue,
        COALESCE(SUM(hours_spent), 0) as total_billable_hours,
        COUNT(id) as job_count
      FROM jobs
      WHERE strftime('%Y-%m', job_date) = ?`,
      args: [month]
    });

    const jobStats = jobStatsResult.rows[0] as unknown as {
      total_revenue: number;
      total_billable_hours: number;
      job_count: number;
    };

    // Get monthly expenses (materials)
    const materialsTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(cost + tax), 0) as total
      FROM materials
      WHERE strftime('%Y-%m', (SELECT job_date FROM jobs WHERE jobs.id = materials.job_id)) = ?`,
      args: [month]
    });

    const materialsTotal = materialsTotalResult.rows[0] as unknown as { total: number };

    // Get monthly expenses (labor)
    const laborTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(CASE WHEN is_flat_rate = 1 THEN rate ELSE hours * rate END), 0) as total
      FROM labor
      WHERE strftime('%Y-%m', (SELECT job_date FROM jobs WHERE jobs.id = labor.job_id)) = ?`,
      args: [month]
    });

    const laborTotal = laborTotalResult.rows[0] as unknown as { total: number };

    // Get monthly expenses (mileage)
    const mileageTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(miles * rate), 0) as total
      FROM mileage
      WHERE strftime('%Y-%m', (SELECT job_date FROM jobs WHERE jobs.id = mileage.job_id)) = ?`,
      args: [month]
    });

    const mileageTotal = mileageTotalResult.rows[0] as unknown as { total: number };

    // Get monthly overhead
    const overheadResultQuery = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total
      FROM overhead
      WHERE strftime('%Y-%m', expense_date) = ?`,
      args: [month]
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
