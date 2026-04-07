import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Job, JobWithCosts } from '@/lib/types';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    let query = `
      SELECT
        j.*,
        COALESCE(mat.total, 0) as materials_total,
        COALESCE(lab.total, 0) as labor_total,
        COALESCE(mil.total, 0) as mileage_total,
        COALESCE(hl.total_hours, 0) as hours_logged,
        j.contract_price -
          COALESCE(mat.total, 0) -
          COALESCE(lab.total, 0) -
          COALESCE(mil.total, 0) as gross_profit,
        CASE
          WHEN COALESCE(hl.total_hours, j.hours_spent, 0) > 0 THEN
            (j.contract_price - COALESCE(mat.total, 0) - COALESCE(lab.total, 0) - COALESCE(mil.total, 0)) / COALESCE(hl.total_hours, j.hours_spent)
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
      LEFT JOIN (
        SELECT job_id, SUM(hours) as total_hours
        FROM hours_log
        GROUP BY job_id
      ) hl ON j.id = hl.job_id
      WHERE j.user_id = ?
    `;

    const args = [userId];

    if (month) {
      query += ` AND strftime('%Y-%m', j.job_date) = ?`;
      args.push(month);
    }

    query += ` ORDER BY j.job_date DESC, j.created_at DESC`;

    const result = await db.execute({ sql: query, args });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { name, client_name, contract_price, job_date, hours_spent } = body;

    if (!name || contract_price === undefined || !job_date) {
      return NextResponse.json(
        { error: 'Name, contract price, and job date are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO jobs (name, client_name, contract_price, job_date, hours_spent, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      args: [name, client_name || null, contract_price, job_date, hours_spent || null, userId],
    });

    const newJobResult = await db.execute({
      sql: 'SELECT * FROM jobs WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json(newJobResult.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
