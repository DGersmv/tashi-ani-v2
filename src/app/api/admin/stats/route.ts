import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/userManagement";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Токен авторизации не предоставлен" },
        { status: 401 }
      );
    }

    const adminData = verifyToken(authHeader.substring(7));
    if (!adminData || (adminData.role !== "ADMIN" && adminData.role !== "MASTER")) {
      return NextResponse.json(
        { success: false, message: "Недостаточно прав" },
        { status: 403 }
      );
    }

    const [activeCount, completedCount] = await Promise.all([
      prisma.project.count({
        where: { status: { not: "COMPLETED" } },
      }),
      prisma.project.count({
        where: { status: "COMPLETED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      activeProjectsCount: activeCount,
      completedProjectsCount: completedCount,
    });
  } catch (error) {
    console.error("Ошибка загрузки статистики:", error);
    return NextResponse.json(
      { success: false, message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
