import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const resolveFilePath = (explicitPath: string | null | undefined, fallbackPath: string) => {
  if (typeof explicitPath === 'string' && explicitPath.trim().length > 0) {
    return explicitPath;
  }
  return fallbackPath;
};

const buildPhotoUrl = (objectId: number, photo: any) => {
  const fallbackPath = `/uploads/objects/${objectId}/${photo.filename}`;
  const baseUrl = resolveFilePath(photo?.filePath, fallbackPath);
  const uploadedAt = photo?.uploadedAt ? new Date(photo.uploadedAt) : new Date();
  const cacheBuster = Number.isFinite(uploadedAt.getTime()) ? uploadedAt.getTime() : Date.now();
  return `${baseUrl}?v=${cacheBuster}`;
};

const buildPhotoThumbnailUrl = (objectId: number, photo: any) => {
  if (!photo?.thumbnailFilename && !photo?.thumbnailFilePath) {
    return null;
  }
  const fallbackPath = `/uploads/objects/${objectId}/thumbnails/${photo.thumbnailFilename}`;
  const baseUrl = resolveFilePath(photo?.thumbnailFilePath, fallbackPath);
  const uploadedAt = photo?.uploadedAt ? new Date(photo.uploadedAt) : new Date();
  const cacheBuster = Number.isFinite(uploadedAt.getTime()) ? uploadedAt.getTime() : Date.now();
  return `${baseUrl}?v=${cacheBuster}`;
};

const buildPanoramaUrl = (objectId: number, panorama: any) => {
  const fallbackPath = `/uploads/objects/${objectId}/panoramas/${panorama.filename}`;
  const baseUrl = resolveFilePath(panorama?.filePath, fallbackPath);
  const uploadedAt = panorama?.uploadedAt ? new Date(panorama.uploadedAt) : new Date();
  const cacheBuster = Number.isFinite(uploadedAt.getTime()) ? uploadedAt.getTime() : Date.now();
  return `${baseUrl}?v=${cacheBuster}`;
};

const buildPanoramaThumbnailUrl = (objectId: number, panorama: any) => {
  if (!panorama?.thumbnailFilename && !panorama?.thumbnailFilePath) {
    return null;
  }
  const fallbackPath = `/uploads/objects/${objectId}/panoramas/thumbnails/${panorama.thumbnailFilename}`;
  const baseUrl = resolveFilePath(panorama?.thumbnailFilePath, fallbackPath);
  const uploadedAt = panorama?.uploadedAt ? new Date(panorama.uploadedAt) : new Date();
  const cacheBuster = Number.isFinite(uploadedAt.getTime()) ? uploadedAt.getTime() : Date.now();
  return `${baseUrl}?v=${cacheBuster}`;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, message: "Email обязателен" }, { status: 400 });
    }

    // Найти пользователя с его объектами
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        objects: {
          include: {
            projects: {
              select: {
                id: true,
                title: true,
                status: true,
                createdAt: true
              }
            },
            photos: {
              where: {
                isVisibleToCustomer: true
              }
            },
            panoramas: {
              where: {
                isVisibleToCustomer: true
              }
            },
            _count: {
              select: {
                documents: true,
                messages: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Пользователь не найден" }, { status: 404 });
    }

    // Для каждого объекта считаем статистику непрочитанных
    const objectsWithStats = await Promise.all(user.objects.map(async (obj) => {
      const photoIds = obj.photos.map(p => p.id);
      const panoramaIds = obj.panoramas.map(p => p.id);
      
      const unreadMessages = await prisma.message.count({
        where: {
          objectId: obj.id,
          isAdminMessage: true,
          isReadByCustomer: false
        }
      });

      let unreadPhotoComments = 0;
      let unreadPanoramaComments = 0;
      let totalPhotoComments = 0;
      let totalPanoramaComments = 0;
      
      if (photoIds.length > 0) {
        unreadPhotoComments = await prisma.photoComment.count({
          where: {
            photoId: { in: photoIds },
            isAdminComment: true,
            isReadByCustomer: false
          }
        });

        totalPhotoComments = await prisma.photoComment.count({
          where: { photoId: { in: photoIds } }
        });
      }

      if (panoramaIds.length > 0) {
        unreadPanoramaComments = await prisma.panoramaComment.count({
          where: {
            panoramaId: { in: panoramaIds },
            isAdminComment: true,
            isReadByCustomer: false
          }
        });

        totalPanoramaComments = await prisma.panoramaComment.count({
          where: { panoramaId: { in: panoramaIds } }
        });
      }

      const totalMessages = obj._count.messages;

      const photosWithUrls = obj.photos.map(photo => {
        const thumbUrl = buildPhotoThumbnailUrl(obj.id, photo);
        const cacheBuster = photo?.uploadedAt ? new Date(photo.uploadedAt).getTime() : Date.now();
        return {
          ...photo,
          url: buildPhotoUrl(obj.id, photo),
          thumbnailUrl: thumbUrl
            ? `/api/uploads/objects/${obj.id}/thumbnails/${photo.thumbnailFilename}?email=${encodeURIComponent(email)}&v=${cacheBuster}`
            : null,
        };
      });

      const panoramasWithUrls = obj.panoramas.map(panorama => ({
        ...panorama,
        url: buildPanoramaUrl(obj.id, panorama),
        thumbnailUrl: buildPanoramaThumbnailUrl(obj.id, panorama),
      }));

      return {
        ...obj,
        photos: photosWithUrls,
        panoramas: panoramasWithUrls,
        unreadMessagesCount: unreadMessages,
        unreadCommentsCount: unreadPhotoComments + unreadPanoramaComments,
        unreadPhotoCommentsCount: unreadPhotoComments,
        unreadPanoramaCommentsCount: unreadPanoramaComments,
        totalMessagesCount: totalMessages,
        totalCommentsCount: totalPhotoComments + totalPanoramaComments,
        totalPhotoCommentsCount: totalPhotoComments,
        totalPanoramaCommentsCount: totalPanoramaComments
      };
    }));

    return NextResponse.json({ 
      success: true, 
      objects: objectsWithStats 
    });

  } catch (error) {
    console.error('Ошибка загрузки объектов пользователя:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Внутренняя ошибка сервера" 
    }, { status: 500 });
  }
}
