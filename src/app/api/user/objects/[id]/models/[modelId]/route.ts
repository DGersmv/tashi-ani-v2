import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';
import { unlink } from 'fs/promises';
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
 * GET /api/user/objects/[id]/models/[modelId] - Получить информацию о модели
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
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        stage: {
          select: {
            id: true,
            title: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({ model });
  } catch (error) {
    console.error('Ошибка получения модели:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/objects/[id]/models/[modelId] - Удалить модель
 */
export async function DELETE(
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

    // Получить пользователя
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
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

    // Только автор модели или MASTER может удалить
    if (model.uploadedByUserId !== user.id && !isAdminRequest) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления модели' },
        { status: 403 }
      );
    }

    // Удалить файлы
    if (model.originalFilePath) {
      const originalFilePath = join(process.cwd(), 'public', model.originalFilePath);
      if (existsSync(originalFilePath)) {
        await unlink(originalFilePath);
      }
    }

    if (model.viewableFilePath) {
      const viewableFilePath = join(process.cwd(), 'public', model.viewableFilePath);
      if (existsSync(viewableFilePath)) {
        await unlink(viewableFilePath);
      }
    }

    // Удалить из БД
    await prisma.bimModel.delete({
      where: { id: modelIdNum },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления модели:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления модели' },
      { status: 500 }
    );
  }
}



