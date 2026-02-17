import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email не предоставлен' }, { status: 400 });
    }

    if (isNaN(objectId)) {
      return NextResponse.json({ success: false, message: 'Неверный ID объекта' }, { status: 400 });
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

    // Получаем все папки объекта, которые содержат фото, видимые для заказчика
    const folders = await prisma.photoFolder.findMany({
      where: { 
        objectId,
        photos: {
          some: {
            isVisibleToCustomer: true
          }
        }
      },
      include: {
        _count: {
          select: {
            photos: {
              where: {
                isVisibleToCustomer: true
              }
            }
          }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    // Подсчитываем количество фото без папки (folderId = null)
    const allPhotosCount = await prisma.photo.count({
      where: {
        objectId,
        isVisibleToCustomer: true,
        folderId: null
      }
    });

    // Формируем список папок, включая "Все фото"
    const foldersList = folders.map(f => ({
      id: f.id,
      name: f.name,
      orderIndex: f.orderIndex,
      photoCount: f._count.photos,
      createdAt: f.createdAt.toISOString()
    }));

    // Добавляем папку "Все фото" в начало, если есть фото
    const totalPhotosCount = await prisma.photo.count({
      where: {
        objectId,
        isVisibleToCustomer: true
      }
    });

    if (totalPhotosCount > 0) {
      foldersList.unshift({
        id: null,
        name: 'Все фото',
        orderIndex: -1,
        photoCount: totalPhotosCount,
        createdAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      folders: foldersList
    });

  } catch (error) {
    console.error('Ошибка при получении папок объекта:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

