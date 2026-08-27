import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    const sql = `SELECT sp.*, s.name as sub_name
                 FROM sub_payouts sp
                 INNER JOIN jobs j ON sp.job_id = j.id
                 LEFT JOIN subs s ON sp.sub_id = s.id
                 WHERE j.user_id = ?${jobId ? ' AND sp.job_id = ?' : ''}
                 ORDER BY sp.created_at DESC`;

    const result = await db.execute({
      sql,
      args: jobId ? [userId, jobId] : [userId],
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching sub payouts:', error);
    return NextResponse.json({ error: 'Failed to fetch sub payouts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { job_id, sub_id, payout, paid_via, paid_date, notes } = body;
    // Bank-paid payouts (Zelle, check, Venmo, ACH, card) are matched from the bank feed in
    // the CNJ dashboard and must not be typed here (that is how amounts got double-logged).
    const via = String(paid_via || '').trim().toLowerCase();
    if (via && via !== 'cash') {
      return NextResponse.json({ error: `Don't log ${paid_via} payouts here. Log the AGREED amount (leave payment blank) and match the ${paid_via} in the CNJ dashboard Money tab, or pick Cash.` }, { status: 400 });
    }
    const isCash = via === 'cash';

    if (!job_id || !sub_id || payout === undefined || payout === null) {
      return NextResponse.json(
        { error: 'Job ID, sub ID, and payout are required' },
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

    // Verify the sub exists
    const subCheck = await db.execute({
      sql: 'SELECT id FROM subs WHERE id = ?',
      args: [String(sub_id)],
    });

    if (subCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Sub not found' }, { status: 404 });
    }

    const result = await db.execute({
      sql: `INSERT INTO sub_payouts (job_id, sub_id, payout, paid_via, paid_date, notes, status, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        String(job_id),
        String(sub_id),
        payout,
        isCash ? 'cash' : null,
        isCash ? (paid_date || null) : null,
        notes || null,
        isCash ? 'paid' : 'agreed',
        isCash ? 'cash' : null,
      ],
    });

    const created = await db.execute({
      sql: `SELECT sp.*, s.name as sub_name
            FROM sub_payouts sp
            LEFT JOIN subs s ON sp.sub_id = s.id
            WHERE sp.id = ?`,
      args: [String(result.lastInsertRowid)],
    });

    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating sub payout:', error);
    return NextResponse.json({ error: 'Failed to create sub payout' }, { status: 500 });
  }
}
