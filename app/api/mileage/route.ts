import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Mileage } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    let result;
    if (jobId) {
      result = await db.execute({
        sql: 'SELECT * FROM mileage WHERE job_id = ? ORDER BY created_at DESC',
        args: [jobId]
      });
    } else {
      result = await db.execute('SELECT * FROM mileage ORDER BY created_at DESC');
    }

    const mileage = result.rows as unknown as Mileage[];

    return NextResponse.json(mileage);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch mileage' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { job_id, miles } = body;

    if (!job_id || miles === undefined) {
      return NextResponse.json(
        { error: 'Job ID and miles are required' },
        { status: 400 }
      );
    }

    // Get the job's year to determine the IRS rate
    const jobResult = await db.execute({
      sql: 'SELECT job_date FROM jobs WHERE id = ?',
      args: [job_id]
    });

    const job = jobResult.rows[0] as unknown as { job_date: string } | undefined;
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobYear = new Date(job.job_date).getFullYear();

    // Get the IRS rate for that year
    const irsRateResult = await db.execute({
      sql: 'SELECT rate FROM irs_rates WHERE year = ?',
      args: [jobYear]
    });

    let irsRate = irsRateResult.rows[0] as unknown as { rate: number } | undefined;

    // If no rate exists for that year, use the most recent available rate
    if (!irsRate) {
      const fallbackResult = await db.execute('SELECT rate FROM irs_rates ORDER BY year DESC LIMIT 1');
      irsRate = fallbackResult.rows[0] as unknown as { rate: number } | undefined;
    }

    const rate = irsRate?.rate || 0.67; // Fallback to 0.67 if no rates exist

    const result = await db.execute({
      sql: 'INSERT INTO mileage (job_id, miles, rate) VALUES (?, ?, ?)',
      args: [job_id, miles, rate]
    });

    const mileageResult = await db.execute({
      sql: 'SELECT * FROM mileage WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    });

    const newMileage = mileageResult.rows[0] as unknown as Mileage;

    return NextResponse.json(newMileage, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create mileage entry' }, { status: 500 });
  }
}
