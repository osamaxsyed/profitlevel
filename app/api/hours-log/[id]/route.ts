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

    const entry = await db.execute({
      sql: `SELECT hl.id FROM hours_log hl
            INNER JOIN jobs j ON hl.job_id = j.id
            WHERE hl.id = ? AND j.user_id = ?`,
      args: [id, userId],
    });

    if (entry.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({ sql: 'DELETE FROM hours_log WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete hours log entry' }, { status: 500 });
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
    const { log_date, hours, note } = body;

    const entry = await db.execute({
      sql: `SELECT hl.id FROM hours_log hl
            INNER JOIN jobs j ON hl.job_id = j.id
            WHERE hl.id = ? AND j.user_id = ?`,
      args: [id, userId],
    });

    if (entry.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({
      sql: 'UPDATE hours_log SET log_date = ?, hours = ?, note = ? WHERE id = ?',
      args: [log_date, hours, note || null, id],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM hours_log WHERE id = ?',
      args: [id],
    });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update hours log entry' }, { status: 500 });
  }
}
