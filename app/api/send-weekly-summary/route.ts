import { NextResponse } from 'next/server';
import { sendWeeklySummary } from '@/lib/email';
import db from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

// This endpoint would be called by a cron job (e.g., Vercel Cron)
export async function POST(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users (in production, you'd need to store user emails in your DB)
    // For now, this is a placeholder structure
    // You would need to add a users table or get user info from Clerk

    return NextResponse.json({
      message: 'Weekly summaries sent',
      note: 'Implementation requires Clerk user list and email preferences'
    });
  } catch (error) {
    console.error('Error sending weekly summaries:', error);
    return NextResponse.json({ error: 'Failed to send summaries' }, { status: 500 });
  }
}

// Manual trigger for testing (requires authentication)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get last 7 days of data for the authenticated user
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    // Get weekly stats. Billable hours prefer the hours_log sum per job (the
    // source of truth); fall back to jobs.hours_spent for jobs with no log rows.
    const jobStatsResult = await db.execute({
      sql: `SELECT
        COALESCE(SUM(j.contract_price), 0) as total_revenue,
        COALESCE(SUM(COALESCE(hl.total_hours, j.hours_spent, 0)), 0) as total_hours,
        COUNT(j.id) as job_count
      FROM jobs j
      LEFT JOIN (
        SELECT job_id, SUM(hours) as total_hours
        FROM hours_log
        GROUP BY job_id
      ) hl ON j.id = hl.job_id
      WHERE j.user_id = ? AND j.job_date >= ?`,
      args: [userId, dateStr]
    });

    const jobStats = jobStatsResult.rows[0] as any;

    // Get weekly expenses
    const expensesResult = await db.execute({
      sql: `SELECT
        (SELECT COALESCE(SUM(m.cost + m.tax), 0) FROM materials m INNER JOIN jobs j ON m.job_id = j.id WHERE j.user_id = ? AND j.job_date >= ?) +
        (SELECT COALESCE(SUM(CASE WHEN l.is_flat_rate = 1 THEN l.rate ELSE l.hours * l.rate END), 0) FROM labor l INNER JOIN jobs j ON l.job_id = j.id WHERE j.user_id = ? AND j.job_date >= ?) +
        (SELECT COALESCE(SUM(m.miles * m.rate), 0) FROM mileage m INNER JOIN jobs j ON m.job_id = j.id WHERE j.user_id = ? AND j.job_date >= ?) as total_expenses`,
      args: [userId, dateStr, userId, dateStr, userId, dateStr]
    });

    const expenses = (expensesResult.rows[0] as any).total_expenses;
    const profit = jobStats.total_revenue - expenses;
    const hourlyRate = jobStats.total_hours > 0 ? profit / jobStats.total_hours : 0;

    // Send test email (would need user email from Clerk)
    await sendWeeklySummary({
      userName: 'User', // Would get from Clerk
      userEmail: 'test@example.com', // Would get from Clerk
      weeklyRevenue: jobStats.total_revenue,
      weeklyProfit: profit,
      weeklyHours: jobStats.total_hours,
      weeklyHourlyRate: hourlyRate,
      jobsCompleted: jobStats.job_count,
    });

    return NextResponse.json({
      message: 'Test email sent',
      stats: {
        revenue: jobStats.total_revenue,
        profit,
        hours: jobStats.total_hours,
        hourlyRate,
        jobs: jobStats.job_count,
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
