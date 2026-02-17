export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/userManagement';

const BG_DIR = path.join(process.cwd(), 'public', 'bg');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

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

function safeBasename(fileParam: string): string | null {
  const base = path.basename(fileParam);
  if (base !== fileParam || base.includes('..')) return null;
  if (!ALLOWED_EXT.has(path.extname(base).toLowerCase())) return null;
  return base;
}

export async function POST(request: NextRequest) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 400 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ success: false, message: 'Разрешены только jpg, png, webp, avif' }, { status: 400 });
    }
    const name = `${Date.now()}-${path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await fs.mkdir(BG_DIR, { recursive: true });
    const filePath = path.join(BG_DIR, name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    const images = (await fs.readdir(BG_DIR))
      .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => `/bg/${f}`);
    return NextResponse.json({ success: true, images });
  } catch (e) {
    console.error('admin bg POST', e);
    return NextResponse.json({ success: false, message: 'Ошибка загрузки' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  const fileParam = request.nextUrl.searchParams.get('file');
  const base = fileParam ? safeBasename(fileParam) : null;
  if (!base) {
    return NextResponse.json({ success: false, message: 'Недопустимое имя файла' }, { status: 400 });
  }
  try {
    const filePath = path.join(BG_DIR, base);
    await fs.unlink(filePath);
    const images = (await fs.readdir(BG_DIR))
      .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => `/bg/${f}`);
    return NextResponse.json({ success: true, images });
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 404 });
    }
    console.error('admin bg DELETE', e);
    return NextResponse.json({ success: false, message: 'Ошибка удаления' }, { status: 500 });
  }
}
