import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';

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
 * GET /api/user/objects/[id]/models/[modelId]/comments - Получить комментарии к модели
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

    // Проверяем существование модели
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

    // Получаем комментарии (все комментарии для пользователей с доступом к объекту)
    const comments = await prisma.bimModelComment.findMany({
      where: {
        bimModelId: modelIdNum,
      },
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
    });

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error('Ошибка получения комментариев:', error);
    return NextResponse.json(
      { error: 'Ошибка получения комментариев' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/objects/[id]/models/[modelId]/comments - Создать комментарий
 */
export async function POST(
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
      where: { email: userEmail },
      include: {
        objects: {
          where: { id: objectId }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверка доступа к объекту
    if (!isAdminRequest && user.objects.length === 0) {
      return NextResponse.json(
        { error: 'Нет доступа к этому объекту' },
        { status: 403 }
      );
    }

    // Проверяем существование модели
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

    const body = await request.json();
    const { content, x, y, z } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Комментарий не может быть пустым' },
        { status: 400 }
      );
    }

    // Создаем комментарий
    const comment = await prisma.bimModelComment.create({
      data: {
        bimModelId: modelIdNum,
        userId: user.id,
        content: content.trim(),
        x: x !== undefined && x !== null ? x : null,
        y: y !== undefined && y !== null ? y : null,
        z: z !== undefined && z !== null ? z : null,
        isVisibleToCustomer: true, // Все комментарии видны пользователям с доступом к объекту
        isAdminComment: isAdminRequest || user.role === 'MASTER',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка создания комментария:', error);
    return NextResponse.json(
      { error: 'Ошибка создания комментария' },
      { status: 500 }
    );
  }
}



