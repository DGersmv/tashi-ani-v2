import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/userManagement";

// GET - получить комментарии к панораме
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const panoramaId = searchParams.get("panoramaId");

    if (!panoramaId) {
      return NextResponse.json({ success: false, message: "ID панорамы обязателен" }, { status: 400 });
    }

    const comments = await prisma.panoramaComment.findMany({
      where: { panoramaId: parseInt(panoramaId, 10) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error("Ошибка получения комментариев к панораме:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// POST - добавить комментарий к панораме
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ success: false, message: "Требуется авторизация" }, { status: 401 });
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json({ success: false, message: "Неверный токен" }, { status: 401 });
    }

    const { panoramaId, content, yaw, pitch } = await request.json();

    if (!panoramaId || !content?.trim()) {
      return NextResponse.json({ success: false, message: "ID панорамы и содержание комментария обязательны" }, { status: 400 });
    }

    const yawIsNumber = typeof yaw === "number" && Number.isFinite(yaw);
    const pitchIsNumber = typeof pitch === "number" && Number.isFinite(pitch);
    const coordinatesProvided = yaw !== undefined || pitch !== undefined;

    if (coordinatesProvided && (!yawIsNumber || !pitchIsNumber)) {
      return NextResponse.json(
        { success: false, message: "Координаты комментария, если переданы, должны быть числами" },
        { status: 400 }
      );
    }

    const panorama = await prisma.panorama.findUnique({
      where: { id: parseInt(panoramaId, 10) },
    });

    if (!panorama) {
      return NextResponse.json({ success: false, message: "Панорама не найдена" }, { status: 404 });
    }

    const comment = await prisma.panoramaComment.create({
      data: {
        panoramaId: parseInt(panoramaId, 10),
        userId: decodedToken.userId,
        content: content.trim(),
        yaw: yawIsNumber ? yaw : null,
        pitch: pitchIsNumber ? pitch : null,
        isAdminComment: decodedToken.role === "MASTER" || decodedToken.role === "ADMIN",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("Ошибка создания комментария к панораме:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// DELETE - удалить комментарий к панораме
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ success: false, message: "Требуется авторизация" }, { status: 401 });
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken || (decodedToken.role !== "MASTER" && decodedToken.role !== "ADMIN")) {
      return NextResponse.json({ success: false, message: "Недостаточно прав" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const commentIdParam = searchParams.get("commentId");

    if (!commentIdParam) {
      return NextResponse.json({ success: false, message: "ID комментария обязателен" }, { status: 400 });
    }

    const commentId = parseInt(commentIdParam, 10);

    if (Number.isNaN(commentId)) {
      return NextResponse.json({ success: false, message: "Некорректный ID комментария" }, { status: 400 });
    }

    const existingComment = await prisma.panoramaComment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json({ success: false, message: "Комментарий не найден" }, { status: 404 });
    }

    await prisma.panoramaComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true, deletedCommentId: commentId });
  } catch (error) {
    console.error("Ошибка удаления комментария к панораме:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

