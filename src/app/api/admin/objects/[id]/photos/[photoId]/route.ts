import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/userManagement";

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

// PATCH /api/admin/objects/[id]/photos/[photoId] - обновить фото (назначить в папку)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    const photoId = parseInt(resolvedParams.photoId);
    
    if (isNaN(objectId) || isNaN(photoId)) {
      return NextResponse.json(
        { success: false, message: "Неверные параметры" },
        { status: 400 }
      );
    }

    // Проверка авторизации админа
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Не авторизован" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const adminData = verifyToken(token);

    if (!adminData || (adminData.role !== "ADMIN" && adminData.role !== "MASTER")) {
      return NextResponse.json(
        { success: false, message: "Доступ запрещен" },
        { status: 403 }
      );
    }

    // Проверяем существование фото
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        objectId
      }
    });

    if (!photo) {
      return NextResponse.json(
        { success: false, message: "Фото не найдено" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { folderId, isVisibleToCustomer } = body;

    const updateData: any = {};
    
    // Если назначаем в папку
    if (folderId !== undefined) {
      if (folderId === null) {
        // Убираем из папки
        updateData.folderId = null;
      } else {
        const folderIdNum = parseInt(folderId);
        if (isNaN(folderIdNum)) {
          return NextResponse.json(
            { success: false, message: "Неверный ID папки" },
            { status: 400 }
          );
        }

        // Проверяем существование папки
        const folder = await prisma.photoFolder.findFirst({
          where: {
            id: folderIdNum,
            objectId
          }
        });

        if (!folder) {
          return NextResponse.json(
            { success: false, message: "Папка не найдена" },
            { status: 404 }
          );
        }

        updateData.folderId = folderIdNum;
        // При назначении в папку автоматически делаем видимым для заказчика
        updateData.isVisibleToCustomer = true;
      }
    }

    // Можно явно управлять видимостью
    if (typeof isVisibleToCustomer === "boolean") {
      updateData.isVisibleToCustomer = isVisibleToCustomer;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "Нет данных для обновления" },
        { status: 400 }
      );
    }

    // Обновляем фото
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: updateData,
      include: {
        folder: true
      }
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: updatedPhoto.id,
        filename: updatedPhoto.filename,
        originalName: updatedPhoto.originalName,
        isVisibleToCustomer: updatedPhoto.isVisibleToCustomer,
        folderId: updatedPhoto.folderId,
        folderName: updatedPhoto.folder?.name || null,
        uploadedAt: updatedPhoto.uploadedAt.toISOString(),
        url: buildPhotoUrl(objectId, updatedPhoto),
        thumbnailUrl: buildPhotoThumbnailUrl(objectId, updatedPhoto),
      }
    });

  } catch (error) {
    console.error("Ошибка обновления фото:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

