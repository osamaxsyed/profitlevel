import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Labor } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    let result;
    if (jobId) {
      result = await db.execute({
        sql: 'SELECT * FROM labor WHERE job_id = ? ORDER BY created_at DESC',
        args: [jobId]
      });
    } else {
      result = await db.execute('SELECT * FROM labor ORDER BY created_at DESC');
    }

    const labor = result.rows as unknown as Labor[];

    return NextResponse.json(labor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch labor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { job_id, helper_name, hours, rate, is_flat_rate } = body;

    if (!job_id || !helper_name || rate === undefined) {
      return NextResponse.json(
        { error: 'Job ID, helper name, and rate are required' },
        { status: 400 }
      );
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
