import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { sanitizeFilename, validateFilePath, validateObjectId, isValidEmail, logSuspiciousActivity } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
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

    const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
    let isAdminRequest = false;

    if (authHeader?.startsWith('Bearer ')) {
      const adminToken = authHeader.slice(7);
      try {
        const decoded = verifyToken(adminToken);
        if (decoded && (decoded.role === 'ADMIN' || decoded.role === 'MASTER')) {
          isAdminRequest = true;
        }
      } catch {
        // ignore token errors, fall back to customer flow
      }
    }

    if (!isAdminRequest) {
      const email = searchParams.get('email');

      if (!email || !isValidEmail(email)) {
        logSuspiciousActivity('INVALID_EMAIL', { email }, request);
        return NextResponse.json({ success: false, message: 'Email не предоставлен или неверен' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          objects: {
            where: { id: objectId },
            select: { id: true },
          },
        },
      });

      if (!user || user.objects.length === 0) {
        return NextResponse.json({ success: false, message: 'Объект не найден или нет доступа' }, { status: 404 });
      }

      const panorama = await prisma.panorama.findFirst({
        where: {
          objectId,
          filename: sanitizedFilename,
          isVisibleToCustomer: true,
        },
      });

      if (!panorama) {
        return NextResponse.json({ success: false, message: 'Панорама не найдена или скрыта' }, { status: 404 });
      }

      const relativePath = typeof panorama.filePath === 'string' && panorama.filePath.trim().length > 0
        ? panorama.filePath.replace(/^\/+/, '')
        : ['uploads', 'objects', objectId.toString(), 'panoramas', panorama.filename].join('/');

      const filePath = join(process.cwd(), 'public', relativePath);

      // Validate file path to prevent path traversal
      const allowedBaseDir = join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString(), 'panoramas');
      if (!validateFilePath(filePath, allowedBaseDir)) {
        logSuspiciousActivity('PATH_TRAVERSAL_ATTEMPT', { filePath, allowedBaseDir }, request);
        return NextResponse.json({ success: false, message: 'Неверный путь к файлу' }, { status: 403 });
      }

      try {
        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': panorama.mimeType || 'application/octet-stream',
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'no-store',
          },
        });
      } catch (error) {
        console.error('Ошибка при чтении файла панорамы:', error);
        return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 404 });
      }
    }

    // Админский запрос: возвращаем панораму независимо от статуса видимости
    const panorama = await prisma.panorama.findFirst({
      where: {
        objectId,
        filename: sanitizedFilename,
      },
    });

    if (!panorama) {
      return NextResponse.json({ success: false, message: 'Панорама не найдена' }, { status: 404 });
    }

    const relativePath = typeof panorama.filePath === 'string' && panorama.filePath.trim().length > 0
      ? panorama.filePath.replace(/^\/+/, '')
      : ['uploads', 'objects', objectId.toString(), 'panoramas', panorama.filename].join('/');

    const filePath = join(process.cwd(), 'public', relativePath);

    // Validate file path to prevent path traversal
    const allowedBaseDir = join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString(), 'panoramas');
    if (!validateFilePath(filePath, allowedBaseDir)) {
      logSuspiciousActivity('PATH_TRAVERSAL_ATTEMPT', { filePath, allowedBaseDir }, request);
      return NextResponse.json({ success: false, message: 'Неверный путь к файлу' }, { status: 403 });
    }

    try {
      const fileBuffer = await readFile(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': panorama.mimeType || 'application/octet-stream',
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      console.error('Ошибка при чтении файла панорамы:', error);
      return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 404 });
    }
  } catch (error) {
    console.error('Ошибка при получении панорамы:', error);
    return NextResponse.json({ success: false, message: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}


