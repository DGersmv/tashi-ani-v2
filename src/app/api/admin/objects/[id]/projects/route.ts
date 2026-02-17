import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
        message: 'Недостаточно прав для создания проектов' 
      }, { status: 403 });
    }

    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json({ 
        success: false, 
        message: 'Название проекта обязательно' 
      }, { status: 400 });
    }

    // Создаем проект
    const project = await prisma.project.create({
      data: {
        title,
        description: description || '',
        status: 'PLANNING',
        objectId: objectId
      },
      include: {
        documents: {
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
        },
        _count: {
          select: {
            photos: true,
            documents: true,
            messages: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Проект создан',
      project
    });

  } catch (error) {
    console.error('Ошибка создания проекта:', error);
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
        message: 'Недостаточно прав для просмотра проектов' 
      }, { status: 403 });
    }

    const projects = await prisma.project.findMany({
      where: { objectId },
      include: {
        documents: {
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
        },
        _count: {
          select: {
            photos: true,
            documents: true,
            messages: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      projects
    });

  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

