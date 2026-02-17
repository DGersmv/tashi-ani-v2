export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SERVICES_ROOT = path.join(process.cwd(), 'public', 'services');
const MEDIA_RE = /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)$/i;

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments?.length || pathSegments.length < 2) {
    return NextResponse.json({ error: 'Bad path' }, { status: 400 });
  }
  try {
    const decoded = pathSegments.map((s) => decodeURIComponent(s));
    const filename = path.basename(decoded[decoded.length - 1]).replace(/\.\./g, '');
    if (!MEDIA_RE.test(filename)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const relativePath = path.join(...decoded.map((s) => path.basename(s).replace(/\.\./g, '')));
    const filePath = path.resolve(SERVICES_ROOT, relativePath);
    const rootReal = path.resolve(SERVICES_ROOT);
    if (!filePath.startsWith(rootReal + path.sep) && filePath !== rootReal) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    const buf = await fs.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    console.error('services file serve', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
