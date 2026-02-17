import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/userManagement";
import bcrypt from 'bcryptjs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверяем авторизацию админа
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        message: "Требуется авторизация" 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'MASTER') {
      return NextResponse.json({ 
        success: false, 
        message: "Доступ запрещен. Требуются права администратора" 
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ 
        success: false, 
        message: "Неверный ID пользователя" 
      }, { status: 400 });
    }

    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json({ 
        success: false, 
        message: "Новый пароль обязателен" 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        success: false, 
        message: "Пароль должен содержать минимум 6 символов" 
      }, { status: 400 });
    }

    // Проверяем, существует ли пользователь
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: "Пользователь не найден" 
      }, { status: 404 });
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return NextResponse.json({
      success: true,
      message: "Пароль успешно изменен"
    });

  } catch (error) {
    console.error("Ошибка сброса пароля:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Ошибка сброса пароля" 
    }, { status: 500 });
  }
}
