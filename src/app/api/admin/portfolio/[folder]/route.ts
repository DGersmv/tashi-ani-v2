export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/userManagement';

const PORTFOLIO_ROOT = path.join(process.cwd(), 'public', 'portfolio');
const MEDIA_RE = /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)$/i;

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

function safeFolder(folder: string): string {
  return path.basename(folder).replace(/\.\./g, '');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string }> }
) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  const { folder } = await params;
  const safe = safeFolder(folder);
  if (!safe) {
    return NextResponse.json({ success: false, message: 'Недопустимое имя папки' }, { status: 400 });
  }
  try {
    const dir = path.join(PORTFOLIO_ROOT, safe);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 400 });
    }
    const fname = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!MEDIA_RE.test(fname)) {
      return NextResponse.json({ success: false, message: 'Разрешены только изображения и видео' }, { status: 400 });
    }
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fname);
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ success: true, file: `/portfolio/${encodeURIComponent(safe)}/${encodeURIComponent(fname)}` });
  } catch (e) {
    console.error('admin portfolio upload', e);
    return NextResponse.json({ success: false, message: 'Ошибка загрузки' }, { status: 500 });
  }
}
