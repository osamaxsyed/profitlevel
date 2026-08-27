import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { SubWithTotals } from '@/lib/types';
import { getUserId } from '@/lib/auth';

// subs has no user_id column (single-user app), but the Clerk guard still applies.
export async function GET() {
  try {
    await getUserId();

    const result = await db.execute({
      sql: `SELECT
        s.*,
        COALESCE(ytd.total, 0) as ytd_paid,
        COALESCE(ytd.jobs_count, 0) as jobs_count
      FROM subs s
      LEFT JOIN (
        SELECT sub_id,
          SUM(payout) as total,
          COUNT(DISTINCT job_id) as jobs_count
        FROM sub_payouts
        WHERE strftime('%Y', COALESCE(paid_date, created_at)) = strftime('%Y', 'now')
        GROUP BY sub_id
      ) ytd ON s.id = ytd.sub_id
      ORDER BY s.name`,
      args: [],
    });

    const subs = result.rows as unknown as SubWithTotals[];

    return NextResponse.json(subs);
  } catch (error) {
    console.error('Error fetching subs:', error);
    return NextResponse.json({ error: 'Failed to fetch subs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await getUserId();
    const body = await request.json();
    const { name, phone, w9_on_file, hic_number, hic_verified, coi_gl_expiry, wc_status, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await db.execute({
      sql: `INSERT INTO subs (name, phone, w9_on_file, hic_number, hic_verified, coi_gl_expiry, wc_status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name,
        phone || null,
        w9_on_file ? 1 : 0,
        hic_number || null,
        hic_verified || null,
        coi_gl_expiry || null,
        wc_status || null,
        notes || null,
      ],
    });

    const newSub = await db.execute({
      sql: 'SELECT * FROM subs WHERE id = ?',
      args: [String(result.lastInsertRowid)],
    });

    return NextResponse.json(newSub.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating sub:', error);
    return NextResponse.json({ error: 'Failed to create sub' }, { status: 500 });
  }
}
