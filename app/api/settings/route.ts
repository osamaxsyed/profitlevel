import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getUserId();
    const result = await db.execute({
      sql: 'SELECT * FROM irs_rates WHERE user_id = ? ORDER BY year DESC',
      args: [userId]
    });
    const rates = result.rows;
    return NextResponse.json(rates);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch IRS rates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { year, rate } = body;

    if (!year || rate === undefined) {
      return NextResponse.json(
        { error: 'Year and rate are required' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'INSERT OR REPLACE INTO irs_rates (year, rate, user_id) VALUES (?, ?, ?)',
      args: [year, rate, userId]
    });

    const result = await db.execute({
      sql: 'SELECT * FROM irs_rates WHERE year = ? AND user_id = ?',
      args: [year, userId]
    });

    const newRate = result.rows[0];
    return NextResponse.json(newRate, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save IRS rate' }, { status: 500 });
  }
}
