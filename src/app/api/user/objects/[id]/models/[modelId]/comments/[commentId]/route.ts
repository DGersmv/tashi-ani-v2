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
 * DELETE /api/user/objects/[id]/models/[modelId]/comments/[commentId] - Удалить комментарий
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string; commentId: string }> }
) {
  try {
    const { id, modelId, commentId } = await params;
    const objectId = parseInt(id);
    const modelIdNum = parseInt(modelId);
    const commentIdNum = parseInt(commentId);
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (isNaN(objectId) || isNaN(modelIdNum) || isNaN(commentIdNum)) {
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

    // Проверка доступа к объекту
    const userWithAccess = await checkObjectAccess(userEmail, objectId);
    
    if (!userWithAccess && !isAdminRequest) {
      return NextResponse.json(
        { error: 'Объект не найден или нет доступа' },
        { status: 404 }
      );
    }

    // Получить комментарий
    const comment = await prisma.bimModelComment.findFirst({
      where: {
        id: commentIdNum,
        bimModelId: modelIdNum,
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Комментарий не найден' },
        { status: 404 }
      );
    }

    // Только автор комментария или MASTER может удалить
    if (comment.userId !== user.id && !isAdminRequest) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления комментария' },
        { status: 403 }
      );
    }

    // Удалить комментарий
    await prisma.bimModelComment.delete({
      where: { id: commentIdNum },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка удаления комментария:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления комментария' },
      { status: 500 }
    );
  }
}



