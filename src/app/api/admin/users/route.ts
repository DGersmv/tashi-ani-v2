import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';

export async function GET(request: NextRequest) {
  try {
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
        message: 'Недостаточно прав для просмотра пользователей' 
      }, { status: 403 });
    }

    // Получаем всех пользователей с их объектами
    const users = await prisma.user.findMany({
      include: {
        objects: {
          include: {
            _count: {
              select: {
                photos: true,
                documents: true,
                projects: true,
                messages: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
        message: 'Недостаточно прав для добавления пользователей' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, role = 'USER' } = body;

    // Проверяем, что email заполнен (обязательное поле)
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email обязателен для заполнения'
      }, { status: 400 });
    }

    // Проверяем, что пароль заполнен
    if (!password) {
      return NextResponse.json({
        success: false,
        message: 'Пароль обязателен для заполнения'
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        message: 'Пароль должен содержать минимум 6 символов'
      }, { status: 400 });
    }

    // Проверяем, что пользователь с таким email не существует
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Пользователь с таким email уже существует'
      }, { status: 409 });
    }

    // Хешируем пароль
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем нового пользователя
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null, // name опционально
        password: hashedPassword,
        role: role
      }
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'Пользователь успешно добавлен'
    });

  } catch (error) {
    console.error('Ошибка добавления пользователя:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
        message: 'Недостаточно прав для удаления пользователей' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'ID пользователя не указан'
      }, { status: 400 });
    }

    // Удаляем пользователя
    await prisma.user.delete({
      where: { id: parseInt(userId) }
    });

    return NextResponse.json({
      success: true,
      message: 'Пользователь успешно удален'
    });

  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}