import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { HoursLog } from '@/lib/types';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    }

    const result = await db.execute({
      sql: `SELECT hl.* FROM hours_log hl
            INNER JOIN jobs j ON hl.job_id = j.id
            WHERE hl.job_id = ? AND j.user_id = ?
            ORDER BY hl.log_date DESC, hl.created_at DESC`,
      args: [jobId, userId],
    });

    return NextResponse.json(result.rows as unknown as HoursLog[]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch hours log' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { job_id, log_date, hours, note } = body;

    if (!job_id || !log_date || hours === undefined) {
      return NextResponse.json(
        { error: 'job_id, log_date, and hours are required' },
        { status: 400 }
      );
    }

    // Verify job ownership
    const jobResult = await db.execute({
      sql: 'SELECT user_id FROM jobs WHERE id = ?',
      args: [job_id],
    });
    const job = jobResult.rows[0] as unknown as { user_id: string } | undefined;
    if (!job || job.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await db.execute({
      sql: 'INSERT INTO hours_log (job_id, log_date, hours, note) VALUES (?, ?, ?, ?)',
      args: [job_id, log_date, hours, note || null],
    });

    const newEntry = await db.execute({
      sql: 'SELECT * FROM hours_log WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json(newEntry.rows[0] as unknown as HoursLog, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create hours log entry' }, { status: 500 });
  }
}
