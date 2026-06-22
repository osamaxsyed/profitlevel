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
      sql: 'SELECT user_id FROM jobs WHERE id = ?',
      args: [id],
    });

    if (job.rows.length === 0 || (job.rows[0] as any).user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    const { name, client_name, contract_price, job_date, day_units } = body;

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

    await db.execute({
      sql: 'UPDATE jobs SET name = ?, client_name = ?, contract_price = ?, job_date = ?, day_units = ? WHERE id = ?',
      args: [name, client_name || null, contract_price, job_date, dayUnitsValue, id],
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
