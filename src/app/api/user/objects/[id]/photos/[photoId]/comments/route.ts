import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить комментарии к фото
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    const photoId = parseInt(resolvedParams.photoId);
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email не предоставлен' }, { status: 400 });
    }

    if (isNaN(objectId) || isNaN(photoId)) {
      return NextResponse.json({ success: false, message: 'Неверный ID' }, { status: 400 });
    }

    // Проверяем доступ пользователя
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

    if (user.objects.length === 0 && user.role !== 'MASTER') {
      return NextResponse.json({ success: false, message: 'Нет доступа к объекту' }, { status: 403 });
    }

    // Проверяем, что фото существует и доступно
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        objectId: objectId,
        isVisibleToCustomer: true
      }
    });

    if (!photo) {
      return NextResponse.json({ success: false, message: 'Фото не найдено' }, { status: 404 });
    }

    // Получаем комментарии
    const comments = await prisma.photoComment.findMany({
      where: {
        photoId: photoId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      comments: comments
    });

  } catch (error) {
    console.error('Ошибка при получении комментариев:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST - добавить комментарий к фото
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    const photoId = parseInt(resolvedParams.photoId);

    const body = await request.json();
    const { email, content } = body;

    if (!email || !content) {
      return NextResponse.json({ success: false, message: 'Email и текст комментария обязательны' }, { status: 400 });
    }

    if (isNaN(objectId) || isNaN(photoId)) {
      return NextResponse.json({ success: false, message: 'Неверный ID' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ success: false, message: 'Комментарий слишком длинный (максимум 1000 символов)' }, { status: 400 });
    }

    // Проверяем пользователя
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

    // Проверяем доступ к объекту (заказчик должен иметь объект, админ - всё)
    const hasAccess = user.role === 'MASTER' || user.objects.length > 0;
    if (!hasAccess) {
      return NextResponse.json({ success: false, message: 'Нет доступа к объекту' }, { status: 403 });
    }

    // Проверяем фото
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        objectId: objectId,
        ...(user.role !== 'MASTER' && { isVisibleToCustomer: true })
      }
    });

    if (!photo) {
      return NextResponse.json({ success: false, message: 'Фото не найдено' }, { status: 404 });
    }

    // Создаем комментарий
    const comment = await prisma.photoComment.create({
      data: {
        photoId: photoId,
        userId: user.id,
        content: content,
        isAdminComment: user.role === 'MASTER',
        isReadByAdmin: user.role === 'MASTER',
        isReadByCustomer: user.role === 'USER'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      comment: comment
    });

  } catch (error) {
    console.error('Ошибка при создании комментария:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
