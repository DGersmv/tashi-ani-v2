import { NextRequest, NextResponse } from "next/server";
import { authenticateMasterAdmin } from "@/lib/userManagement";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: "Email и пароль обязательны" 
      }, { status: 400 });
    }

    const result = await authenticateMasterAdmin(email, password);

    if (result.success && result.user && result.token) {
      return NextResponse.json({
        success: true,
        message: "Успешная аутентификация мастер-админа",
        user: result.user,
        token: result.token
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Неверный email или пароль"
      }, { status: 401 });
    }

  } catch (error) {
    console.error("Ошибка аутентификации мастер-админа:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Ошибка аутентификации" 
    }, { status: 500 });
  }
}

















