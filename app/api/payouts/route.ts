import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';
import { ledgerVisible } from '@/lib/ledgerVisibility';
import {
  isPayType,
  isRole,
  isStatus,
  materializeAmount,
  normalizeName,
  type PayType,
  type PayoutStatus,
} from '@/lib/crew';

// ONE crew-payout resource, replacing the old labor + sub_payouts split.
// Every row says who worked, whether they led or assisted, how the money was
// figured (flat or hourly), and where it stands (planned / agreed / paid).

const SELECT_PAYOUT = `SELECT p.*, c.name AS crew_name, c.kind AS crew_kind
                       FROM payouts p
                       LEFT JOIN crew c ON c.id = p.crew_id`;

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    const result = await db.execute({
      sql: `${SELECT_PAYOUT}
            INNER JOIN jobs j ON p.job_id = j.id
            WHERE j.user_id = ?${jobId ? ' AND p.job_id = ?' : ledgerVisible()}
            ORDER BY p.created_at DESC, p.id DESC`,
      args: jobId ? [userId, jobId] : [userId],
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const {
      job_id,
      crew_id,
      crew_name,
      role,
      pay_type,
      hours,
      rate,
      amount,
      status,
      source,
      paid_via,
      paid_date,
      notes,
    } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Role is never inferred: the books have to say whether you ran this job or
    // someone else did, and guessing that server-side would quietly get it wrong.
    if (!isRole(role)) {
      return NextResponse.json(
        { error: 'Role is required — say whether they led the job or assisted.' },
        { status: 400 }
      );
    }

    const payType: PayType = isPayType(pay_type) ? pay_type : 'flat';
    const payStatus: PayoutStatus = isStatus(status) ? status : 'planned';

    // Bank-paid money (Zelle, check, card) is matched from the bank feed in the
    // CNJ dashboard; typing it here is how amounts got double-logged before.
    const via = String(paid_via || '').trim().toLowerCase();
    if (via && via !== 'cash') {
      return NextResponse.json(
        {
          error: `Don't log ${paid_via} payouts here. Record the agreed amount and match the ${paid_via} in the CNJ dashboard Money tab, or pick Cash.`,
        },
        { status: 400 }
      );
    }
    const isCash = via === 'cash';

    // Verify job ownership.
    const jobCheck = await db.execute({
      sql: 'SELECT user_id FROM jobs WHERE id = ?',
      args: [String(job_id)],
    });
    if (
      jobCheck.rows.length === 0 ||
      (jobCheck.rows[0] as unknown as { user_id: string }).user_id !== userId
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Resolve the crew member: an explicit id, or a typed name that matches an
    // existing row (normalized) — and failing that, a brand new crew row.
    let crewId: number | null = null;
    if (crew_id !== undefined && crew_id !== null && String(crew_id) !== '') {
      const existing = await db.execute({
        sql: 'SELECT id FROM crew WHERE id = ?',
        args: [String(crew_id)],
      });
      if (existing.rows.length === 0) {
        return NextResponse.json({ error: 'Crew member not found' }, { status: 404 });
      }
      crewId = Number((existing.rows[0] as unknown as { id: number }).id);
    } else if (typeof crew_name === 'string' && crew_name.trim() !== '') {
      // Normalizing in SQL can't be trusted across whitespace shapes, and the
      // roster is small (a handful of people), so match in JS.
      const normalized = normalizeName(crew_name);
      const all = await db.execute('SELECT id, name FROM crew');
      const hit = all.rows.find(
        (r) => normalizeName(String((r as unknown as { name: string }).name)) === normalized
      );
      if (hit) {
        crewId = Number((hit as unknown as { id: number }).id);
      } else {
        const nowTs = new Date().toISOString();
        const created = await db.execute({
          sql: 'INSERT INTO crew (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)',
          args: [crew_name.trim(), 'person', nowTs, nowTs],
        });
        crewId = Number(created.lastInsertRowid);
      }
    }

    if (!crewId) {
      return NextResponse.json(
        { error: 'Pick a crew member or type a name.' },
        { status: 400 }
      );
    }

    const finalAmount = materializeAmount({
      pay_type: payType,
      hours: hours ?? null,
      rate: rate ?? null,
      amount: amount ?? null,
    });

    const now = new Date().toISOString();
    const result = await db.execute({
      sql: `INSERT INTO payouts
              (job_id, crew_id, role, pay_type, hours, rate, amount, status,
               source, paid_via, paid_date, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        String(job_id),
        crewId,
        role,
        payType,
        payType === 'hourly' ? Number(hours ?? 0) : null,
        rate != null ? Number(rate) : null,
        finalAmount,
        payStatus,
        source || (isCash ? 'cash' : null),
        isCash ? 'cash' : null,
        paid_date || null,
        notes || null,
        now,
        now,
      ],
    });

    const created = await db.execute({
      sql: `${SELECT_PAYOUT} WHERE p.id = ?`,
      args: [String(result.lastInsertRowid)],
    });

    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating payout:', error);
    return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 });
  }
}
