// src/app/api/portfolio/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "portfolio");
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];

    const items = files
      .filter((n) => !n.startsWith("."))
      .filter((n) => /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)$/i.test(n))
      .map((n) => ({
        file: `/portfolio/${n}`,
        type: /\.(mp4|webm|mov)$/i.test(n) ? ("video" as const) : ("image" as const),
        captionRu: n,
        captionEn: n,
      }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("portfolio api error", e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
