import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM irs_rates ORDER BY year DESC');
    const rates = result.rows;
    return NextResponse.json(rates);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch IRS rates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, rate } = body;

    if (!year || rate === undefined) {
      return NextResponse.json(
        { error: 'Year and rate are required' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'INSERT OR REPLACE INTO irs_rates (year, rate) VALUES (?, ?)',
      args: [year, rate]
    });

    const result = await db.execute({
      sql: 'SELECT * FROM irs_rates WHERE year = ?',
      args: [year]
    });

    const newRate = result.rows[0];
    return NextResponse.json(newRate, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save IRS rate' }, { status: 500 });
  }
}
