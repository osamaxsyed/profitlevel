import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { isKind } from '@/lib/crew';

const FIELDS = [
  'name',
  'phone',
  'kind',
  'default_pay',
  'default_rate',
  'needs_name',
  'blocked',
  'active',
  'w9_on_file',
  'hic_number',
  'hic_verified',
  'coi_gl_expiry',
  'wc_status',
  'notes',
] as const;

/** Columns stored as 0/1 rather than text. */
const FLAGS = new Set(['needs_name', 'blocked', 'active', 'w9_on_file']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getUserId();
    const { id } = await params;
    const body = await request.json();

    const existing = await db.execute({
      sql: 'SELECT id FROM crew WHERE id = ?',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Crew member not found' }, { status: 404 });
    }

    if ('kind' in body && !isKind(body.kind)) {
      return NextResponse.json({ error: 'Kind must be "person" or "crew".' }, { status: 400 });
    }

    // Only update the fields the caller actually sent.
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    for (const field of FIELDS) {
      if (!(field in body)) continue;
      sets.push(`${field} = ?`);
      const v = body[field];
      if (FLAGS.has(field)) {
        args.push(v ? 1 : 0);
      } else if (field === 'default_rate') {
        args.push(v === null || v === undefined || v === '' ? null : Number(v));
      } else {
        args.push(v || null);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    sets.push('updated_at = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE crew SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: 'SELECT * FROM crew WHERE id = ?',
      args: [id],
    });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating crew member:', error);
    return NextResponse.json({ error: 'Failed to update crew member' }, { status: 500 });
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
      sql: 'SELECT id FROM crew WHERE id = ?',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Crew member not found' }, { status: 404 });
    }

    // Refuse to delete anyone who still has payout history — it would orphan
    // the payout rows and break the 1099 totals. Deactivate them instead.
    const payoutCount = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM payouts WHERE crew_id = ?',
      args: [id],
    });
    const count = Number((payoutCount.rows[0] as unknown as { count: number }).count);
    if (count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: this crew member has ${count} payout${count === 1 ? '' : 's'} on record. Mark them inactive instead.`,
        },
        { status: 409 }
      );
    }

    await db.execute({ sql: 'DELETE FROM crew WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting crew member:', error);
    return NextResponse.json({ error: 'Failed to delete crew member' }, { status: 500 });
  }
}
