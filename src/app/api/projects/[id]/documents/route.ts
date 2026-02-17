import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { verifyToken } from '@/lib/userManagement';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Токен авторизации не предоставлен' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userData = verifyToken(token);
    
    if (!userData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недействительный токен' 
      }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Файлы не предоставлены' 
      }, { status: 400 });
    }

    const uploadedDocuments = [];

    for (const file of files) {
      if (!file.name) continue;

      // Определяем тип документа
      const documentType = file.type.startsWith('image/') ? 'IMAGE' : 
                          file.type === 'application/pdf' ? 'PDF' : 'OTHER';

      // Генерируем уникальное имя файла
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}-${randomString}.${file.name.split('.').pop()}`;

      // Создаем директорию для проекта
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'projects', projectId.toString());
      await fs.mkdir(uploadDir, { recursive: true });

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
          projectId: projectId,
          filePath: filePath,
          isPaid: false // Документы в папке "Проекты" по умолчанию НЕ оплачены
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
    console.error('Ошибка загрузки документов проекта:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Токен авторизации не предоставлен' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userData = verifyToken(token);
    
    if (!userData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недействительный токен' 
      }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { projectId },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        uploadedAt: true,
        isPaid: true,
        documentType: true
      },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      documents
    });

  } catch (error) {
    console.error('Ошибка получения документов проекта:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = parseInt(id);

    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Токен авторизации не предоставлен' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userData = verifyToken(token);
    
    if (!userData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недействительный токен' 
      }, { status: 401 });
    }

    // Находим документ
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return NextResponse.json({ 
        success: false, 
        message: 'Документ не найден' 
      }, { status: 404 });
    }

    // Удаляем файл с диска
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      console.warn('Файл не найден на диске:', fileError);
    }

    // Удаляем запись из базы данных
    await prisma.document.delete({
      where: { id: documentId }
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

