import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

const FIELDS = [
  'name',
  'phone',
  'w9_on_file',
  'hic_number',
  'hic_verified',
  'coi_gl_expiry',
  'wc_status',
  'notes',
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getUserId();
    const { id } = await params;
    const body = await request.json();

    const existing = await db.execute({
      sql: 'SELECT id FROM subs WHERE id = ?',
      args: [id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Sub not found' }, { status: 404 });
    }

    // Only update the fields the caller actually sent.
    const sets: string[] = [];
    const args: any[] = [];
    for (const field of FIELDS) {
      if (!(field in body)) continue;
      sets.push(`${field} = ?`);
      if (field === 'w9_on_file') {
        args.push(body[field] ? 1 : 0);
      } else {
        args.push(body[field] || null);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    args.push(id);

    await db.execute({
      sql: `UPDATE subs SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: 'SELECT * FROM subs WHERE id = ?',
      args: [id],
    });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sub:', error);
    return NextResponse.json({ error: 'Failed to update sub' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getUserId();
    const { id } = await params;

    const existing = await db.execute({
      sql: 'SELECT id FROM subs WHERE id = ?',
      args: [id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Sub not found' }, { status: 404 });
    }

    // Refuse to delete a sub that still has payout history - it would orphan
    // the payout rows and break 1099 totals.
    const payoutCount = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM sub_payouts WHERE sub_id = ?',
      args: [id],
    });

    const count = Number((payoutCount.rows[0] as any).count);
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this sub has ${count} payout${count === 1 ? '' : 's'} on record.` },
        { status: 409 }
      );
    }

    await db.execute({
      sql: 'DELETE FROM subs WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sub:', error);
    return NextResponse.json({ error: 'Failed to delete sub' }, { status: 500 });
  }
}
