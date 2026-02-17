export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const COORDS_PATH = path.join(process.cwd(), 'public', 'points', 'coords.csv');

export type MapPoint = { lon: number; lat: number; file?: string };

export async function GET() {
  try {
    const raw = await fs.readFile(COORDS_PATH, 'utf-8');
    const rows = raw.trim().split(/\r?\n/).filter(Boolean);
    const points: MapPoint[] = rows.map((row) => {
      const [lonStr, latStr, file = ''] = row.split(/[,;]/).map((s) => s.trim());
      return {
        lon: parseFloat(lonStr) || 0,
        lat: parseFloat(latStr) || 0,
        ...(file ? { file } : {}),
      };
    });
    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ points: [] });
  }
}
