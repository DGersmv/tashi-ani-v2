import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { generateThumbnail } from '@/lib/imageProcessing';

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

// POST - загрузить фото/видео для заказчика
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);

    if (isNaN(objectId)) {
      return NextResponse.json({ success: false, message: "Неверный ID объекта" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const isVisibleToCustomer = formData.get('isVisibleToCustomer') === 'true';

    if (!file) {
      return NextResponse.json({ success: false, message: "Файл не найден" }, { status: 400 });
    }

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/avi', 'video/mov'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: "Неподдерживаемый тип файла" }, { status: 400 });
    }

    // Проверяем размер файла (максимум 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "Файл слишком большой (максимум 50MB)" }, { status: 400 });
    }

    // Создаем уникальное имя файла
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    // Определяем папку для сохранения
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString());
    
    // Создаем папку если не существует
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    let thumbnailData: Record<string, any> = {};
    let thumbnailUrl: string | null = null;

    if (file.type.startsWith('image/') && file.type !== 'image/gif') {
      try {
        const thumbnailDir = join(uploadDir, 'thumbnails');
        if (!existsSync(thumbnailDir)) {
          await mkdir(thumbnailDir, { recursive: true });
        }

        const thumbnailFilename = `thumb-${fileName}`;
        const thumbnailPath = join(thumbnailDir, thumbnailFilename);
        const thumbnail = await generateThumbnail(buffer);

        await writeFile(thumbnailPath, thumbnail.buffer);

        thumbnailData = {
          thumbnailFilename,
          thumbnailFilePath: `/uploads/objects/${objectId}/thumbnails/${thumbnailFilename}`,
          thumbnailFileSize: thumbnail.buffer.length,
          thumbnailWidth: thumbnail.width ?? null,
          thumbnailHeight: thumbnail.height ?? null,
          thumbnailMimeType: thumbnail.mimeType,
        };

        thumbnailUrl = `${thumbnailData.thumbnailFilePath}?v=${Date.now()}`;
      } catch (thumbError) {
        console.error('Ошибка генерации превью фотографии:', thumbError);
      }
    }

    const photoData: Record<string, any> = {
      objectId: objectId,
      filename: fileName,
      originalName: file.name,
      filePath: `/uploads/objects/${objectId}/${fileName}`,
      fileSize: file.size,
      mimeType: file.type,
      isVisibleToCustomer: isVisibleToCustomer,
      uploadedAt: new Date(),
      ...thumbnailData,
    };

    const photo = await prisma.photo.create({
      data: photoData,
    });

    return NextResponse.json({ 
      success: true, 
      photo: {
        id: photo.id,
        filename: photo.filename,
        originalName: photo.originalName,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
        isVisibleToCustomer: photo.isVisibleToCustomer,
        uploadedAt: photo.uploadedAt.toISOString(),
        url: buildPhotoUrl(objectId, photo),
        thumbnailUrl: thumbnailUrl ?? buildPhotoThumbnailUrl(objectId, photo),
      }
    });

  } catch (error) {
    console.error("Ошибка загрузки файла:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// PUT - изменить видимость фото для заказчика
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);

    if (isNaN(objectId)) {
      return NextResponse.json({ success: false, message: "Неверный ID объекта" }, { status: 400 });
    }

    const { photoId, isVisibleToCustomer } = await request.json();

    if (!photoId || typeof isVisibleToCustomer !== 'boolean') {
      return NextResponse.json({ success: false, message: "Неверные параметры" }, { status: 400 });
    }

    const updatedPhoto = await prisma.photo.update({
      where: { 
        id: photoId,
        objectId: objectId // Убеждаемся что фото принадлежит этому объекту
      },
      data: { isVisibleToCustomer }
    });

    return NextResponse.json({ 
      success: true, 
      photo: {
        ...updatedPhoto,
        url: buildPhotoUrl(objectId, updatedPhoto),
        thumbnailUrl: buildPhotoThumbnailUrl(objectId, updatedPhoto),
      }
    });

  } catch (error) {
    console.error("Ошибка обновления фото:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// DELETE - удалить фото
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);

    if (isNaN(objectId)) {
      return NextResponse.json({ success: false, message: "Неверный ID объекта" }, { status: 400 });
    }

    const { photoId } = await request.json();

    if (!photoId) {
      return NextResponse.json({ success: false, message: "ID фото обязателен" }, { status: 400 });
    }

    // Получаем информацию о фото
    const photo = await prisma.photo.findFirst({
      where: { 
        id: photoId,
        objectId: objectId
      }
    });

    if (!photo) {
      return NextResponse.json({ success: false, message: "Фото не найдено" }, { status: 404 });
    }

    // Удаляем файл с диска
    const relativeFilePath = resolveFilePath(photo.filePath, `/uploads/objects/${objectId}/${photo.filename}`);
    const absoluteFilePath = join(process.cwd(), 'public', relativeFilePath.replace(/^\/+/, ''));
    if (existsSync(absoluteFilePath)) {
      await import('fs/promises').then(fs => fs.unlink(absoluteFilePath));
    }

    if (photo.thumbnailFilePath) {
      const thumbnailPath = join(process.cwd(), 'public', photo.thumbnailFilePath.replace(/^\/+/, ''));
      if (existsSync(thumbnailPath)) {
        await import('fs/promises').then(fs => fs.unlink(thumbnailPath));
      }
    }

    // Удаляем запись из базы данных
    await prisma.photo.delete({
      where: { id: photoId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Ошибка удаления фото:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
