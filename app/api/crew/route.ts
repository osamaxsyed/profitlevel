import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { CrewWithTotals } from '@/lib/types';
import { getUserId } from '@/lib/auth';
import { isKind } from '@/lib/crew';

// The crew roster: everyone the owner pays, person or crew, with the YTD money
// and the compliance paperwork owed on each. `crew` has no user_id (single-user
// app), but the Clerk guard still applies.

export async function GET() {
  try {
    await getUserId();

    const result = await db.execute({
      sql: `SELECT
        c.*,
        COALESCE(ytd.total, 0) as ytd_paid,
        COALESCE(ytd.planned, 0) as ytd_planned,
        COALESCE(ytd.jobs_count, 0) as jobs_count
      FROM crew c
      LEFT JOIN (
        SELECT crew_id,
          SUM(CASE WHEN status <> 'planned' THEN amount ELSE 0 END) as total,
          SUM(CASE WHEN status = 'planned' THEN amount ELSE 0 END) as planned,
          COUNT(DISTINCT job_id) as jobs_count
        FROM payouts
        WHERE strftime('%Y', COALESCE(paid_date, created_at)) = strftime('%Y', 'now')
        GROUP BY crew_id
      ) ytd ON c.id = ytd.crew_id
      ORDER BY c.active DESC, c.name`,
      args: [],
    });

    return NextResponse.json(result.rows as unknown as CrewWithTotals[]);
  } catch (error) {
    console.error('Error fetching crew:', error);
    return NextResponse.json({ error: 'Failed to fetch crew' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await getUserId();
    const body = await request.json();
    const {
      name,
      phone,
      kind,
      default_pay,
      default_rate,
      needs_name,
      blocked,
      active,
      w9_on_file,
      hic_number,
      hic_verified,
      coi_gl_expiry,
      wc_status,
      notes,
    } = body;

    if (!name || String(name).trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = await db.execute({
      sql: `INSERT INTO crew
              (name, phone, kind, default_pay, default_rate, notes, blocked, needs_name,
               w9_on_file, hic_number, hic_verified, coi_gl_expiry, wc_status, active,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        String(name).trim(),
        phone || null,
        isKind(kind) ? kind : 'person',
        default_pay || null,
        default_rate != null && default_rate !== '' ? Number(default_rate) : null,
        notes || null,
        blocked ? 1 : 0,
        needs_name ? 1 : 0,
        w9_on_file ? 1 : 0,
        hic_number || null,
        hic_verified || null,
        coi_gl_expiry || null,
        wc_status || null,
        active === undefined ? 1 : active ? 1 : 0,
        now,
        now,
      ],
    });

    const created = await db.execute({
      sql: 'SELECT * FROM crew WHERE id = ?',
      args: [String(result.lastInsertRowid)],
    });

    return NextResponse.json(created.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating crew member:', error);
    return NextResponse.json({ error: 'Failed to create crew member' }, { status: 500 });
  }
}
