import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const file = formData.get('file') as File;

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email не предоставлен' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ success: false, message: 'Файл не предоставлен' }, { status: 400 });
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

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Неподдерживаемый тип файла' }, { status: 400 });
    }

    // Проверяем размер файла (максимум 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, message: 'Файл слишком большой (максимум 50MB)' }, { status: 400 });
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Путь для сохранения
    const uploadDir = join(process.cwd(), 'uploads', 'objects', objectId.toString());
    const filePath = join(uploadDir, filename);

    // Создаем директорию если не существует
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Сохраняем файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Создаем запись в БД
    const photo = await prisma.photo.create({
      data: {
        objectId: objectId,
        filename: filename,
        originalName: file.name,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.type,
        isVisibleToCustomer: true, // Загруженное заказчиком сразу видимо
        folderId: null // Загружается в "Все фото"
      }
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        filename: photo.filename,
        originalName: photo.originalName,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
        uploadedAt: photo.uploadedAt,
        url: `/uploads/objects/${objectId}/${filename}`
      }
    });

  } catch (error) {
    console.error('Ошибка при загрузке фото:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
