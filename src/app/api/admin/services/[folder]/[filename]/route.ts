export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/userManagement';

const SERVICES_ROOT = path.join(process.cwd(), 'public', 'services');
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

function safeSegment(s: string): string {
  return path.basename(s).replace(/\.\./g, '');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string; filename: string }> }
) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  const { folder, filename } = await params;
  const safeFolder = safeSegment(folder);
  const safeFile = safeSegment(filename);
  if (!safeFolder || !safeFile || !MEDIA_RE.test(safeFile)) {
    return NextResponse.json({ success: false, message: 'Недопустимое имя' }, { status: 400 });
  }
  try {
    const filePath = path.join(SERVICES_ROOT, safeFolder, safeFile);
    await fs.unlink(filePath);
    return NextResponse.json({ success: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 404 });
    }
    console.error('admin services delete', e);
    return NextResponse.json({ success: false, message: 'Ошибка удаления' }, { status: 500 });
  }
}
