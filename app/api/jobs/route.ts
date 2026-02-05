import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Job, JobWithCosts } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    let query = `
      SELECT
        j.*,
        COALESCE(mat.total, 0) as materials_total,
        COALESCE(lab.total, 0) as labor_total,
        COALESCE(mil.total, 0) as mileage_total,
        j.contract_price -
          COALESCE(mat.total, 0) -
          COALESCE(lab.total, 0) -
          COALESCE(mil.total, 0) as gross_profit,
        CASE
          WHEN j.hours_spent > 0 THEN
            (j.contract_price - COALESCE(mat.total, 0) - COALESCE(lab.total, 0) - COALESCE(mil.total, 0)) / j.hours_spent
          ELSE NULL
        END as gross_hourly_rate
      FROM jobs j
      LEFT JOIN (
        SELECT job_id, SUM(cost + tax) as total
        FROM materials
        GROUP BY job_id
      ) mat ON j.id = mat.job_id
      LEFT JOIN (
        SELECT job_id, SUM(CASE WHEN is_flat_rate = 1 THEN rate ELSE hours * rate END) as total
        FROM labor
        GROUP BY job_id
      ) lab ON j.id = lab.job_id
      LEFT JOIN (
        SELECT job_id, SUM(miles * rate) as total
        FROM mileage
        GROUP BY job_id
      ) mil ON j.id = mil.job_id
    `;

    if (month) {
      query += ` WHERE strftime('%Y-%m', j.job_date) = ?`;
    }

    query += ` ORDER BY j.job_date DESC, j.created_at DESC`;

    const result = month
      ? await db.execute({ sql: query, args: [month] })
      : await db.execute(query);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, client_name, contract_price, job_date, hours_spent } = body;

    if (!name || contract_price === undefined || !job_date) {
      return NextResponse.json(
        { error: 'Name, contract price, and job date are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO jobs (name, client_name, contract_price, job_date, hours_spent) VALUES (?, ?, ?, ?, ?)',
      args: [name, client_name || null, contract_price, job_date, hours_spent || null],
    });

    const newJobResult = await db.execute({
      sql: 'SELECT * FROM jobs WHERE id = ?',
      args: [result.lastInsertRowid],
    });

    return NextResponse.json(newJobResult.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
