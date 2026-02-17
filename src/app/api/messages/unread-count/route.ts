import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    const objectId = searchParams.get('objectId');
    const isAdminView = searchParams.get('isAdminView');

    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email пользователя обязателен' 
      }, { status: 400 });
    }

    // Находим пользователя по email
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }

    // Считаем непрочитанные сообщения
    let whereClause: any = {};

    if (isAdminView === 'true') {
      // Для админа - сообщения от заказчиков (isAdminMessage: false)
      whereClause.isAdminMessage = false;
    } else {
      // Для заказчика - сообщения от админа (isAdminMessage: true)
      whereClause.isAdminMessage = true;
      
      if (objectId) {
        whereClause.objectId = parseInt(objectId);
      }
    }

    const unreadCount = await prisma.message.count({
      where: whereClause
    });

    return NextResponse.json({
      success: true,
      unreadCount: unreadCount
    });

  } catch (error: any) {
    console.error('Ошибка получения количества непрочитанных сообщений:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error.message
    }, { status: 500 });
  }
}
