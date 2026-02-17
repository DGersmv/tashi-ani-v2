import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { verifyToken } from '@/lib/userManagement';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    // Проверяем авторизацию администратора
    // Токен может быть в заголовке Authorization или в query параметре token
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token');
    const authHeader = request.headers.get('Authorization');
    const headerToken = authHeader?.split(' ')[1];
    
    const token = queryToken || headerToken;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Требуется авторизация' }, { status: 401 });
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken || (decodedToken.role !== 'MASTER' && decodedToken.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Недостаточно прав' }, { status: 403 });
    }

    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    const filename = resolvedParams.filename;

    if (isNaN(objectId)) {
      return NextResponse.json({ success: false, message: 'Неверный ID объекта' }, { status: 400 });
    }

    // Проверяем, это фото, панорама или документ
    // Сначала ищем в фотографиях
    const photo = await prisma.photo.findFirst({
      where: {
        objectId: objectId,
        filename: filename
      }
    });

    if (photo) {
      // Это фото - отдаем его
      const relativePath = typeof photo.filePath === 'string' && photo.filePath.trim().length > 0
        ? photo.filePath.replace(/^\/+/, '')
        : ['uploads', 'objects', objectId.toString(), photo.filename].join('/');
      const filePath = join(process.cwd(), 'public', relativePath);
      
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
        return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 404 });
      }
    }

    // Затем ищем среди панорам
    const panorama = await prisma.panorama.findFirst({
      where: {
        objectId: objectId,
        filename: filename
      }
    });

    if (panorama) {
      const relativePath = typeof panorama.filePath === 'string' && panorama.filePath.trim().length > 0
        ? panorama.filePath.replace(/^\/+/, '')
        : ['uploads', 'objects', objectId.toString(), 'panoramas', panorama.filename].join('/');
      const filePath = join(process.cwd(), 'public', relativePath);

      try {
        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': panorama.mimeType || 'application/octet-stream',
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      } catch (fileError) {
        console.error('Ошибка при чтении панорамы:', fileError);
        return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 404 });
      }
    }

    // Если не фото, проверяем документы
    const document = await prisma.document.findFirst({
      where: {
        objectId: objectId,
        filename: filename
      }
    });

    if (document) {
      // Это документ - отдаем его
      const relativePath = typeof document.filePath === 'string' && document.filePath.trim().length > 0
        ? document.filePath.replace(/^\/+/, '')
        : ['uploads', 'objects', objectId.toString(), 'documents', document.filename].join('/');
      const filePath = join(process.cwd(), 'public', relativePath);
      
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
        return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 404 });
      }
    }

    // Файл не найден ни в фото, ни в документах
    return NextResponse.json({ success: false, message: 'Файл не найден' }, { status: 404 });

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
