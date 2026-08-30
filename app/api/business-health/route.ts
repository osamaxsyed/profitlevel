import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { parseTargets, parseDayUnits, evaluateJob, dayCount, TIER_ORDER, type DayTier } from '@/lib/dayRate';
import { ledgerVisible } from '@/lib/ledgerVisibility';

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
        -- contract_price is the flat price; what the customer owes is v_job_cash.total_due.
        COALESCE(SUM(vc.total_due), 0) as total_revenue,
        COALESCE(SUM(COALESCE(hl.total_hours, j.hours_spent, 0)), 0) as total_billable_hours,
        COUNT(j.id) as job_count
      FROM jobs j
      JOIN v_job_cash vc ON vc.id = j.id
      LEFT JOIN (
        SELECT job_id, SUM(hours) as total_hours
        FROM hours_log
        GROUP BY job_id
      ) hl ON j.id = hl.job_id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?${ledgerVisible()}`,
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
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?${ledgerVisible()}`,
      args: [userId, month]
    });

    const materialsTotal = materialsTotalResult.rows[0] as unknown as { total: number };

    // Get monthly expenses (mileage) - filter by user via job
    const mileageTotalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(m.miles * m.rate), 0) as total
      FROM mileage m
      INNER JOIN jobs j ON m.job_id = j.id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?${ledgerVisible()}`,
      args: [userId, month]
    });

    const mileageTotal = mileageTotalResult.rows[0] as unknown as { total: number };

    // Get monthly crew cost - everyone paid on a job, led or assisted. Without
    // this, profit is overstated on every job someone else worked.
    // `planned` rows are pencilled in, not owed, so they stay out of cost.
    const crewCostResult = await db.execute({
      sql: `SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payouts p
      INNER JOIN jobs j ON p.job_id = j.id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?${ledgerVisible()}
        AND p.status <> 'planned'`,
      args: [userId, month]
    });

    const crewCost = crewCostResult.rows[0] as unknown as { total: number };

    // Receivables: what has been billed but not yet collected.
    // Legacy jobs predate job_payments, so a paid_via with no payment rows means paid in full.
    const outstandingResult = await db.execute({
      // contract_price is the flat price; what the customer owes is v_job_cash.total_due.
      // The view already carries the legacy paid_via fallback, measured against total_due.
      sql: `SELECT
        COALESCE(SUM(MAX(vc.outstanding, 0)), 0) as total_outstanding,
        COALESCE(SUM(vc.collected_effective), 0) as total_collected
      FROM jobs j
      JOIN v_job_cash vc ON vc.id = j.id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?${ledgerVisible()}`,
      args: [userId, month]
    });

    const outstandingStats = outstandingResult.rows[0] as unknown as {
      total_outstanding: number;
      total_collected: number;
    };

    // Owner-labor slice: jobs the owner worked himself (nobody else paid on them).
    // Day-rate metrics only make sense over these.
    const ownerJobsResult = await db.execute({
      sql: `SELECT
        -- contract_price is the flat price; what the customer owes is v_job_cash.total_due.
        COALESCE(SUM(vc.total_due), 0) as revenue,
        COUNT(j.id) as job_count,
        COALESCE(SUM(COALESCE(hl.total_hours, j.hours_spent, 0)), 0) as billable_hours
      FROM jobs j
      JOIN v_job_cash vc ON vc.id = j.id
      LEFT JOIN (
        SELECT job_id, SUM(hours) as total_hours FROM hours_log GROUP BY job_id
      ) hl ON j.id = hl.job_id
      WHERE j.user_id = ? AND strftime('%Y-%m', j.job_date) = ?${ledgerVisible()}
        AND NOT EXISTS (SELECT 1 FROM payouts p WHERE p.job_id = j.id AND p.status <> 'planned')`,
      args: [userId, month]
    });

    const ownerJobs = ownerJobsResult.rows[0] as unknown as {
      revenue: number;
      job_count: number;
      billable_hours: number;
    };

    // Get monthly overhead
    const overheadResultQuery = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total
      FROM overhead
      WHERE user_id = ? AND strftime('%Y-%m', expense_date) = ?`,
      args: [userId, month]
    });

    const overheadResult = overheadResultQuery.rows[0] as unknown as { total: number };

    // Calculate totals
    const totalExpenses =
      materialsTotal.total + crewCost.total + mileageTotal.total + overheadResult.total;
    const netProfit = jobStats.total_revenue - totalExpenses;
    const netHourlyRate = jobStats.total_billable_hours > 0 ? netProfit / jobStats.total_billable_hours : 0;

    // Day-rate breakdown: per-job gross profit + day_units for the month.
    const targetsRow = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ? AND user_id = ?',
      args: ['day_rate_targets', userId],
    });
    const targets = parseTargets((targetsRow.rows[0] as { value?: string } | undefined)?.value);

    const monthJobsResult = await db.execute({
      sql: `SELECT
          j.id, j.name, j.contract_price, vc.total_due, j.day_units,
          -- contract_price is the flat price; what the customer owes is v_job_cash.total_due.
          vc.total_due
            - COALESCE((SELECT SUM(cost + tax) FROM materials WHERE job_id = j.id), 0)
            - COALESCE((SELECT SUM(miles * rate) FROM mileage WHERE job_id = j.id), 0)
            - COALESCE((SELECT SUM(amount) FROM payouts WHERE job_id = j.id AND status <> 'planned'), 0)
          AS gross_profit
        FROM jobs j
        JOIN v_job_cash vc ON vc.id = j.id
        WHERE j.user_id = ?${ledgerVisible()} AND strftime('%Y-%m', j.job_date) = ?
        ORDER BY j.job_date`,
      args: [userId, month],
    });

    const tierCounts: Record<DayTier, number> = { full: 0, half: 0, short: 0, visit: 0 };
    let dayRateTargetTotal = 0;
    let dayRateActualTotal = 0;
    let totalDayUnits = 0;
    let jobsMet = 0;
    let taggedJobs = 0;

    const jobBreakdown = monthJobsResult.rows.map((row) => {
      const r = row as Record<string, unknown>;
      const units = parseDayUnits(r.day_units as string | null);
      const gross = Number(r.gross_profit ?? 0);
      const evalResult = evaluateJob(units, gross, targets);
      if (units) {
        for (const t of TIER_ORDER) tierCounts[t] += units[t] || 0;
        totalDayUnits += dayCount(units);
        dayRateTargetTotal += evalResult.target;
        dayRateActualTotal += gross; // only count gross of tagged jobs toward the target comparison
        taggedJobs += 1;
        if (evalResult.met) jobsMet += 1;
      }
      return {
        id: r.id,
        name: r.name,
        gross_profit: gross,
        ...evalResult,
      };
    });

    return NextResponse.json({
      revenue: jobStats.total_revenue,
      net_profit: netProfit,
      net_hourly_rate: netHourlyRate,
      billable_hours: jobStats.total_billable_hours,
      job_count: jobStats.job_count,
      overhead: overheadResult.total,
      total_crew_cost: crewCost.total,
      total_outstanding: outstandingStats.total_outstanding,
      total_collected: outstandingStats.total_collected,
      owner_jobs: {
        revenue: ownerJobs.revenue,
        job_count: ownerJobs.job_count,
        billable_hours: ownerJobs.billable_hours,
      },
      day_rate: {
        targets,
        tier_counts: tierCounts,
        total_day_units: totalDayUnits,
        target_total: dayRateTargetTotal,
        actual_total: dayRateActualTotal,
        avg_per_day: totalDayUnits > 0 ? dayRateActualTotal / totalDayUnits : null,
        jobs_tagged: taggedJobs,
        jobs_met: jobsMet,
        jobs: jobBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching business health:', error);
    return NextResponse.json({ error: 'Failed to fetch business health' }, { status: 500 });
  }
}
