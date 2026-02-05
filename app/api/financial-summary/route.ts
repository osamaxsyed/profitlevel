import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month'); // Optional: YYYY-MM format

    // Get yearly goal hours for burden rate calculation
    const yearlyGoalHoursResult = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ?',
      args: ['yearly_goal_hours']
    });
    const yearlyGoalHoursSetting = yearlyGoalHoursResult.rows[0] as { value: string } | undefined;
    const yearlyGoalHours = yearlyGoalHoursSetting ? parseFloat(yearlyGoalHoursSetting.value) : 2000;

    let dateFilter = '';
    let params: any[] = [];
    let periodLabel = 'All Time';

    if (month) {
      dateFilter = `WHERE strftime('%Y-%m', job_date) = ?`;
      params = [month];
      periodLabel = month;
    } else if (year) {
      dateFilter = `WHERE strftime('%Y', job_date) = ?`;
      params = [year];
      periodLabel = year;
    }
    // If neither month nor year provided, no filter = all time

    // Calculate job revenue and billable hours
    const jobStatsResult = await db.execute({
      sql: `SELECT
        COALESCE(SUM(contract_price), 0) as total_revenue,
        COALESCE(SUM(hours_spent), 0) as total_billable_hours,
        COUNT(id) as job_count
      FROM jobs
      ${dateFilter}`,
      args: params
    });

    const jobStats = jobStatsResult.rows[0] as {
      total_revenue: number;
      total_billable_hours: number;
      job_count: number;
    };

    // Calculate materials total with proper filtering
    let materialsFilter = '';
    let materialsParams: any[] = [];
    if (month) {
      materialsFilter = `WHERE strftime('%Y-%m', (SELECT job_date FROM jobs WHERE jobs.id = materials.job_id)) = ?`;
      materialsParams = [month];
    } else if (year) {
      materialsFilter = `WHERE strftime('%Y', (SELECT job_date FROM jobs WHERE jobs.id = materials.job_id)) = ?`;
      materialsParams = [year];
    }

    const materialsTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(cost + tax), 0) as total
      FROM materials
      ${materialsFilter}`,
      args: materialsParams
    });

    const materialsTotal = materialsTotalResult.rows[0] as { total: number };

    // Calculate labor total with proper filtering and flat rate handling
    let laborFilter = '';
    let laborParams: any[] = [];
    if (month) {
      laborFilter = `WHERE strftime('%Y-%m', (SELECT job_date FROM jobs WHERE jobs.id = labor.job_id)) = ?`;
      laborParams = [month];
    } else if (year) {
      laborFilter = `WHERE strftime('%Y', (SELECT job_date FROM jobs WHERE jobs.id = labor.job_id)) = ?`;
      laborParams = [year];
    }

    const laborTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(CASE WHEN is_flat_rate = 1 THEN rate ELSE hours * rate END), 0) as total
      FROM labor
      ${laborFilter}`,
      args: laborParams
    });

    const laborTotal = laborTotalResult.rows[0] as { total: number };

    // Calculate mileage total with proper filtering
    let mileageFilter = '';
    let mileageParams: any[] = [];
    if (month) {
      mileageFilter = `WHERE strftime('%Y-%m', (SELECT job_date FROM jobs WHERE jobs.id = mileage.job_id)) = ?`;
      mileageParams = [month];
    } else if (year) {
      mileageFilter = `WHERE strftime('%Y', (SELECT job_date FROM jobs WHERE jobs.id = mileage.job_id)) = ?`;
      mileageParams = [year];
    }

    const mileageTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(miles * rate), 0) as total
      FROM mileage
      ${mileageFilter}`,
      args: mileageParams
    });

    const mileageTotal = mileageTotalResult.rows[0] as { total: number };

    // Calculate overhead for the period
    let overheadFilter = '';
    let overheadParams: any[] = [];

    if (month) {
      overheadFilter = `WHERE strftime('%Y-%m', expense_date) = ?`;
      overheadParams = [month];
    } else if (year) {
      overheadFilter = `WHERE strftime('%Y', expense_date) = ?`;
      overheadParams = [year];
    }
    // If neither, no filter = all time

    const overheadStatsResult = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total_overhead
      FROM overhead
      ${overheadFilter}`,
      args: overheadParams
    });

    const overheadStats = overheadStatsResult.rows[0] as { total_overhead: number };

    // Calculate YTD overhead for burden rate (or all time if no year specified)
    let ytdOverheadQuery = '';
    let ytdOverheadParams: any[] = [];

    if (year) {
      ytdOverheadQuery = `WHERE strftime('%Y', expense_date) = ?`;
      ytdOverheadParams = [year];
    }
    // If no year, calculate from all time

    const ytdOverheadResult = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total
      FROM overhead
      ${ytdOverheadQuery}`,
      args: ytdOverheadParams
    });

    const ytdOverhead = ytdOverheadResult.rows[0] as { total: number };

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
