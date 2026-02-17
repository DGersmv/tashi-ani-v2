export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SERVICES_ROOT = path.join(process.cwd(), 'public', 'services');
const MEDIA_RE = /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)$/i;
const isVideo = (f: string) => /\.(mp4|webm|mov)$/i.test(f);

export async function GET() {
  try {
    if (!(await fs.stat(SERVICES_ROOT).catch(() => null))?.isDirectory()) {
      return NextResponse.json({ projects: [] });
    }
    const entries = await fs.readdir(SERVICES_ROOT, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    const projects = await Promise.all(
      dirs.map(async (d) => {
        const folderName = d.name;
        const folderPath = path.join(SERVICES_ROOT, folderName);
        const files = (await fs.readdir(folderPath)).filter((f) => MEDIA_RE.test(f));
        files.sort((a, b) => {
          const ac = /^cover\./i.test(a) ? -1 : 0;
          const bc = /^cover\./i.test(b) ? -1 : 0;
          return ac - bc;
        });
        const items = files.map((fname) => {
          // Раздаём через API: декодируем путь на сервере и отдаём файл (кириллица в URL иначе даёт 404 на хостинге)
          const url = `/api/services/file/${folderName}/${fname}`;
          return {
            file: url,
            type: isVideo(fname) ? ('video' as const) : ('image' as const),
            captionRu: fname,
            captionEn: fname,
          };
        });
        return { name: folderName, items };
      })
    );
    projects.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return NextResponse.json({ projects });
  } catch (e) {
    console.error('services projects api error', e);
    return NextResponse.json({ projects: [] }, { status: 200 });
  }
}
