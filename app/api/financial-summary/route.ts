import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month'); // Optional: YYYY-MM format

    // Get yearly goal hours for burden rate calculation
    const yearlyGoalHoursResult = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ? AND user_id = ?',
      args: ['yearly_goal_hours', userId]
    });
    const yearlyGoalHoursSetting = yearlyGoalHoursResult.rows[0] as unknown as { value: string } | undefined;
    const yearlyGoalHours = yearlyGoalHoursSetting ? parseFloat(yearlyGoalHoursSetting.value) : 2000;

    let dateFilter = '';
    let params: any[] = [userId];
    let periodLabel = 'All Time';

    if (month) {
      dateFilter = `AND strftime('%Y-%m', job_date) = ?`;
      params.push(month);
      periodLabel = month;
    } else if (year) {
      dateFilter = `AND strftime('%Y', job_date) = ?`;
      params.push(year);
      periodLabel = year;
    }
    // If neither month nor year provided, no filter = all time

    // Calculate job revenue and billable hours.
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
      WHERE j.user_id = ? ${dateFilter}`,
      args: params
    });

    const jobStats = jobStatsResult.rows[0] as unknown as {
      total_revenue: number;
      total_billable_hours: number;
      job_count: number;
    };

    // Calculate materials total with proper filtering
    let materialsFilter = '';
    let materialsParams: any[] = [userId];
    if (month) {
      materialsFilter = `AND strftime('%Y-%m', j.job_date) = ?`;
      materialsParams.push(month);
    } else if (year) {
      materialsFilter = `AND strftime('%Y', j.job_date) = ?`;
      materialsParams.push(year);
    }

    const materialsTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(m.cost + m.tax), 0) as total
      FROM materials m
      INNER JOIN jobs j ON m.job_id = j.id
      WHERE j.user_id = ? ${materialsFilter}`,
      args: materialsParams
    });

    const materialsTotal = materialsTotalResult.rows[0] as unknown as { total: number };

    // Calculate labor total with proper filtering and flat rate handling
    let laborFilter = '';
    let laborParams: any[] = [userId];
    if (month) {
      laborFilter = `AND strftime('%Y-%m', j.job_date) = ?`;
      laborParams.push(month);
    } else if (year) {
      laborFilter = `AND strftime('%Y', j.job_date) = ?`;
      laborParams.push(year);
    }

    const laborTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(CASE WHEN l.is_flat_rate = 1 THEN l.rate ELSE l.hours * l.rate END), 0) as total
      FROM labor l
      INNER JOIN jobs j ON l.job_id = j.id
      WHERE j.user_id = ? ${laborFilter}`,
      args: laborParams
    });

    const laborTotal = laborTotalResult.rows[0] as unknown as { total: number };

    // Calculate mileage total with proper filtering
    let mileageFilter = '';
    let mileageParams: any[] = [userId];
    if (month) {
      mileageFilter = `AND strftime('%Y-%m', j.job_date) = ?`;
      mileageParams.push(month);
    } else if (year) {
      mileageFilter = `AND strftime('%Y', j.job_date) = ?`;
      mileageParams.push(year);
    }

    const mileageTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(m.miles * m.rate), 0) as total
      FROM mileage m
      INNER JOIN jobs j ON m.job_id = j.id
      WHERE j.user_id = ? ${mileageFilter}`,
      args: mileageParams
    });

    const mileageTotal = mileageTotalResult.rows[0] as unknown as { total: number };

    // Calculate overhead for the period
    let overheadFilter = '';
    let overheadParams: any[] = [userId];

    if (month) {
      overheadFilter = `AND strftime('%Y-%m', expense_date) = ?`;
      overheadParams.push(month);
    } else if (year) {
      overheadFilter = `AND strftime('%Y', expense_date) = ?`;
      overheadParams.push(year);
    }
    // If neither, no filter = all time

    const overheadStatsResult = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total_overhead
      FROM overhead
      WHERE user_id = ? ${overheadFilter}`,
      args: overheadParams
    });

    const overheadStats = overheadStatsResult.rows[0] as unknown as { total_overhead: number };

    // Calculate YTD overhead for burden rate (or all time if no year specified)
    let ytdOverheadQuery = '';
    let ytdOverheadParams: any[] = [userId];

    if (year) {
      ytdOverheadQuery = `AND strftime('%Y', expense_date) = ?`;
      ytdOverheadParams.push(year);
    }
    // If no year, calculate from all time

    const ytdOverheadResult = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total
      FROM overhead
      WHERE user_id = ? ${ytdOverheadQuery}`,
      args: ytdOverheadParams
    });

    const ytdOverhead = ytdOverheadResult.rows[0] as unknown as { total: number };

    const hourlyBurdenRate = yearlyGoalHours > 0 ? ytdOverhead.total / yearlyGoalHours : 0;

    // Calculate totals
    const totalDirectCosts = materialsTotal.total + laborTotal.total;
    const totalVariableCosts = mileageTotal.total;
    const totalExpenses = totalDirectCosts + totalVariableCosts + overheadStats.total_overhead;
    const netProfit = jobStats.total_revenue - totalExpenses;
    const taxableIncome = netProfit; // Simplified - in reality might have more deductions

    return NextResponse.json({
      period: periodLabel,
      revenue: jobStats.total_revenue,
      expenses: {
        bucket_a_direct: totalDirectCosts,
        materials: materialsTotal.total,
        labor: laborTotal.total,
        bucket_b_variable: totalVariableCosts,
        mileage: mileageTotal.total,
        bucket_c_fixed: overheadStats.total_overhead,
        total: totalExpenses,
      },
      net_profit: netProfit,
      job_count: jobStats.job_count,
      billable_hours: jobStats.total_billable_hours,
      hourly_burden_rate: hourlyBurdenRate,
      yearly_goal_hours: yearlyGoalHours,
      tax_estimate: {
        taxable_income: taxableIncome,
        estimated_tax_15pct: taxableIncome * 0.15,
        estimated_tax_25pct: taxableIncome * 0.25,
        estimated_tax_30pct: taxableIncome * 0.30,
      },
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    return NextResponse.json({ error: 'Failed to fetch financial summary' }, { status: 500 });
  }
}
