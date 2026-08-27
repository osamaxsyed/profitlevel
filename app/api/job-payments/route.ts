import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { JobPayment } from '@/lib/types';
import { getUserId } from '@/lib/auth';
import { ledgerVisible } from '@/lib/ledgerVisibility';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    const sql = `SELECT p.*
                 FROM job_payments p
                 INNER JOIN jobs j ON p.job_id = j.id
                 WHERE j.user_id = ?${jobId ? ' AND p.job_id = ?' : ledgerVisible()}
                 ORDER BY COALESCE(p.paid_date, p.created_at) DESC, p.id DESC`;

    const result = await db.execute({
      sql,
      args: jobId ? [userId, jobId] : [userId],
    });

    const payments = result.rows as unknown as JobPayment[];

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching job payments:', error);
    return NextResponse.json({ error: 'Failed to fetch job payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { job_id, amount, method, paid_date, note } = body;

    if (!job_id || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Job ID and amount are required' },
        { status: 400 }
      );
    }

    // Verify job ownership
    const jobCheck = await db.execute({
      sql: 'SELECT user_id FROM jobs WHERE id = ?',
      args: [String(job_id)],
    });

    if (jobCheck.rows.length === 0 || (jobCheck.rows[0] as any).user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await db.execute({
      sql: 'INSERT INTO job_payments (job_id, amount, method, paid_date, note) VALUES (?, ?, ?, ?, ?)',
      args: [String(job_id), amount, method || null, paid_date || null, note || null],
    });

    const created = await db.execute({
      sql: 'SELECT * FROM job_payments WHERE id = ?',
      args: [String(result.lastInsertRowid)],
    });

    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating job payment:', error);
    return NextResponse.json({ error: 'Failed to create job payment' }, { status: 500 });
  }
}
