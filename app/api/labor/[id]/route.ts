import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute({
      sql: 'DELETE FROM labor WHERE id = ?',
      args: [id]
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete labor entry' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { helper_name, hours, rate, is_flat_rate } = body;

    await db.execute({
      sql: 'UPDATE labor SET helper_name = ?, hours = ?, rate = ?, is_flat_rate = ? WHERE id = ?',
      args: [helper_name, hours || 0, rate, is_flat_rate ? 1 : 0, id]
    });

    const result = await db.execute({
      sql: 'SELECT * FROM labor WHERE id = ?',
      args: [id]
    });

    const updated = result.rows[0];
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update labor entry' }, { status: 500 });
  }
}
