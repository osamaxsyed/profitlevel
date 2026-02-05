import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute({
      sql: 'DELETE FROM jobs WHERE id = ?',
      args: [id],
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
    const { id } = await params;
    const body = await request.json();
    const { name, client_name, contract_price, job_date, hours_spent } = body;

    // Get the old job_date to check if it changed
    const oldJobResult = await db.execute({
      sql: 'SELECT job_date FROM jobs WHERE id = ?',
      args: [id],
    });
    const oldJob = oldJobResult.rows[0] as { job_date: string } | undefined;

    await db.execute({
      sql: 'UPDATE jobs SET name = ?, client_name = ?, contract_price = ?, job_date = ?, hours_spent = ? WHERE id = ?',
      args: [name, client_name || null, contract_price, job_date, hours_spent || null, id],
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

      const rate = (irsRateResult.rows[0] as { rate: number })?.rate || 0.67;

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
