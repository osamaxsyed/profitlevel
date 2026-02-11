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

    // Verify ownership via job
    const mileage = await db.execute({
      sql: `SELECT m.id FROM mileage m
            INNER JOIN jobs j ON m.job_id = j.id
            WHERE m.id = ? AND j.user_id = ?`,
      args: [id, userId]
    });

    if (mileage.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({
      sql: 'DELETE FROM mileage WHERE id = ?',
      args: [id]
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete mileage entry' }, { status: 500 });
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
    const { miles } = body;

    // Verify ownership via job
    const mileage = await db.execute({
      sql: `SELECT m.id FROM mileage m
            INNER JOIN jobs j ON m.job_id = j.id
            WHERE m.id = ? AND j.user_id = ?`,
      args: [id, userId]
    });

    if (mileage.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({
      sql: 'UPDATE mileage SET miles = ? WHERE id = ?',
      args: [miles, id]
    });

    const result = await db.execute({
      sql: 'SELECT * FROM mileage WHERE id = ?',
      args: [id]
    });

    const updated = result.rows[0];
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update mileage entry' }, { status: 500 });
  }
}
