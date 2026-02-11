import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getUserId();
    const grossGoalResult = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ? AND user_id = ?',
      args: ['gross_hourly_goal', userId]
    });
    const netGoalResult = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ? AND user_id = ?',
      args: ['net_hourly_goal', userId]
    });
    const yearlyGoalHoursResult = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ? AND user_id = ?',
      args: ['yearly_goal_hours', userId]
    });

    const grossGoal = grossGoalResult.rows[0] as unknown as { value: string } | undefined;
    const netGoal = netGoalResult.rows[0] as unknown as { value: string } | undefined;
    const yearlyGoalHours = yearlyGoalHoursResult.rows[0] as unknown as { value: string } | undefined;

    return NextResponse.json({
      gross_hourly_goal: grossGoal?.value || '195',
      net_hourly_goal: netGoal?.value || '120',
      yearly_goal_hours: yearlyGoalHours?.value || '2000',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { gross_hourly_goal, net_hourly_goal, yearly_goal_hours } = body;

    await db.execute({
      sql: 'INSERT OR REPLACE INTO settings (key, value, user_id) VALUES (?, ?, ?)',
      args: ['gross_hourly_goal', gross_hourly_goal.toString(), userId]
    });
    await db.execute({
      sql: 'INSERT OR REPLACE INTO settings (key, value, user_id) VALUES (?, ?, ?)',
      args: ['net_hourly_goal', net_hourly_goal.toString(), userId]
    });
    if (yearly_goal_hours) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO settings (key, value, user_id) VALUES (?, ?, ?)',
        args: ['yearly_goal_hours', yearly_goal_hours.toString(), userId]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update goals' }, { status: 500 });
  }
}
