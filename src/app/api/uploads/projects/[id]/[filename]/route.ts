import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id, filename } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Неверный ID проекта' 
      }, { status: 400 });
    }

    // Декодируем имя файла для корректной обработки кириллицы
    const decodedFilename = decodeURIComponent(filename);
    
    // Путь к файлу
    const filePath = path.join(
      process.cwd(),
      'public',
      'uploads',
      'projects',
      projectId.toString(),
      decodedFilename
    );

    // Проверяем существование файла
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error('Файл не найден:', filePath);
      return NextResponse.json({ 
        success: false, 
        message: 'Файл не найден' 
      }, { status: 404 });
    }

    // Читаем файл
    const fileBuffer = await fs.readFile(filePath);
    
    // Определяем MIME тип
    const ext = path.extname(decodedFilename).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    if (ext === '.pdf') {
      mimeType = 'application/pdf';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    } else if (ext === '.gif') {
      mimeType = 'image/gif';
    } else if (ext === '.webp') {
      mimeType = 'image/webp';
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${decodedFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Ошибка получения файла проекта:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

