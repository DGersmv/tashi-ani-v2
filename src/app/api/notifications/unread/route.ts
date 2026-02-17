import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const isAdmin = searchParams.get("isAdmin") === "true";

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email не предоставлен" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        objects: {
          select: { id: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const objectIds = user.objects.map(obj => obj.id);

    if (isAdmin) {
      // Для админа считаем непрочитанные сообщения от заказчиков
      const unreadMessages = await prisma.message.count({
        where: {
          objectId: { in: objectIds },
          isAdminMessage: false, // Сообщения от заказчиков
          isReadByAdmin: false
        }
      });

      // Комментарии от заказчиков к фото
      const unreadComments = await prisma.photoComment.count({
        where: {
          photo: {
            objectId: { in: objectIds }
          },
          isAdminComment: false, // Комментарии от заказчиков
          isReadByAdmin: false
        }
      });

      return NextResponse.json({
        success: true,
        unreadMessages,
        unreadComments,
        total: unreadMessages + unreadComments
      });
    } else {
      // Для заказчика считаем непрочитанные сообщения от админа
      const unreadMessages = await prisma.message.count({
        where: {
          objectId: { in: objectIds },
          isAdminMessage: true, // Сообщения от админа
          isReadByCustomer: false
        }
      });

      // Комментарии от админа к фото
      const unreadComments = await prisma.photoComment.count({
        where: {
          photo: {
            objectId: { in: objectIds }
          },
          isAdminComment: true, // Комментарии от админа
          isReadByCustomer: false
        }
      });

      return NextResponse.json({
        success: true,
        unreadMessages,
        unreadComments,
        total: unreadMessages + unreadComments
      });
    }
  } catch (error) {
    console.error("Ошибка получения непрочитанных уведомлений:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}



