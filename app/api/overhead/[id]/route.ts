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
    const overhead = await db.execute({
      sql: 'SELECT user_id FROM overhead WHERE id = ?',
      args: [id],
    });

    if (overhead.rows.length === 0 || (overhead.rows[0] as any).user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({
      sql: 'DELETE FROM overhead WHERE id = ? AND user_id = ?',
      args: [id, userId]
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete overhead entry' }, { status: 500 });
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
    const { description, amount, category, expense_date } = body;

    // Verify ownership
    const overhead = await db.execute({
      sql: 'SELECT user_id FROM overhead WHERE id = ?',
      args: [id],
    });

    if (overhead.rows.length === 0 || (overhead.rows[0] as any).user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({
      sql: 'UPDATE overhead SET description = ?, amount = ?, category = ?, expense_date = ? WHERE id = ? AND user_id = ?',
      args: [description, amount, category || null, expense_date, id, userId]
    });

    const result = await db.execute({
      sql: 'SELECT * FROM overhead WHERE id = ?',
      args: [id]
    });

    const updated = result.rows[0];
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update overhead entry' }, { status: 500 });
  }
}
