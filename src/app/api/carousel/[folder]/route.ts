import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { folder: string } }
) {
  try {
    const folderName = params.folder;
    const validFolders = ['1', '2', '3', '4'];
    
    if (!validFolders.includes(folderName)) {
      return NextResponse.json(
        { error: 'Invalid folder' },
        { status: 400 }
      );
    }

    const carouselRoot = path.join(process.cwd(), 'public', 'carousel');
    const folderPath = path.join(carouselRoot, folderName);

    // Проверяем, что каталог существует
    try {
      await fs.access(folderPath);
    } catch {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Читаем файлы из папки
    const files = await fs.readdir(folderPath);
    
    // Фильтруем только изображения
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const images = files
      .filter(file => imageExtensions.some(ext => file.toLowerCase().endsWith(ext)))
      .sort()
      .map((file, index) => ({
        src: `/carousel/${folderName}/${encodeURIComponent(file)}`,
        title: `Image ${String(index + 1).padStart(2, '0')}`,
      }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error('carousel api error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
