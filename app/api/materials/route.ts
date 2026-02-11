import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Material } from '@/lib/types';
import { getUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    let result;
    if (jobId) {
      // Verify job ownership and get materials
      result = await db.execute({
        sql: `SELECT m.* FROM materials m
              INNER JOIN jobs j ON m.job_id = j.id
              WHERE m.job_id = ? AND j.user_id = ?
              ORDER BY m.created_at DESC`,
        args: [jobId, userId]
      });
    } else {
      // Get all materials for user's jobs
      result = await db.execute({
        sql: `SELECT m.* FROM materials m
              INNER JOIN jobs j ON m.job_id = j.id
              WHERE j.user_id = ?
              ORDER BY m.created_at DESC`,
        args: [userId]
      });
    }

    const materials = result.rows as unknown as Material[];

    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { job_id, item_name, cost, tax = 0 } = body;

    if (!job_id || !item_name || cost === undefined) {
      return NextResponse.json(
        { error: 'Job ID, item name, and cost are required' },
        { status: 400 }
      );
    }

    // Verify job ownership
    const jobCheck = await db.execute({
      sql: 'SELECT user_id FROM jobs WHERE id = ?',
      args: [job_id]
    });

    if (jobCheck.rows.length === 0 || (jobCheck.rows[0] as any).user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await db.execute({
      sql: 'INSERT INTO materials (job_id, item_name, cost, tax) VALUES (?, ?, ?, ?)',
      args: [job_id, item_name, cost, tax]
    });

    const materialResult = await db.execute({
      sql: 'SELECT * FROM materials WHERE id = ?',
      args: [Number(result.lastInsertRowid)]
    });

    const newMaterial = materialResult.rows[0] as unknown as Material;

    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
