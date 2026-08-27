import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserId } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    // Verify ownership
    const job = await db.execute({
      sql: 'SELECT user_id, crm_id FROM jobs WHERE id = ?',
      args: [id],
    });

    if (job.rows.length === 0 || (job.rows[0] as any).user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Jobs migration (2026-08-27): a job row is also the CRM thread — it can own
    // calendar events, messages, tasks and stage history that a hard DELETE would
    // orphan. Rule 2 says the way to remove a job from view is an off-ramp stage
    // (Lost / Duplicate / Spam), not a delete. So a job with a CRM life is refused;
    // a plain hand-typed cash job with nothing hanging off it still deletes.
    const linked = await db.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM dispatch    WHERE job_id = ?) AS events,
              (SELECT COUNT(*) FROM job_events  WHERE job_id = ?) AS history,
              (SELECT COUNT(*) FROM messages    WHERE job_id = ?) AS msgs,
              (SELECT COUNT(*) FROM tasks       WHERE job_id = ?) AS tasks`,
      args: [id, id, id, id],
    });
    const l = linked.rows[0] as unknown as { events: number; history: number; msgs: number; tasks: number };
    const hasCrmLife = !!(job.rows[0] as any).crm_id || Number(l.events) > 0 || Number(l.msgs) > 0 || Number(l.tasks) > 0 || Number(l.history) > 0;

    if (hasCrmLife) {
      return NextResponse.json(
        {
          error:
            'This job has calendar events, messages or history attached. Mark it Lost or Duplicate instead of deleting it.',
        },
        { status: 409 }
      );
    }

    await db.execute({
      sql: 'DELETE FROM jobs WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const body = await request.json();
    const { name, client_name, contract_price, job_date, day_units, paid_via, paid_date } = body;

    // day_units may arrive as an object or JSON string; normalize to a string.
    const dayUnitsValue =
      day_units == null ? null : typeof day_units === 'string' ? day_units : JSON.stringify(day_units);

    // Get the old job_date to check if it changed and verify ownership
    const oldJobResult = await db.execute({
      sql: 'SELECT job_date, user_id FROM jobs WHERE id = ?',
      args: [id],
    });
    const oldJob = oldJobResult.rows[0] as unknown as { job_date: string; user_id: string } | undefined;

    if (!oldJob || oldJob.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // paid_via/paid_date are optional: when the caller omits the key entirely we keep
    // whatever is already stored, so existing edit forms don't wipe them out.
    // Passing an explicit null clears the field.
    const paidViaValue = 'paid_via' in body ? paid_via || null : undefined;
    const paidDateValue = 'paid_date' in body ? paid_date || null : undefined;

    const sets = ['name = ?', 'client_name = ?', 'contract_price = ?', 'job_date = ?', 'day_units = ?', 'updated_at = ?'];
    const updateArgs: any[] = [name, client_name || null, contract_price, job_date, dayUnitsValue, new Date().toISOString()];
    if (paidViaValue !== undefined) {
      sets.push('paid_via = ?');
      updateArgs.push(paidViaValue);
    }
    if (paidDateValue !== undefined) {
      sets.push('paid_date = ?');
      updateArgs.push(paidDateValue);
    }
    updateArgs.push(id);

    await db.execute({
      sql: `UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`,
      args: updateArgs,
    });

    // If job_date changed, update mileage rates for this job
    if (oldJob && oldJob.job_date !== job_date) {
      const newYear = new Date(job_date).getFullYear();

      // Get the IRS rate for the new year
      let irsRateResult = await db.execute({
        sql: 'SELECT rate FROM irs_rates WHERE year = ?',
        args: [newYear],
      });

      // If no rate exists for that year, use the most recent available rate
      if (irsRateResult.rows.length === 0) {
        irsRateResult = await db.execute('SELECT rate FROM irs_rates ORDER BY year DESC LIMIT 1');
      }

      const rate = (irsRateResult.rows[0] as unknown as { rate: number })?.rate || 0.67;

      // Update all mileage entries for this job with the new rate
      await db.execute({
        sql: 'UPDATE mileage SET rate = ? WHERE job_id = ?',
        args: [rate, id],
      });
    }

    const updatedResult = await db.execute({
      sql: 'SELECT * FROM jobs WHERE id = ?',
      args: [id],
    });
    return NextResponse.json(updatedResult.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
