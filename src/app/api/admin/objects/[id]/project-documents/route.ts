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
    const objectId = parseInt(id);

    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Токен авторизации не предоставлен' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const adminData = verifyToken(token);
    
    if (!adminData || (adminData.role !== 'ADMIN' && adminData.role !== 'MASTER')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недостаточно прав для загрузки документов' 
      }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Файлы не предоставлены' 
      }, { status: 400 });
    }

    // Создаем или находим проект для объекта (один раз для всех файлов)
    let project = await prisma.project.findFirst({
      where: { objectId: objectId }
    });

    if (!project) {
      // Получаем информацию об объекте для названия проекта
      const object = await prisma.object.findUnique({
        where: { id: objectId },
        select: { title: true }
      });

      // Создаем проект автоматически, если его нет
      project = await prisma.project.create({
        data: {
          objectId: objectId,
          title: object?.title || `Проект для объекта ${objectId}`,
          description: "Автоматически созданный проект",
          status: "PLANNING"
        }
      });
    }

    const uploadedDocuments = [];

    for (const file of files) {
      if (!file.name) continue;

      // Определяем тип документа
      const documentType = file.type.startsWith('image/') ? 'OTHER' : 
                          file.type === 'application/pdf' ? 'OTHER' : 'OTHER';

      // Генерируем уникальное имя файла
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}-${randomString}.${file.name.split('.').pop()}`;

      // Создаем директорию для проекта
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'projects', project.id.toString());
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
          documentType: documentType,
          projectId: project.id, // Документы проектов связаны с реальным projectId
          filePath: filePath,
          isPaid: false // Документы проектов по умолчанию НЕ оплачены
        }
      });

      uploadedDocuments.push(document);
    }

    return NextResponse.json({
      success: true,
      message: `Загружено ${uploadedDocuments.length} документов`,
      documents: uploadedDocuments
    });

  } catch (error: any) {
    console.error('Ошибка загрузки документов проекта:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error.message
    }, { status: 500 });
  }
}
