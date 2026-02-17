import { NextRequest, NextResponse } from "next/server";
import { createUser, userExists } from "@/lib/userManagement";
import { verifyToken } from "@/lib/userManagement";

export async function POST(request: NextRequest) {
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

    const { email, password, name, role = 'USER' } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: "Email и пароль обязательны" 
      }, { status: 400 });
    }

    // Проверяем минимальную длину пароля
    if (password.length < 6) {
      return NextResponse.json({ 
        success: false, 
        message: "Пароль должен содержать минимум 6 символов" 
      }, { status: 400 });
    }

    // Проверяем, существует ли пользователь
    const exists = await userExists(email);
    if (exists) {
      return NextResponse.json({ 
        success: false, 
        message: "Пользователь с таким email уже существует" 
      }, { status: 409 });
    }

    // Создаем нового пользователя
    const user = await createUser(email, password, name, role);

    return NextResponse.json({
      success: true,
      message: "Пользователь успешно создан",
      user: user
    });

  } catch (error) {
    console.error("Ошибка создания пользователя:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Ошибка создания пользователя" 
    }, { status: 500 });
  }
}
