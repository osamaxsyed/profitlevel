import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Overhead } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    let result;
    if (month) {
      // Get overhead for specific month
      result = await db.execute({
        sql: `SELECT * FROM overhead
              WHERE strftime('%Y-%m', expense_date) = ?
              ORDER BY expense_date DESC`,
        args: [month]
      });
    } else {
      // Get all overhead
      result = await db.execute('SELECT * FROM overhead ORDER BY expense_date DESC');
    }

    const overhead = result.rows as Overhead[];

    return NextResponse.json(overhead);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch overhead' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, amount, category, expense_date } = body;

    if (!description || amount === undefined || !expense_date) {
      return NextResponse.json(
        { error: 'Description, amount, and expense date are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO overhead (description, amount, category, expense_date) VALUES (?, ?, ?, ?)',
      args: [description, amount, category || null, expense_date]
    });

    const overheadResult = await db.execute({
      sql: 'SELECT * FROM overhead WHERE id = ?',
      args: [result.lastInsertRowid]
    });

    const newOverhead = overheadResult.rows[0] as Overhead;

    return NextResponse.json(newOverhead, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create overhead entry' }, { status: 500 });
  }
}
