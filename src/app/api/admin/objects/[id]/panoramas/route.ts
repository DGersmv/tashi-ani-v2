import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { generateThumbnail } from '@/lib/imageProcessing';
import { classifyPanoramaProjection } from '@/lib/panoramaUtils';
import { Prisma } from '@prisma/client';

const MAX_FILE_SIZE_MB = 50;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const resolveFilePath = (explicitPath: string | null | undefined, fallbackPath: string) => {
  if (typeof explicitPath === 'string' && explicitPath.trim().length > 0) {
    return explicitPath;
  }
  return fallbackPath;
};

const buildPanoramaUrl = (objectId: number, panorama: any) => {
  const fallbackPath = `/uploads/objects/${objectId}/panoramas/${panorama.filename}`;
  const baseUrl = resolveFilePath(panorama?.filePath, fallbackPath);
  const uploadedAt = panorama?.uploadedAt ? new Date(panorama.uploadedAt) : new Date();
  const cacheBuster = Number.isFinite(uploadedAt.getTime()) ? uploadedAt.getTime() : Date.now();
  return `${baseUrl}?v=${cacheBuster}`;
};

const buildPanoramaThumbnailUrl = (objectId: number, panorama: any) => {
  if (!panorama?.thumbnailFilename && !panorama?.thumbnailFilePath) {
    return null;
  }
  const fallbackPath = `/uploads/objects/${objectId}/panoramas/thumbnails/${panorama.thumbnailFilename}`;
  const baseUrl = resolveFilePath(panorama?.thumbnailFilePath, fallbackPath);
  const uploadedAt = panorama?.uploadedAt ? new Date(panorama.uploadedAt) : new Date();
  const cacheBuster = Number.isFinite(uploadedAt.getTime()) ? uploadedAt.getTime() : Date.now();
  return `${baseUrl}?v=${cacheBuster}`;
};

