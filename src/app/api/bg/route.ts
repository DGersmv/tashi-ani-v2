// src/app/api/bg/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "bg");
    const files = await fs.readdir(dir);
    const exts = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
    const images = files
      .filter((f) => exts.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => `/bg/${f}`);
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
