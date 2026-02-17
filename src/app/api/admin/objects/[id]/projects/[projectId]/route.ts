import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/userManagement";

const VALID_STATUSES = ["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; projectId: string }> }
) {
  try {
    const { id: objectIdStr, projectId: projectIdStr } = await params;
    const objectId = parseInt(objectIdStr);
    const projectId = parseInt(projectIdStr);

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

    const body = await request.json();
    const status = body?.status;
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Недопустимый статус. Допустимы: PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, objectId },
    });
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Проект не найден" },
        { status: 404 }
      );
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status },
    });

    return NextResponse.json({ success: true, message: "Статус обновлён" });
  } catch (error) {
    console.error("Ошибка обновления статуса проекта:", error);
    return NextResponse.json(
      { success: false, message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
