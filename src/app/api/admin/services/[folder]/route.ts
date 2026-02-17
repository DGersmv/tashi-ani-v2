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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string }> }
) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  const { folder } = await params;
  const safe = safeSegment(folder);
  if (!safe) {
    return NextResponse.json({ success: false, message: 'Недопустимое имя папки' }, { status: 400 });
  }
  try {
    const dir = path.join(SERVICES_ROOT, safe);
    const formData = await request.formData();
    const files = formData.getAll('file') as (File | string)[];
    const toUpload = files.filter((f): f is File => f instanceof File && f.size > 0);
    if (toUpload.length === 0) {
      return NextResponse.json({ success: false, message: 'Файлы не выбраны' }, { status: 400 });
    }
    await fs.mkdir(dir, { recursive: true });
    const uploaded: string[] = [];
    for (const file of toUpload) {
      const fname = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      if (!MEDIA_RE.test(fname)) continue;
      const filePath = path.join(dir, fname);
      await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
      uploaded.push(`/services/${safe}/${fname}`);
    }
    return NextResponse.json({ success: true, files: uploaded });
  } catch (e) {
    console.error('admin services upload', e);
    return NextResponse.json({ success: false, message: 'Ошибка загрузки' }, { status: 500 });
  }
}
