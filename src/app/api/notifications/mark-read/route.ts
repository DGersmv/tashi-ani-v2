import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Отметить уведомление как прочитанное
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, notificationId } = body;

    if (!email || !notificationId) {
      return NextResponse.json(
        { success: false, message: 'Email и ID уведомления обязательны' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Обновляем статус уведомления
    await prisma.notification.updateMany({
      where: {
        id: parseInt(notificationId),
        userId: user.id
      },
      data: { isRead: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Уведомление отмечено как прочитанное'
    });

  } catch (error) {
    console.error('Ошибка при обновлении уведомления:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
