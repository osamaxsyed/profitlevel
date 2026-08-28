import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Payee1099 } from '@/lib/types';
import { getUserId } from '@/lib/auth';

// Who got paid, per tax year. Since the crew migration there is one ledger, so
// this is a straight read of v_payee_1099 — no more unioning helpers and subs.
// The view already applies the 1099 threshold from settings (default $2,000).

export async function GET() {
  try {
    await getUserId();

    const result = await db.execute({
      sql: `SELECT crew_id, name, kind, needs_name, yr, total_paid, total_agreed, payments, status
            FROM v_payee_1099
            ORDER BY yr DESC, total_paid DESC`,
      args: [],
    });

    const payees: Payee1099[] = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        crew_id: Number(r.crew_id),
        name: String(r.name ?? ''),
        kind: (r.kind === 'crew' ? 'crew' : 'person') as Payee1099['kind'],
        needs_name: Number(r.needs_name ?? 0) === 1,
        year: String(r.yr ?? ''),
        total_paid: Number(r.total_paid ?? 0),
        total_agreed: Number(r.total_agreed ?? 0),
        payments: Number(r.payments ?? 0),
        needs_1099: String(r.status ?? '') === '1099-NEC REQUIRED',
      };
    });

    return NextResponse.json(payees);
  } catch (error) {
    console.error('Error fetching 1099 payees:', error);
    return NextResponse.json({ error: 'Failed to fetch 1099 payees' }, { status: 500 });
  }
}
