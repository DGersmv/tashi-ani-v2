import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';
import path from 'path';
import fs from 'fs/promises';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const objectId = parseInt(id);
    
    // Проверяем авторизацию админа
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Не авторизован' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminData = verifyToken(token);
    console.log('Admin token verification:', { adminData, token: token.substring(0, 20) + '...' });
    if (!adminData || (adminData.role !== 'ADMIN' && adminData.role !== 'MASTER')) {
      return NextResponse.json({ success: false, message: 'Недостаточно прав' }, { status: 403 });
    }

    // Получаем данные формы
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const documentType = formData.get('documentType') as string || 'OTHER';

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'Файлы не выбраны' }, { status: 400 });
    }

    // Создаем папку для документов объекта
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString());
    await fs.mkdir(uploadDir, { recursive: true });

    const uploadedDocuments = [];

    for (const file of files) {
      if (file.size === 0) continue;

      // Генерируем уникальное имя файла
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(file.name);
      const filename = `${timestamp}-${randomString}${fileExtension}`;

      // Сохраняем файл
      const filePath = path.join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      // Создаем запись в базе данных
      const document = await prisma.document.create({
        data: {
          filename,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          documentType: documentType as any,
          objectId: objectId,
          filePath: filePath,
          isPaid: true // Документы в папке "Документы" всегда оплачены
        }
      });

      uploadedDocuments.push(document);
    }

    return NextResponse.json({
      success: true,
      message: `Загружено ${uploadedDocuments.length} документов`,
      documents: uploadedDocuments
    });

  } catch (error) {
    console.error('Ошибка загрузки документов:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    success: false,
    message: 'Функция обновления видимости документов временно отключена'
  }, { status: 501 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const objectId = parseInt(id);
    
    // Проверяем авторизацию админа
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Не авторизован' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminData = verifyToken(token);
    if (!adminData || (adminData.role !== 'ADMIN' && adminData.role !== 'MASTER')) {
      return NextResponse.json({ success: false, message: 'Недостаточно прав' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ success: false, message: 'ID документа обязателен' }, { status: 400 });
    }

    // Получаем информацию о документе
    const document = await prisma.document.findUnique({
      where: { id: parseInt(documentId) }
    });

    if (!document) {
      return NextResponse.json({ success: false, message: 'Документ не найден' }, { status: 404 });
    }

    // Удаляем файл с диска
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'objects', objectId.toString(), document.filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Файл не найден на диске:', filePath);
    }

    // Удаляем запись из базы данных
    await prisma.document.delete({
      where: { id: parseInt(documentId) }
    });

    return NextResponse.json({
      success: true,
      message: 'Документ удален'
    });

  } catch (error) {
    console.error('Ошибка удаления документа:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}
