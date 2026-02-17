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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const objectId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, message: "Email обязателен" }, { status: 400 });
    }

    // Найти объект с полной информацией
    const object = await prisma.object.findFirst({
      where: { 
        id: objectId,
        user: { email }
      },
      include: {
        projects: {
          include: {
            documents: true, // Включаем документы проектов
            stages: {
              include: {
                photos: {
                  where: {
                    isVisibleToCustomer: true
                  }
                }
              }
            },
            photos: {
              where: {
                isVisibleToCustomer: true
              }
            },
            _count: {
              select: {
                photos: true,
                documents: true,
                messages: true
              }
            }
          }
        },
        photos: {
          where: {
            isVisibleToCustomer: true
          },
          include: {
            folder: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        panoramas: {
          where: {
            isVisibleToCustomer: true
          }
        },
        documents: true,
        messages: {
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
        },
        bimModels: {
          include: {
            uploadedByUser: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          },
          orderBy: {
            uploadedAt: 'desc'
          }
        }
      }
    });

    if (!object) {
      return NextResponse.json({ success: false, message: "Объект не найден" }, { status: 404 });
    }

    // Считаем непрочитанные сообщения от админа для заказчика
    const unreadMessagesCount = await prisma.message.count({
      where: {
        objectId: objectId,
        isAdminMessage: true,
        isReadByCustomer: false
      }
    });

    // Считаем непрочитанные комментарии от админа
    const photoIds = object.photos.map(p => p.id);
    const panoramaIds = object.panoramas.map(p => p.id);
    let unreadPhotoCommentsCount = 0;
    let unreadPanoramaCommentsCount = 0;
    let totalPhotoCommentsCount = 0;
    let totalPanoramaCommentsCount = 0;

    if (photoIds.length > 0) {
      unreadPhotoCommentsCount = await prisma.photoComment.count({
        where: {
          photoId: { in: photoIds },
          isAdminComment: true,
          isReadByCustomer: false
        }
      });

      totalPhotoCommentsCount = await prisma.photoComment.count({
        where: { photoId: { in: photoIds } }
      });
    }

    if (panoramaIds.length > 0) {
      unreadPanoramaCommentsCount = await prisma.panoramaComment.count({
        where: {
          panoramaId: { in: panoramaIds },
          isAdminComment: true,
          isReadByCustomer: false
        }
      });

      totalPanoramaCommentsCount = await prisma.panoramaComment.count({
        where: { panoramaId: { in: panoramaIds } }
      });
    }

    // Считаем общее количество
    const totalMessagesCount = await prisma.message.count({
      where: { objectId: objectId }
    });

    // Для каждого фото считаем непрочитанные комментарии
    const photosWithUnreadComments = await Promise.all(object.photos.map(async (photo) => {
      const unreadPhotoComments = await prisma.photoComment.count({
        where: {
          photoId: photo.id,
          isAdminComment: true,
          isReadByCustomer: false
        }
      });

      const thumbUrl = buildPhotoThumbnailUrl(objectId, photo);
      const cacheBuster = photo?.uploadedAt ? new Date(photo.uploadedAt).getTime() : Date.now();
      return {
        ...photo,
        url: buildPhotoUrl(objectId, photo),
        thumbnailUrl: thumbUrl
          ? `/api/uploads/objects/${objectId}/thumbnails/${photo.thumbnailFilename}?email=${encodeURIComponent(email)}&v=${cacheBuster}`
          : null,
        unreadCommentsCount: unreadPhotoComments
      };
    }));

    const panoramasWithUnreadComments = await Promise.all(object.panoramas.map(async (panorama) => {
      const unreadPanoramaComments = await prisma.panoramaComment.count({
        where: {
          panoramaId: panorama.id,
          isAdminComment: true,
          isReadByCustomer: false
        }
      });

      return {
        ...panorama,
        url: buildPanoramaUrl(objectId, panorama),
        thumbnailUrl: buildPanoramaThumbnailUrl(objectId, panorama),
        unreadCommentsCount: unreadPanoramaComments
      };
    }));

    return NextResponse.json({ 
      success: true, 
      object: {
        ...object,
        photos: photosWithUnreadComments,
        panoramas: panoramasWithUnreadComments,
        unreadMessagesCount,
        unreadCommentsCount: unreadPhotoCommentsCount + unreadPanoramaCommentsCount,
        unreadPhotoCommentsCount,
        unreadPanoramaCommentsCount,
        totalMessagesCount,
        totalCommentsCount: totalPhotoCommentsCount + totalPanoramaCommentsCount,
        totalPhotoCommentsCount,
        totalPanoramaCommentsCount
      }
    });

  } catch (error) {
    console.error('Ошибка загрузки объекта:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Внутренняя ошибка сервера" 
    }, { status: 500 });
  }
}
