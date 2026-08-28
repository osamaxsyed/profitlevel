import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';
import {
  isPayType,
  isRole,
  isStatus,
  materializeAmount,
  type PayType,
} from '@/lib/crew';

const SELECT_PAYOUT = `SELECT p.*, c.name AS crew_name, c.kind AS crew_kind
                       FROM payouts p
                       LEFT JOIN crew c ON c.id = p.crew_id`;

/** Fields a caller may set directly. `amount` is derived, never taken as-is. */
const FIELDS = [
  'crew_id',
  'role',
  'pay_type',
  'hours',
  'rate',
  'status',
  'source',
  'paid_via',
  'paid_date',
  'notes',
] as const;

async function update(
  request: Request,
  params: Promise<{ id: string }>
) {
  const userId = await getUserId();
  const { id } = await params;
  const body = await request.json();

  // Ownership rides on the payout's job.
  const owned = await db.execute({
    sql: `SELECT p.id FROM payouts p
          INNER JOIN jobs j ON p.job_id = j.id
          WHERE p.id = ? AND j.user_id = ?`,
    args: [id, userId],
  });
  if (owned.rows.length === 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Validate whatever the caller actually sent. Role may be changed but never
  // blanked — a payout without a role is not a valid row.
  if ('role' in body && !isRole(body.role)) {
    return NextResponse.json(
      { error: 'Role must be "led" or "assisted".' },
      { status: 400 }
    );
  }
  if ('pay_type' in body && !isPayType(body.pay_type)) {
    return NextResponse.json({ error: 'Pay type must be "flat" or "hourly".' }, { status: 400 });
  }
  if ('status' in body && !isStatus(body.status)) {
    return NextResponse.json(
      { error: 'Status must be "planned", "agreed" or "paid".' },
      { status: 400 }
    );
  }

  const current = await db.execute({
    sql: 'SELECT pay_type, hours, rate, amount FROM payouts WHERE id = ?',
    args: [id],
  });
  const row = current.rows[0] as unknown as {
    pay_type: string;
    hours: number | null;
    rate: number | null;
    amount: number;
  };

  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const field of FIELDS) {
    if (!(field in body)) continue;
    sets.push(`${field} = ?`);
    const v = body[field];
    if (field === 'hours' || field === 'rate') {
      args.push(v === null || v === undefined || v === '' ? null : Number(v));
    } else if (field === 'crew_id') {
      args.push(Number(v));
    } else {
      args.push(v || null);
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // amount stays materialized: recompute it from whatever the row will hold.
  const payType: PayType = isPayType(body.pay_type)
    ? body.pay_type
    : ((row.pay_type as PayType) ?? 'flat');
  const nextHours = 'hours' in body ? body.hours : row.hours;
  const nextRate = 'rate' in body ? body.rate : row.rate;
  const nextAmount = materializeAmount({
    pay_type: payType,
    hours: nextHours ?? null,
    rate: nextRate ?? null,
    amount: 'amount' in body ? body.amount : row.amount,
  });
  sets.push('amount = ?');
  args.push(nextAmount);

  sets.push('updated_at = ?');
  args.push(new Date().toISOString());
  args.push(id);

  await db.execute({
    sql: `UPDATE payouts SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });

  const result = await db.execute({
    sql: `${SELECT_PAYOUT} WHERE p.id = ?`,
    args: [id],
  });

  return NextResponse.json(result.rows[0]);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await update(request, params);
  } catch (error) {
    console.error('Error updating payout:', error);
    return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await update(request, params);
  } catch (error) {
    console.error('Error updating payout:', error);
    return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 });
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
      sql: `SELECT p.id FROM payouts p
            INNER JOIN jobs j ON p.job_id = j.id
            WHERE p.id = ? AND j.user_id = ?`,
      args: [id, userId],
    });
    if (owned.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({ sql: 'DELETE FROM payouts WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payout:', error);
    return NextResponse.json({ error: 'Failed to delete payout' }, { status: 500 });
  }
}
