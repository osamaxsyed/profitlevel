import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Material } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    let result;
    if (jobId) {
      result = await db.execute({
        sql: 'SELECT * FROM materials WHERE job_id = ? ORDER BY created_at DESC',
        args: [jobId]
      });
    } else {
      result = await db.execute('SELECT * FROM materials ORDER BY created_at DESC');
    }

    const materials = result.rows as Material[];

    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { job_id, item_name, cost, tax = 0 } = body;

    if (!job_id || !item_name || cost === undefined) {
      return NextResponse.json(
        { error: 'Job ID, item name, and cost are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO materials (job_id, item_name, cost, tax) VALUES (?, ?, ?, ?)',
      args: [job_id, item_name, cost, tax]
    });

    const materialResult = await db.execute({
      sql: 'SELECT * FROM materials WHERE id = ?',
      args: [result.lastInsertRowid]
    });

    const newMaterial = materialResult.rows[0] as Material;

    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
