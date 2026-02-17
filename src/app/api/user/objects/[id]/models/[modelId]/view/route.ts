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
 * GET /api/user/objects/[id]/models/[modelId]/view
 * Получить файл для просмотра (IFC или glTF) - для встраивания в просмотрщик
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

    // Проверить наличие файла для просмотра
    if (!model.viewableFilePath || !model.viewableFilename) {
      return NextResponse.json(
        { error: 'Файл для просмотра не загружен. Пожалуйста, загрузите IFC или glTF файл.' },
        { status: 404 }
      );
    }

    const filePath = join(process.cwd(), 'public', model.viewableFilePath);

    // Проверить существование файла
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Файл не найден на сервере' },
        { status: 404 }
      );
    }

    // Прочитать файл
    const fileBuffer = await readFile(filePath);

    // Определить MIME тип
    let mimeType = model.viewableMimeType || 'application/octet-stream';
    if (model.viewableFormat === 'IFC') {
      mimeType = 'application/ifc';
    } else if (model.viewableFormat === 'GLTF') {
      // glTF может быть .gltf (JSON) или .glb (binary)
      const ext = model.viewableFilename.toLowerCase().split('.').pop();
      mimeType = ext === 'glb' ? 'model/gltf-binary' : 'model/gltf+json';
    }

    // Вернуть файл с правильными заголовками для просмотра (не скачивания)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Кеширование на 1 час
        'Access-Control-Allow-Origin': '*', // Для CORS при просмотре
      },
    });
  } catch (error) {
    console.error('Ошибка получения файла для просмотра:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



