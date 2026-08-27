import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

const FIELDS = ['sub_id', 'payout', 'paid_via', 'paid_date', 'notes'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const body = await request.json();

    // Verify ownership via the payout's job
    const owned = await db.execute({
      sql: `SELECT sp.id FROM sub_payouts sp
            INNER JOIN jobs j ON sp.job_id = j.id
            WHERE sp.id = ? AND j.user_id = ?`,
      args: [id, userId],
    });

    if (owned.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only update the fields the caller actually sent.
    const sets: string[] = [];
    const args: any[] = [];
    for (const field of FIELDS) {
      if (!(field in body)) continue;
      sets.push(`${field} = ?`);
      if (field === 'payout') {
        args.push(body[field]);
      } else if (field === 'sub_id') {
        args.push(String(body[field]));
      } else {
        args.push(body[field] || null);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    args.push(id);

    await db.execute({
      sql: `UPDATE sub_payouts SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: `SELECT sp.*, s.name as sub_name
            FROM sub_payouts sp
            LEFT JOIN subs s ON sp.sub_id = s.id
            WHERE sp.id = ?`,
      args: [id],
    });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sub payout:', error);
    return NextResponse.json({ error: 'Failed to update sub payout' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    const owned = await db.execute({
      sql: `SELECT sp.id FROM sub_payouts sp
            INNER JOIN jobs j ON sp.job_id = j.id
            WHERE sp.id = ? AND j.user_id = ?`,
      args: [id, userId],
    });

    if (owned.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({
      sql: 'DELETE FROM sub_payouts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sub payout:', error);
    return NextResponse.json({ error: 'Failed to delete sub payout' }, { status: 500 });
  }
}
