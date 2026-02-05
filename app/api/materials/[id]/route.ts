import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute({
      sql: 'DELETE FROM materials WHERE id = ?',
      args: [id]
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { item_name, cost, tax } = body;

    await db.execute({
      sql: 'UPDATE materials SET item_name = ?, cost = ?, tax = ? WHERE id = ?',
      args: [item_name, cost, tax || 0, id]
    });

    const result = await db.execute({
      sql: 'SELECT * FROM materials WHERE id = ?',
      args: [id]
    });

    const updated = result.rows[0];
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
  }
}
