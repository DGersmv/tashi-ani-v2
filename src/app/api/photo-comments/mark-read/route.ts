import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const isAdmin = searchParams.get("isAdmin") === "true";
    const photoId = searchParams.get("photoId");

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

    // Формируем условие для поиска комментариев
    const whereCondition: any = {};
    
    if (photoId) {
      whereCondition.photoId = parseInt(photoId);
    }

    if (isAdmin) {
      // Админ помечает комментарии от заказчиков как прочитанные
      whereCondition.isAdminComment = false;
      
      await prisma.photoComment.updateMany({
        where: whereCondition,
        data: { isReadByAdmin: true }
      });
    } else {
      // Заказчик помечает комментарии от админа как прочитанные
      whereCondition.isAdminComment = true;
      
      await prisma.photoComment.updateMany({
        where: whereCondition,
        data: { isReadByCustomer: true }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Комментарии помечены как прочитанные"
    });
  } catch (error) {
    console.error("Ошибка пометки комментариев:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}



