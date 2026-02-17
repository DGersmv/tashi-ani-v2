export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/userManagement';
import type { MapPoint } from '@/app/api/site/points/route';

const COORDS_PATH = path.join(process.cwd(), 'public', 'points', 'coords.csv');

function ensureAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false as const, status: 401, message: 'Токен не предоставлен' };
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'MASTER')) {
    return { ok: false as const, status: 403, message: 'Недостаточно прав' };
  }
  return { ok: true as const };
}

export async function PUT(request: NextRequest) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  try {
    const { points } = (await request.json()) as { points: MapPoint[] };
    if (!Array.isArray(points)) {
      return NextResponse.json({ success: false, message: 'Ожидается массив points' }, { status: 400 });
    }
    const lines = points.map((p) => {
      const lon = Number(p.lon);
      const lat = Number(p.lat);
      const file = typeof p.file === 'string' ? p.file.trim() : '';
      return `${lon};${lat}${file ? ';' + file : ''}`;
    });
    const dir = path.dirname(COORDS_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(COORDS_PATH, lines.join('\n') + '\n', 'utf-8');
    return NextResponse.json({ success: true, points: points.length });
  } catch (e) {
    console.error('admin site points PUT', e);
    return NextResponse.json({ success: false, message: 'Ошибка записи' }, { status: 500 });
  }
}
