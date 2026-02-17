export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';
import { getSiteSettings, SITE_SETTINGS_DEFAULTS, type SiteSettingsPayload } from '@/lib/siteSettings';

export type { CustomFontItem, SiteSettingsPayload } from '@/lib/siteSettings';

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

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error('site-settings GET', e);
    return NextResponse.json({ ...SITE_SETTINGS_DEFAULTS }, { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = ensureAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }
  try {
    const body = (await request.json()) as SiteSettingsPayload;
    const allowed: (keyof SiteSettingsPayload)[] = [
      'menuFont', 'headingFont', 'contactPhone', 'contactWhatsApp',
      'contactTelegram', 'contactEmail', 'telegramNewsChannel', 'telegramNewsRssUrl', 'mapCenterLon', 'mapCenterLat', 'mapLogoPath', 'siteLogoPath',
      'customFonts', 'mainPageHeadingFont', 'mainPageTextFont', 'mainPageTextMaxWidth',
      'mainPageTitle', 'mainPageBlocks',
    ];
    const update: SiteSettingsPayload = {};
    for (const key of allowed) {
      if (body[key] !== undefined) (update as Record<string, unknown>)[key] = body[key];
    }
    const row = await prisma.siteSettings.findFirst({ orderBy: { id: 'asc' } });
    const current = row?.json ? { ...SITE_SETTINGS_DEFAULTS, ...JSON.parse(row.json) } : { ...SITE_SETTINGS_DEFAULTS };
    const merged = { ...current, ...update };
    const json = JSON.stringify(merged);
    if (row) {
      await prisma.siteSettings.update({ where: { id: row.id }, data: { json } });
    } else {
      await prisma.siteSettings.create({ data: { json } });
    }
    return NextResponse.json(merged);
  } catch (e) {
    console.error('site-settings PUT', e);
    return NextResponse.json({ success: false, message: 'Ошибка сохранения' }, { status: 500 });
  }
}
