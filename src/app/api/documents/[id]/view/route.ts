import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = parseInt(id);

    // Получаем информацию о документе
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        filename: true,
        originalName: true,
        filePath: true,
        mimeType: true,
        isPaid: true,
        documentType: true
      }
    });

    if (!document) {
      return NextResponse.json({ 
        success: false, 
        message: 'Документ не найден' 
      }, { status: 404 });
    }

    // Проверяем статус оплаты
    if (!document.isPaid) {
      return NextResponse.json({ 
        success: false, 
        message: 'Документ не оплачен',
        isPaid: false,
        document: {
          id: document.id,
          originalName: document.originalName,
          documentType: document.documentType
        }
      }, { status: 403 });
    }

    // Читаем файл
    try {
      // Проверяем существование файла
      await fs.access(document.filePath);
      const fileBuffer = await fs.readFile(document.filePath);
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': document.mimeType,
          'Content-Disposition': `inline; filename="${document.originalName}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (fileError) {
      console.error('Ошибка чтения файла:', fileError);
      console.error('Путь к файлу:', document.filePath);
      
      // Пробуем альтернативный путь через публичную папку
      try {
        const publicPath = document.filePath.replace(process.cwd() + '/public/', '/');
        const alternativePath = path.join(process.cwd(), 'public', publicPath);
        
        await fs.access(alternativePath);
        const fileBuffer = await fs.readFile(alternativePath);
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': document.mimeType,
            'Content-Disposition': `inline; filename="${document.originalName}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      } catch (altError) {
        console.error('Альтернативный путь также не найден:', altError);
        return NextResponse.json({ 
          success: false, 
          message: 'Файл не найден на сервере',
          debug: {
            originalPath: document.filePath,
            alternativePath: path.join(process.cwd(), 'public', document.filePath.replace(process.cwd() + '/public/', '/'))
          }
        }, { status: 404 });
      }
    }

  } catch (error) {
    console.error('Ошибка получения документа:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}
