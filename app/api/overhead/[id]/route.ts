import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute({
      sql: 'DELETE FROM overhead WHERE id = ?',
      args: [id]
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
    const { id } = await params;
    const body = await request.json();
    const { description, amount, category, expense_date } = body;

    await db.execute({
      sql: 'UPDATE overhead SET description = ?, amount = ?, category = ?, expense_date = ? WHERE id = ?',
      args: [description, amount, category || null, expense_date, id]
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
