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

    // Verify ownership via the payment's job
    const owned = await db.execute({
      sql: `SELECT p.id FROM job_payments p
            INNER JOIN jobs j ON p.job_id = j.id
            WHERE p.id = ? AND j.user_id = ?`,
      args: [id, userId],
    });

    if (owned.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.execute({
      sql: 'DELETE FROM job_payments WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job payment:', error);
    return NextResponse.json({ error: 'Failed to delete job payment' }, { status: 500 });
  }
}
