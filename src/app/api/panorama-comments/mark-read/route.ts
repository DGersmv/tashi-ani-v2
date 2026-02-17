import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const isAdmin = searchParams.get("isAdmin") === "true";
    const panoramaId = searchParams.get("panoramaId");

    if (!email) {
      return NextResponse.json({ success: false, message: "Email не предоставлен" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Пользователь не найден" }, { status: 404 });
    }

    const whereCondition: any = {};

    if (panoramaId) {
      whereCondition.panoramaId = parseInt(panoramaId, 10);
    }

    if (isAdmin) {
      whereCondition.isAdminComment = false;

      await prisma.panoramaComment.updateMany({
        where: whereCondition,
        data: { isReadByAdmin: true },
      });
    } else {
      whereCondition.isAdminComment = true;

      await prisma.panoramaComment.updateMany({
        where: whereCondition,
        data: { isReadByCustomer: true },
      });
    }

    return NextResponse.json({ success: true, message: "Комментарии помечены как прочитанные" });
  } catch (error) {
    console.error("Ошибка пометки комментариев панорамы:", error);
    return NextResponse.json({ success: false, message: "Ошибка сервера" }, { status: 500 });
  }
}


