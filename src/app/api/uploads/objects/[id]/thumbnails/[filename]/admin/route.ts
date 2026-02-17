import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { verifyToken } from '@/lib/userManagement';
import { sanitizeFilename, validateFilePath } from '@/lib/security';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token');
    const authHeader = request.headers.get('Authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = queryToken || headerToken;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Требуется авторизация' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'MASTER')) {
      return NextResponse.json({ success: false, message: 'Недостаточно прав' }, { status: 403 });
    }

    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id, 10);
    if (isNaN(objectId)) {
      return NextResponse.json({ success: false, message: 'Неверный ID объекта' }, { status: 400 });
    }

    const sanitizedFilename = sanitizeFilename(resolvedParams.filename);
    if (!sanitizedFilename) {
      return NextResponse.json({ success: false, message: 'Неверное имя файла' }, { status: 400 });
    }

    const photo = await prisma.photo.findFirst({
      where: {
        objectId,
        thumbnailFilename: sanitizedFilename
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
