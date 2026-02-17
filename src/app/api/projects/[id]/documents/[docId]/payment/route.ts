import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const projectId = parseInt(id);
    const documentId = parseInt(docId);

    // Проверяем авторизацию (только админы могут изменять статус оплаты)
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
        message: 'Недостаточно прав для изменения статуса оплаты' 
      }, { status: 403 });
    }

    const { isPaid } = await request.json();

    if (typeof isPaid !== 'boolean') {
      return NextResponse.json({ 
        success: false, 
        message: 'Неверный формат статуса оплаты' 
      }, { status: 400 });
    }

    // Проверяем, что документ принадлежит указанному проекту
    const document = await prisma.document.findFirst({
      where: { 
        id: documentId,
        projectId: projectId
      }
    });

    if (!document) {
      return NextResponse.json({ 
        success: false, 
        message: 'Документ не найден в указанном проекте' 
      }, { status: 404 });
    }

    // Обновляем статус оплаты
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { isPaid },
      select: {
        id: true,
        originalName: true,
        isPaid: true,
        documentType: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Статус оплаты ${isPaid ? 'установлен' : 'снят'}`,
      document: updatedDocument
    });

  } catch (error) {
    console.error('Ошибка обновления статуса оплаты:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

