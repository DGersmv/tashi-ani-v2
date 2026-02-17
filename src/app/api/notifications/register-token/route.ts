import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Регистрация FCM токена для push-уведомлений
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fcmToken } = body;

    if (!email || !fcmToken) {
      return NextResponse.json(
        { success: false, message: 'Email и FCM токен обязательны' },
        { status: 400 }
      );
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Сохраняем или обновляем FCM токен
    await prisma.user.update({
      where: { id: user.id },
      data: { fcmToken }
    });

    return NextResponse.json({
      success: true,
      message: 'FCM токен успешно зарегистрирован'
    });

  } catch (error) {
    console.error('Ошибка при регистрации FCM токена:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
