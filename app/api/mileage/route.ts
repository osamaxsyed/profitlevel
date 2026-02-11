import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Mileage } from '@/lib/types';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    let result;
    if (jobId) {
      // Verify job ownership and get mileage
      result = await db.execute({
        sql: `SELECT m.* FROM mileage m
              INNER JOIN jobs j ON m.job_id = j.id
              WHERE m.job_id = ? AND j.user_id = ?
              ORDER BY m.created_at DESC`,
        args: [jobId, userId]
      });
    } else {
      // Get all mileage for user's jobs
      result = await db.execute({
        sql: `SELECT m.* FROM mileage m
              INNER JOIN jobs j ON m.job_id = j.id
              WHERE j.user_id = ?
              ORDER BY m.created_at DESC`,
        args: [userId]
      });
    }

    const mileage = result.rows as unknown as Mileage[];

    return NextResponse.json(mileage);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch mileage' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { job_id, miles } = body;

    if (!job_id || miles === undefined) {
      return NextResponse.json(
        { error: 'Job ID and miles are required' },
        { status: 400 }
      );
    }

    // Get the job's year and verify ownership
    const jobResult = await db.execute({
      sql: 'SELECT job_date, user_id FROM jobs WHERE id = ?',
      args: [job_id]
    });

    const job = jobResult.rows[0] as unknown as { job_date: string; user_id: string } | undefined;
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const jobYear = new Date(job.job_date).getFullYear();

    // Get the IRS rate for that year (only from user's rates)
    const irsRateResult = await db.execute({
      sql: 'SELECT rate FROM irs_rates WHERE year = ? AND user_id = ?',
      args: [jobYear, userId]
    });

    let irsRate = irsRateResult.rows[0] as unknown as { rate: number } | undefined;

    // If no rate exists for that year, use the most recent available rate for this user
    if (!irsRate) {
      const fallbackResult = await db.execute({
        sql: 'SELECT rate FROM irs_rates WHERE user_id = ? ORDER BY year DESC LIMIT 1',
        args: [userId]
      });
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
