import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const folderIdParam = searchParams.get('folderId');
    const objectId = parseInt(resolvedParams.id);

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

    // Формируем условие для фильтрации по папке
    // Если folderId = null или не указан, показываем все фото
    // Если folderId указан, показываем фото только этой папки
    const whereCondition: any = {
      objectId: objectId,
      isVisibleToCustomer: true
    };

    if (folderIdParam !== null && folderIdParam !== undefined) {
      if (folderIdParam === 'null' || folderIdParam === '') {
        // Показываем только фото без папки
        whereCondition.folderId = null;
      } else {
        const folderId = parseInt(folderIdParam);
        if (!isNaN(folderId)) {
          whereCondition.folderId = folderId;
        }
      }
    }

    // Получаем фото объекта, видимые для заказчика
    const photos = await prisma.photo.findMany({
      where: whereCondition,
      include: {
        folder: {
          select: { id: true, name: true }
        },
        comments: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    // Добавляем thumbnail URLs к каждому фото для оптимизации загрузки
    // Cache buster (v=timestamp) основан на uploadedAt, обеспечивает инвалидацию кэша только при обновлении файла
    const photosWithThumbnails = photos.map(photo => {
      const thumbnailUrl = photo.thumbnailFilename 
        ? `/api/uploads/objects/${objectId}/thumbnails/${photo.thumbnailFilename}?email=${encodeURIComponent(email)}&v=${photo?.uploadedAt ? new Date(photo.uploadedAt).getTime() : Date.now()}`
        : null;
      
      return {
        ...photo,
        thumbnailUrl,
        objectId // objectId необходим для компонентов, которые отображают фото вне контекста родительского объекта
      };
    });

    return NextResponse.json({
      success: true,
      photos: photosWithThumbnails
    });

  } catch (error) {
    console.error('Ошибка при получении фото объекта:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}