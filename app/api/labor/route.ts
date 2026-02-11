import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Labor } from '@/lib/types';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    let result;
    if (jobId) {
      // Verify job ownership and get labor
      result = await db.execute({
        sql: `SELECT l.* FROM labor l
              INNER JOIN jobs j ON l.job_id = j.id
              WHERE l.job_id = ? AND j.user_id = ?
              ORDER BY l.created_at DESC`,
        args: [jobId, userId]
      });
    } else {
      // Get all labor for user's jobs
      result = await db.execute({
        sql: `SELECT l.* FROM labor l
              INNER JOIN jobs j ON l.job_id = j.id
              WHERE j.user_id = ?
              ORDER BY l.created_at DESC`,
        args: [userId]
      });
    }

    const labor = result.rows as unknown as Labor[];

    return NextResponse.json(labor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch labor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { job_id, helper_name, hours, rate, is_flat_rate } = body;

    if (!job_id || !helper_name || rate === undefined) {
      return NextResponse.json(
        { error: 'Job ID, helper name, and rate are required' },
        { status: 400 }
      );
    }

    // Verify job ownership
    const jobCheck = await db.execute({
      sql: 'SELECT user_id FROM jobs WHERE id = ?',
      args: [job_id]
    });

    if (jobCheck.rows.length === 0 || (jobCheck.rows[0] as any).user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await db.execute({
      sql: 'INSERT INTO labor (job_id, helper_name, hours, rate, is_flat_rate) VALUES (?, ?, ?, ?, ?)',
      args: [job_id, helper_name, hours || 0, rate, is_flat_rate ? 1 : 0]
    });

    const laborResult = await db.execute({
      sql: 'SELECT * FROM labor WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    });

    const newLabor = laborResult.rows[0] as unknown as Labor;

    return NextResponse.json(newLabor, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create labor entry' }, { status: 500 });
  }
}