const ensureAdminAccess = (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ success: false, message: 'Не авторизован' }, { status: 401 }) };
  }

  const token = authHeader.split(' ')[1];
  const adminData = verifyToken(token);

  if (!adminData || (adminData.role !== 'ADMIN' && adminData.role !== 'MASTER')) {
    return { error: NextResponse.json({ success: false, message: 'Доступ запрещен' }, { status: 403 }) };
  }

  return { adminData };
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = ensureAdminAccess(request);
    if (access.error) return access.error;

    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id, 10);

    if (Number.isNaN(objectId)) {
      return NextResponse.json({ success: false, message: 'Неверный ID объекта' }, { status: 400 });
    }
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const isVisibleToCustomer = formData.get('isVisibleToCustomer') === 'true';

    if (!file) {
      return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Неподдерживаемый тип файла' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ success: false, message: `Файл слишком большой (максимум ${MAX_FILE_SIZE_MB}MB)` }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop();
    const fileNameBase = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fileName = `${fileNameBase}.${fileExtension}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString(), 'panoramas');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    let originalWidth: number | null = null;
    let originalHeight: number | null = null;
    let projectionType: 'EQUIRECTANGULAR' | 'CYLINDRICAL' | 'UNKNOWN' = 'UNKNOWN';

    try {
      const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
      originalWidth = metadata.width ?? null;
      originalHeight = metadata.height ?? null;
      projectionType = classifyPanoramaProjection(originalWidth, originalHeight);
    } catch (metadataError) {
      console.error('Не удалось прочитать метаданные панорамы:', metadataError);
    }

    await writeFile(filePath, buffer);

    let thumbnailData: Record<string, any> = {};
    let thumbnailUrl: string | null = null;

    if (file.type.startsWith('image/') && file.type !== 'image/gif') {
      try {
        const thumbnailDir = join(uploadDir, 'thumbnails');
        if (!existsSync(thumbnailDir)) {
          await mkdir(thumbnailDir, { recursive: true });
        }

        const baseThumbFilename = `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
        const thumbnailFilename = baseThumbFilename;
        const thumbnailPath = join(thumbnailDir, thumbnailFilename);
        const thumbnail = await generateThumbnail(buffer, { width: 768 });

        await writeFile(thumbnailPath, thumbnail.buffer);

        thumbnailData = {
          thumbnailFilename,
          thumbnailFilePath: `/uploads/objects/${objectId}/panoramas/thumbnails/${thumbnailFilename}`,
          thumbnailFileSize: thumbnail.buffer.length,
          thumbnailWidth: thumbnail.width ?? null,
          thumbnailHeight: thumbnail.height ?? null,
          thumbnailMimeType: thumbnail.mimeType,
        };

        thumbnailUrl = `${thumbnailData.thumbnailFilePath}?v=${Date.now()}`;
      } catch (thumbError) {
        console.error('Ошибка генерации превью панорамы:', thumbError);
      }
    }

    const panoramaData: Prisma.PanoramaUncheckedCreateInput = {
      objectId,
      filename: fileName,
      originalName: file.name,
      filePath: `/uploads/objects/${objectId}/panoramas/${fileName}`,
      fileSize: file.size,
      mimeType: file.type,
      isVisibleToCustomer,
      uploadedAt: new Date(),
      originalWidth,
      originalHeight,
      projectionType,
      ...thumbnailData,
    };

    const panorama = await prisma.panorama.create({
      data: panoramaData,
    });

    const url = buildPanoramaUrl(objectId, panorama);
    const defaultThumbnailUrl = buildPanoramaThumbnailUrl(objectId, panorama);

    return NextResponse.json({
      success: true,
      panorama: {
        ...panorama,
        uploadedAt: panorama.uploadedAt.toISOString(),
        url,
        thumbnailUrl: thumbnailUrl ?? defaultThumbnailUrl,
        originalWidth,
        originalHeight,
        projectionType,
      },
    });
  } catch (error) {
    console.error('Ошибка загрузки панорамы:', error);
    return NextResponse.json({ success: false, message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = ensureAdminAccess(request);
    if (access.error) return access.error;

    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id, 10);

    if (Number.isNaN(objectId)) {
      return NextResponse.json({ success: false, message: 'Неверный ID объекта' }, { status: 400 });
    }
    const { panoramaId, isVisibleToCustomer } = await request.json();

    if (!panoramaId || typeof isVisibleToCustomer !== 'boolean') {
      return NextResponse.json({ success: false, message: 'Неверные параметры' }, { status: 400 });
    }

    const updatedPanorama = await prisma.panorama.update({
      where: {
        id: panoramaId,
        objectId,
      },
      data: { isVisibleToCustomer },
    });

    return NextResponse.json({
      success: true,
      panorama: {
        ...updatedPanorama,
        url: buildPanoramaUrl(objectId, updatedPanorama),
        thumbnailUrl: buildPanoramaThumbnailUrl(objectId, updatedPanorama),
      },
    });
  } catch (error) {
    console.error('Ошибка обновления панорамы:', error);
    return NextResponse.json({ success: false, message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = ensureAdminAccess(request);
    if (access.error) return access.error;

    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id, 10);

    if (Number.isNaN(objectId)) {
      return NextResponse.json({ success: false, message: 'Неверный ID объекта' }, { status: 400 });
    }
    const { panoramaId } = await request.json();

    if (!panoramaId) {
      return NextResponse.json({ success: false, message: 'ID панорамы обязателен' }, { status: 400 });
    }

    const panorama = await prisma.panorama.findFirst({
      where: {
        id: panoramaId,
        objectId,
      },
    });

    if (!panorama) {
      return NextResponse.json({ success: false, message: 'Панорама не найдена' }, { status: 404 });
    }

    const relativePath = resolveFilePath(panorama.filePath, `/uploads/objects/${objectId}/panoramas/${panorama.filename}`);
    const absolutePath = join(process.cwd(), 'public', relativePath.replace(/^\/+/, ''));

    if (existsSync(absolutePath)) {
      await import('fs/promises').then((fs) => fs.unlink(absolutePath));
    }

    if (panorama.thumbnailFilePath) {
      const thumbPath = join(process.cwd(), 'public', panorama.thumbnailFilePath.replace(/^\/+/, ''));
      if (existsSync(thumbPath)) {
        await import('fs/promises').then((fs) => fs.unlink(thumbPath));
      }
    }

    await prisma.panorama.delete({ where: { id: panoramaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления панорамы:', error);
    return NextResponse.json({ success: false, message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

