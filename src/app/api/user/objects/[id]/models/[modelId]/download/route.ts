import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Проверка доступа к объекту
 */
async function checkObjectAccess(email: string, objectId: number) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      objects: {
        where: { id: objectId }
      }
    }
  });
  
  if (!user || user.objects.length === 0) {
    return null;
  }
  
  return user;
}

/**
 * GET /api/user/objects/[id]/models/[modelId]/download?type=original|viewable
 * Скачать файл модели (исходный или для просмотра)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id, modelId } = await params;
    const objectId = parseInt(id);
    const modelIdNum = parseInt(modelId);
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const fileType = searchParams.get('type') || 'original'; // 'original' или 'viewable'

    if (isNaN(objectId) || isNaN(modelIdNum)) {
      return NextResponse.json(
        { error: 'Неверный ID' },
        { status: 400 }
      );
    }

    // Проверка авторизации
    const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
    let isAdminRequest = false;
    let userEmail = email;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = verifyToken(token);
        if (decoded && (decoded.role === 'MASTER' || decoded.role === 'ADMIN')) {
          isAdminRequest = true;
          userEmail = decoded.email;
        }
      } catch {
        // Игнорируем ошибки токена
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email не предоставлен' },
        { status: 400 }
      );
    }

    // Проверка доступа к объекту
    const user = await checkObjectAccess(userEmail, objectId);
    
    if (!user && !isAdminRequest) {
      return NextResponse.json(
        { error: 'Объект не найден или нет доступа' },
        { status: 404 }
      );
    }

    // Получить модель
    const model = await prisma.bimModel.findFirst({
      where: {
        id: modelIdNum,
        objectId: objectId,
      },
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      );
    }

    // Определить какой файл скачивать
    let filePath: string;
    let filename: string;
    let mimeType: string;

    if (fileType === 'viewable') {
      if (!model.viewableFilePath || !model.viewableFilename) {
        return NextResponse.json(
          { error: 'Файл для просмотра не найден' },
          { status: 404 }
        );
      }
      filePath = join(process.cwd(), 'public', model.viewableFilePath);
      filename = model.viewableFilename;
      mimeType = model.viewableMimeType || 'application/octet-stream';
    } else {
      // original
      if (!model.originalFilePath) {
        return NextResponse.json(
          { error: 'Исходный файл не найден' },
          { status: 404 }
        );
      }
      filePath = join(process.cwd(), 'public', model.originalFilePath);
      filename = model.originalFilename;
      mimeType = model.originalMimeType || 'application/octet-stream';
    }

    // Проверить существование файла
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Файл не найден на сервере' },
        { status: 404 }
      );
    }

    // Прочитать файл
    const fileBuffer = await readFile(filePath);

    // Вернуть файл с правильными заголовками
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Ошибка скачивания файла:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



