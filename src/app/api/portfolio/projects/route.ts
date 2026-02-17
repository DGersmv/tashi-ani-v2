export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const mediaRe = /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)$/i;
const isVideo = (f: string) => /\.(mp4|webm|mov)$/i.test(f);

export async function GET() {
  try {
    const root = path.join(process.cwd(), "public", "portfolio");
    if (!fs.existsSync(root)) return NextResponse.json({ projects: [] });

    const entries = fs.readdirSync(root, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    const projects = dirs.map((d) => {
      const folderName = d.name;                         // «Павловск», «Бонифаций» …
      const folderPath = path.join(root, folderName);
      const files = fs.readdirSync(folderPath).filter((f) => mediaRe.test(f));

      // cover.* — первым; затем остальные как есть
      files.sort((a, b) => {
        const ac = /^cover\./i.test(a) ? -1 : 0;
        const bc = /^cover\./i.test(b) ? -1 : 0;
        return ac - bc;
      });

      const items = files.map((fname) => {
        const url = `/portfolio/${encodeURIComponent(folderName)}/${encodeURIComponent(fname)}`;
        return {
          file: url,
          type: isVideo(fname) ? ("video" as const) : ("image" as const),
          captionRu: fname,
          captionEn: fname,
        };
      });

      return { name: folderName, items };
    });

    // необязательно, но приятно — кириллица по алфавиту
    projects.sort((a, b) => a.name.localeCompare(b.name, "ru"));

    return NextResponse.json({ projects });
  } catch (e) {
    console.error("portfolio projects api error", e);
    return NextResponse.json({ projects: [] }, { status: 200 });
  }
}
