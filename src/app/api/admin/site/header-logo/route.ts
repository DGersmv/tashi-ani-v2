export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyToken } from "@/lib/userManagement";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const HEADER_LOGO_FILENAME = "header-logo.png";
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

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

export async function POST(request: NextRequest) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: "Файл не выбран" }, { status: 400 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ success: false, message: "Разрешены только PNG, JPG, WEBP" }, { status: 400 });
    }
    const filePath = path.join(PUBLIC_DIR, HEADER_LOGO_FILENAME);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    const url = `/${HEADER_LOGO_FILENAME}`;
    return NextResponse.json({ success: true, url });
  } catch (e) {
    console.error("admin site header-logo POST", e);
    return NextResponse.json({ success: false, message: "Ошибка загрузки" }, { status: 500 });
  }
}
