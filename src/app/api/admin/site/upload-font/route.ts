export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyToken } from "@/lib/userManagement";
import { sanitizeFilename } from "@/lib/security";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts", "custom");
const ALLOWED_EXT = new Set([".ttf", ".otf", ".woff", ".woff2"]);

function ensureAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, message: "Токен не предоставлен" };
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "MASTER")) {
    return { ok: false as const, status: 403, message: "Недостаточно прав" };
  }
  return { ok: true as const };
}

function fontFamilyFromFilename(filename: string): string {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[^a-zA-Z0-9\u0400-\u04FF\s_-]/g, "")
    .replace(/\s+/g, " ")
    .trim() || "CustomFont";
}

export async function POST(request: NextRequest) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const nameOverride = formData.get("fontFamily") as string | null;
    if (!file) {
      return NextResponse.json({ success: false, message: "Файл не выбран" }, { status: 400 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { success: false, message: "Разрешены только TTF, OTF, WOFF, WOFF2" },
        { status: 400 }
      );
    }
    const safeBase = sanitizeFilename(path.basename(file.name, ext));
    const baseName = safeBase || "font";
    const uniqueName = `${baseName}-${Date.now()}${ext}`;
    await fs.mkdir(FONTS_DIR, { recursive: true });
    const filePath = path.join(FONTS_DIR, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    const url = `/fonts/custom/${uniqueName}`;
    const fontFamily = (nameOverride?.trim() || fontFamilyFromFilename(file.name)).replace(/['"]/g, "");
    return NextResponse.json({ success: true, url, fontFamily });
  } catch (e) {
    console.error("admin site upload-font POST", e);
    return NextResponse.json({ success: false, message: "Ошибка загрузки" }, { status: 500 });
  }
}
