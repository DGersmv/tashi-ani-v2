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
    
    // Validate object ID
    const objectId = validateObjectId(resolvedParams.id);
    if (!objectId) {
      logSuspiciousActivity('INVALID_OBJECT_ID', { id: resolvedParams.id }, request);
      return NextResponse.json({ success: false, message: 'Неверный ID объекта' }, { status: 400 });
    }

    // Validate and sanitize filename
    const sanitizedFilename = sanitizeFilename(resolvedParams.filename);
    if (!sanitizedFilename) {
      logSuspiciousActivity('SUSPICIOUS_FILENAME', { filename: resolvedParams.filename }, request);
      return NextResponse.json({ success: false, message: 'Неверное имя файла' }, { status: 400 });
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
      logSuspiciousActivity('INVALID_EMAIL', { email }, request);
      return NextResponse.json({ success: false, message: 'Email не предоставлен или неверен' }, { status: 400 });
    }

    // Проверяем, что пользователь существует и имеет доступ к объекту
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        objects: {
          where: { id: objectId }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    if (user.objects.length === 0) {
      return NextResponse.json({ success: false, message: 'Объект не найден или нет доступа' }, { status: 404 });
    }

    // Проверяем, это фото или документ
    // Сначала ищем в фотографиях
    const photo = await prisma.photo.findFirst({
      where: {
        objectId: objectId,
        filename: sanitizedFilename,
        isVisibleToCustomer: true
      }
    });

    if (photo) {
      const relativePath = typeof photo.filePath === 'string' && photo.filePath.trim().length > 0
        ? photo.filePath.replace(/^\/+/, '')
        : ['uploads', 'objects', objectId.toString(), photo.filename].join('/');
      const filePath = join(process.cwd(), 'public', relativePath);
      
      // Validate file path to prevent path traversal
      const allowedBaseDir = join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString());
      if (!validateFilePath(filePath, allowedBaseDir)) {
        logSuspiciousActivity('PATH_TRAVERSAL_ATTEMPT', { filePath, allowedBaseDir }, request);
        return NextResponse.json({ success: false, message: 'Неверный путь к файлу' }, { status: 403 });
      }
      
      try {
        const fileBuffer = await readFile(filePath);
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': photo.mimeType || 'application/octet-stream',
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      } catch (fileError) {
        console.error('Ошибка при чтении фото:', fileError);
        return NextResponse.json({ success: false, message: 'Файл не найден на диске' }, { status: 404 });
      }
    }

    // Если не фото, проверяем документы
    const document = await prisma.document.findFirst({
      where: {
        objectId: objectId,
        filename: sanitizedFilename
      }
    });

    if (document) {
      const relativePath = typeof document.filePath === 'string' && document.filePath.trim().length > 0
        ? document.filePath.replace(/^\/+/, '')
        : ['uploads', 'objects', objectId.toString(), document.filename].join('/');
      const filePath = join(process.cwd(), 'public', relativePath);
      
      // Validate file path to prevent path traversal
      const allowedBaseDir = join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString());
      if (!validateFilePath(filePath, allowedBaseDir)) {
        logSuspiciousActivity('PATH_TRAVERSAL_ATTEMPT', { filePath, allowedBaseDir }, request);
        return NextResponse.json({ success: false, message: 'Неверный путь к файлу' }, { status: 403 });
      }
      
      try {
        const fileBuffer = await readFile(filePath);
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': document.mimeType || 'application/octet-stream',
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      } catch (fileError) {
        console.error('Ошибка при чтении документа:', fileError);
        return NextResponse.json({ success: false, message: 'Файл не найден на диске' }, { status: 404 });
      }
    }

    // Файл не найден ни в фото, ни в документах
    return NextResponse.json({ success: false, message: 'Файл не найден или нет доступа' }, { status: 404 });

  } catch (error) {
    console.error('Ошибка при получении фото:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}