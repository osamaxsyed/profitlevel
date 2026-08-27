import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Payee1099 } from '@/lib/types';
import { getUserId } from '@/lib/auth';
import { ledgerVisible } from '@/lib/ledgerVisibility';

// A payee crossing $2,000 in a year needs a 1099-NEC.
const THRESHOLD_1099 = 2000;

export async function GET() {
  try {
    const userId = await getUserId();

    // Everyone the owner pays falls into one of two buckets: hourly/flat helpers
    // recorded as labor, and dispatched subs recorded as sub_payouts. The IRS
    // cares about the person, not the bucket, so union them and group by name.
    const result = await db.execute({
      sql: `SELECT name, yr as year,
              SUM(paid) as total_paid,
              COUNT(*) as payments,
              CASE
                WHEN MIN(source) = MAX(source) THEN MIN(source)
                ELSE 'both'
              END as source
            FROM (
              SELECT l.helper_name AS name,
                     strftime('%Y', l.created_at) AS yr,
                     CASE WHEN l.is_flat_rate = 1 THEN l.rate ELSE l.hours * l.rate END AS paid,
                     'labor' AS source
              FROM labor l
              INNER JOIN jobs j ON l.job_id = j.id
              WHERE j.user_id = ?${ledgerVisible()}
              UNION ALL
              SELECT s.name AS name,
                     strftime('%Y', COALESCE(sp.paid_date, sp.created_at)) AS yr,
                     sp.payout AS paid,
                     'subs' AS source
              FROM sub_payouts sp
              INNER JOIN jobs j ON sp.job_id = j.id
              LEFT JOIN subs s ON sp.sub_id = s.id
              WHERE j.user_id = ?${ledgerVisible()}
            )
            WHERE name IS NOT NULL AND yr IS NOT NULL
            GROUP BY name, yr
            ORDER BY yr DESC, total_paid DESC`,
      args: [userId, userId],
    });

    const payees: Payee1099[] = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      const totalPaid = Number(r.total_paid ?? 0);
      return {
        name: String(r.name),
        year: String(r.year),
        total_paid: Math.round(totalPaid * 100) / 100,
        payments: Number(r.payments ?? 0),
        needs_1099: totalPaid >= THRESHOLD_1099,
        source: r.source as Payee1099['source'],
      };
    });

    return NextResponse.json(payees);
  } catch (error) {
    console.error('Error fetching 1099 payees:', error);
    return NextResponse.json({ error: 'Failed to fetch 1099 payees' }, { status: 500 });
  }
}
