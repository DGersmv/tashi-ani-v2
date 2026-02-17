import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { sanitizeFilename, validateFilePath, validateObjectId, isValidEmail, logSuspiciousActivity } from '@/lib/security';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const resolvedParams = await params;

    const objectId = validateObjectId(resolvedParams.id);
    if (!objectId) {
      logSuspiciousActivity('INVALID_OBJECT_ID', { id: resolvedParams.id }, request);
      return NextResponse.json({ success: false, message: 'Неверный ID объекта' }, { status: 400 });
    }

    const sanitizedFilename = sanitizeFilename(resolvedParams.filename);
    if (!sanitizedFilename) {
      logSuspiciousActivity('SUSPICIOUS_FILENAME', { filename: resolvedParams.filename }, request);
      return NextResponse.json({ success: false, message: 'Неверное имя файла' }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      logSuspiciousActivity('INVALID_EMAIL', { email }, request);
      return NextResponse.json({ success: false, message: 'Email не предоставлен или неверен' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        objects: {
          where: { id: objectId }
        }
      }
    });

    if (!user || user.objects.length === 0) {
      return NextResponse.json({ success: false, message: 'Объект не найден или нет доступа' }, { status: 404 });
    }

    const photo = await prisma.photo.findFirst({
      where: {
        objectId,
        thumbnailFilename: sanitizedFilename,
        isVisibleToCustomer: true
      }
    });

    if (!photo) {
      return NextResponse.json({ success: false, message: 'Превью не найдено' }, { status: 404 });
    }

    const relativePath = typeof photo.thumbnailFilePath === 'string' && photo.thumbnailFilePath.trim().length > 0
      ? photo.thumbnailFilePath.replace(/^\/+/, '')
      : ['uploads', 'objects', objectId.toString(), 'thumbnails', photo.thumbnailFilename!].join('/');
    const filePath = join(process.cwd(), 'public', relativePath);

    const allowedBaseDir = join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString(), 'thumbnails');
    if (!validateFilePath(filePath, allowedBaseDir)) {
      logSuspiciousActivity('PATH_TRAVERSAL_ATTEMPT', { filePath, allowedBaseDir }, request);
      return NextResponse.json({ success: false, message: 'Неверный путь к файлу' }, { status: 403 });
    }

    try {
      const fileBuffer = await readFile(filePath);
      const mimeType = photo.thumbnailMimeType || (sanitizedFilename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (fileError) {
      console.error('Ошибка при чтении превью:', fileError);
      return NextResponse.json({ success: false, message: 'Файл превью не найден' }, { status: 404 });
    }
  } catch (error) {
    console.error('Ошибка при получении превью:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
