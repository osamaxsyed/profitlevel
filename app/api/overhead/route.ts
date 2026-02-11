import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Overhead } from '@/lib/types';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    let result;
    if (month) {
      // Get overhead for specific month
      result = await db.execute({
        sql: `SELECT * FROM overhead
              WHERE user_id = ? AND strftime('%Y-%m', expense_date) = ?
              ORDER BY expense_date DESC`,
        args: [userId, month]
      });
    } else {
      // Get all overhead
      result = await db.execute({
        sql: 'SELECT * FROM overhead WHERE user_id = ? ORDER BY expense_date DESC',
        args: [userId]
      });
    }

    const overhead = result.rows as unknown as Overhead[];

    return NextResponse.json(overhead);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch overhead' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { description, amount, category, expense_date } = body;

    if (!description || amount === undefined || !expense_date) {
      return NextResponse.json(
        { error: 'Description, amount, and expense date are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO overhead (description, amount, category, expense_date, user_id) VALUES (?, ?, ?, ?, ?)',
      args: [description, amount, category || null, expense_date, userId]
    });

    const overheadResult = await db.execute({
      sql: 'SELECT * FROM overhead WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    });

    const newOverhead = overheadResult.rows[0] as unknown as Overhead;

    return NextResponse.json(newOverhead, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create overhead entry' }, { status: 500 });
  }
}
