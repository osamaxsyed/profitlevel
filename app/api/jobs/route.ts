import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Job, JobWithCosts } from '@/lib/types';
import { getUserId } from '@/lib/auth';
import { parseTargets, parseDayUnits, evaluateJob } from '@/lib/dayRate';
import { ledgerVisible } from '@/lib/ledgerVisibility';
import { resolveContactId, toE164 } from '@/lib/resolveContact';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    // amount_paid uses a legacy fallback: jobs booked before job_payments existed have
    // no payment rows but do carry paid_via, and those count as paid in full.
    const amountPaidExpr = `CASE
          WHEN pay.total IS NULL AND j.paid_via IS NOT NULL THEN j.contract_price
          ELSE COALESCE(pay.total, 0)
        END`;

    let query = `
      SELECT
        j.*,
        COALESCE(mat.total, 0) as materials_total,
        COALESCE(mil.total, 0) as mileage_total,
        COALESCE(cw.total, 0) as crew_cost,
        COALESCE(cw.planned, 0) as crew_planned,
        COALESCE(hl.total_hours, 0) as hours_logged,
        j.contract_price -
          COALESCE(mat.total, 0) -
          COALESCE(mil.total, 0) -
          COALESCE(cw.total, 0) as gross_profit,
        CASE
          WHEN COALESCE(hl.total_hours, j.hours_spent, 0) > 0 THEN
            (j.contract_price - COALESCE(mat.total, 0) - COALESCE(mil.total, 0) - COALESCE(cw.total, 0)) / COALESCE(hl.total_hours, j.hours_spent)
          ELSE NULL
        END as gross_hourly_rate,
        ${amountPaidExpr} as amount_paid,
        MAX(j.contract_price - (${amountPaidExpr}), 0) as outstanding,
        (${amountPaidExpr})
          - COALESCE(mat.total, 0)
          - COALESCE(cw.total, 0) as cash_position,
        CASE WHEN COALESCE(cw.cnt, 0) > 0 THEN 1 ELSE 0 END as has_crew
      FROM jobs j
      LEFT JOIN (
        SELECT job_id, SUM(cost + tax) as total
        FROM materials
        GROUP BY job_id
      ) mat ON j.id = mat.job_id
      LEFT JOIN (
        SELECT job_id, SUM(miles * rate) as total
        FROM mileage
        GROUP BY job_id
      ) mil ON j.id = mil.job_id
      LEFT JOIN (
        SELECT job_id, SUM(hours) as total_hours
        FROM hours_log
        GROUP BY job_id
      ) hl ON j.id = hl.job_id
      LEFT JOIN (
        SELECT job_id,
          SUM(CASE WHEN status <> 'planned' THEN amount ELSE 0 END) as total,
          SUM(CASE WHEN status = 'planned' THEN amount ELSE 0 END) as planned,
          COUNT(*) as cnt
        FROM payouts
        GROUP BY job_id
      ) cw ON j.id = cw.job_id
      LEFT JOIN (
        SELECT job_id, SUM(amount) as total
        FROM job_payments
        GROUP BY job_id
      ) pay ON j.id = pay.job_id
      WHERE j.user_id = ?${ledgerVisible()}
    `;

    const args = [userId];

    if (month) {
      query += ` AND strftime('%Y-%m', j.job_date) = ?`;
      args.push(month);
    }

    query += ` ORDER BY j.job_date DESC, j.created_at DESC`;

    const result = await db.execute({ sql: query, args });

    // Day-rate evaluation: target = sum of day_units' tier rates, judged vs gross_profit.
    const targetsRow = await db.execute({
      sql: 'SELECT value FROM settings WHERE key = ? AND user_id = ?',
      args: ['day_rate_targets', userId],
    });
    const targets = parseTargets((targetsRow.rows[0] as { value?: string } | undefined)?.value);

    // Per-job crew payout detail, fetched once for the whole result set.
    const payoutRowsResult = await db.execute({
      sql: `SELECT p.id, p.job_id, p.crew_id, c.name as crew_name, c.kind as crew_kind,
                   p.role, p.pay_type, p.hours, p.rate, p.amount, p.status,
                   p.source, p.paid_via, p.paid_date, p.notes
            FROM payouts p
            INNER JOIN jobs j ON p.job_id = j.id
            LEFT JOIN crew c ON p.crew_id = c.id
            WHERE j.user_id = ?${ledgerVisible()}
            ORDER BY p.id`,
      args: [userId],
    });

    const payoutsByJob = new Map<number, Record<string, unknown>[]>();
    for (const row of payoutRowsResult.rows) {
      const r = row as Record<string, unknown>;
      const jobId = Number(r.job_id);
      const list = payoutsByJob.get(jobId) ?? [];
      list.push({
        id: Number(r.id),
        job_id: jobId,
        crew_id: Number(r.crew_id),
        crew_name: r.crew_name ?? null,
        crew_kind: r.crew_kind ?? 'person',
        role: r.role ?? null,
        pay_type: r.pay_type ?? 'flat',
        hours: r.hours == null ? null : Number(r.hours),
        rate: r.rate == null ? null : Number(r.rate),
        amount: Number(r.amount ?? 0),
        status: r.status ?? 'planned',
        source: r.source ?? null,
        paid_via: r.paid_via ?? null,
        paid_date: r.paid_date ?? null,
        notes: r.notes ?? null,
      });
      payoutsByJob.set(jobId, list);
    }

    const enriched = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      const units = parseDayUnits(r.day_units as string | null);
      const gross = Number(r.gross_profit ?? 0);
      const dayRate = evaluateJob(units, gross, targets);

      const contractPrice = Number(r.contract_price ?? 0);
      const amountPaid = Number(r.amount_paid ?? 0);
      const outstanding = Number(r.outstanding ?? 0);

      // Float-tolerant: anything within half a cent of settled counts as paid.
      let paidStatus: 'paid' | 'partial' | 'unpaid';
      if (outstanding <= 0.005) {
        paidStatus = 'paid';
      } else if (amountPaid > 0 && amountPaid < contractPrice) {
        paidStatus = 'partial';
      } else {
        paidStatus = 'unpaid';
      }

      return {
        ...r,
        day_units: units,
        day_rate: dayRate,
        crew_cost: Number(r.crew_cost ?? 0),
        crew_planned: Number(r.crew_planned ?? 0),
        payouts: payoutsByJob.get(Number(r.id)) ?? [],
        amount_paid: amountPaid,
        outstanding,
        cash_position: Number(r.cash_position ?? 0),
        has_crew: Number(r.has_crew ?? 0) === 1,
        paid_status: paidStatus,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { name, client_name, contract_price, job_date, day_units, paid_via, paid_date, phone, stage: stageIn } = body;

    if (!name || contract_price === undefined || !job_date) {
      return NextResponse.json(
        { error: 'Name, contract price, and job date are required' },
        { status: 400 }
      );
    }

    // day_units may arrive as an object ({"full":1}) or a JSON string; normalize to a string.
    const dayUnitsValue =
      day_units == null ? null : typeof day_units === 'string' ? day_units : JSON.stringify(day_units);

    // Jobs migration (2026-08-27): a job typed in here is a real, sold job, so it
    // is born ledger-visible. `Won` by default; `Done` when the form says the work
    // is finished (explicit stage, or a paid_via/paid_date that says it settled).
    const requested = String(stageIn ?? '').trim();
    const looksDone = requested === 'Done' || (!requested && (!!paid_via || !!paid_date));
    const stage = requested === 'Won' || requested === 'Scheduled' || requested === 'Done'
      ? requested
      : looksDone ? 'Done' : 'Won';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const now = new Date().toISOString();
    const contactId = await resolveContactId(client_name, phone);

    const result = await db.execute({
      sql: `INSERT INTO jobs
              (name, client_name, contract_price, job_date, day_units, paid_via, paid_date, user_id,
               stage, date_in, source, contact_id, phone, closed_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ProfitLevel', ?, ?, ?, ?)`,
      args: [
        name, client_name || null, contract_price, job_date, dayUnitsValue, paid_via || null, paid_date || null, userId,
        stage, today, contactId, toE164(phone), stage === 'Done' ? now : null, now,
      ],
    });

    const jobId = Number(result.lastInsertRowid);
    // Every stage change by anyone appends an event (spec, job_events).
    await db.execute({
      sql: 'INSERT INTO job_events (job_id, stage, at, source, note) VALUES (?, ?, ?, ?, ?)',
      args: [jobId, stage, now, 'profitlevel', 'created in ProfitLevel'],
    });

    const newJobResult = await db.execute({
      sql: 'SELECT * FROM jobs WHERE id = ?',
      args: [jobId],
    });

    return NextResponse.json(newJobResult.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
