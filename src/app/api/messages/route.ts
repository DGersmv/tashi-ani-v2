import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';

export async function POST(request: NextRequest) {
  try {
    const { content, objectId, projectId, isAdminMessage, userEmail } = await request.json();

    if (!content || (!objectId && !projectId)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Содержимое сообщения и ID объекта/проекта обязательны' 
      }, { status: 400 });
    }

    let userId: number;

    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Админ с токеном
      const token = authHeader.substring(7);
      const userData = verifyToken(token);
      
      if (!userData) {
        return NextResponse.json({ 
          success: false, 
          message: 'Недействительный токен авторизации' 
        }, { status: 401 });
      }
      
      userId = userData.userId;
    } else if (userEmail) {
      // Заказчик без токена - находим пользователя по email
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      });
      
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          message: 'Пользователь не найден' 
        }, { status: 404 });
      }
      
      userId = user.id;
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Необходима авторизация или email пользователя' 
      }, { status: 401 });
    }

    // Создаем сообщение
    const message = await prisma.message.create({
      data: {
        content,
        objectId: objectId || null,
        projectId: projectId || null,
        userId: userId,
        isAdminMessage: isAdminMessage || false
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Сообщение отправлено',
      data: message
    });

  } catch (error: any) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ success: false, message: 'ID сообщения обязателен' }, { status: 400 });
    }

    // Удаляем сообщение
    await prisma.message.delete({
      where: { id: parseInt(messageId) }
    });

    return NextResponse.json({
      success: true,
      message: 'Сообщение удалено'
    });

  } catch (error: any) {
    console.error('Ошибка удаления сообщения:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

