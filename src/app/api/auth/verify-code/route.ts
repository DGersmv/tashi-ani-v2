import { NextRequest, NextResponse } from "next/server";
import { authenticateUserWithCode } from "@/lib/userManagement";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ 
        success: false, 
        message: "Email и код обязательны" 
      }, { status: 400 });
    }

    const result = await authenticateUserWithCode(email, code);

    if (result.success && result.user && result.token) {
      return NextResponse.json({
        success: true,
        message: "Успешная аутентификация",
        user: result.user,
        token: result.token
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Неверный код или код истек"
      }, { status: 401 });
    }

  } catch (error) {
    console.error("Ошибка верификации кода:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Ошибка верификации кода" 
    }, { status: 500 });
  }
}