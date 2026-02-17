import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const isAdmin = searchParams.get("isAdmin") === "true";
    const objectId = searchParams.get("objectId");

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email не предоставлен" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Формируем условие для поиска сообщений
    const whereCondition: any = {};
    
    if (objectId) {
      whereCondition.objectId = parseInt(objectId);
    }

    if (isAdmin) {
      // Админ помечает сообщения от заказчиков как прочитанные
      whereCondition.isAdminMessage = false;
      
      await prisma.message.updateMany({
        where: whereCondition,
        data: { isReadByAdmin: true }
      });
    } else {
      // Заказчик помечает сообщения от админа как прочитанные
      whereCondition.isAdminMessage = true;
      
      await prisma.message.updateMany({
        where: whereCondition,
        data: { isReadByCustomer: true }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Сообщения помечены как прочитанные"
    });
  } catch (error) {
    console.error("Ошибка пометки сообщений:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}



