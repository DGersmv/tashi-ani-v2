import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/userManagement";

// PATCH /api/admin/objects/[id]/folders/[folderId] - обновить папку
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    const folderId = parseInt(resolvedParams.folderId);
    
    if (isNaN(objectId) || isNaN(folderId)) {
      return NextResponse.json(
        { success: false, message: "Неверные параметры" },
        { status: 400 }
      );
    }

    // Проверка авторизации админа
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Не авторизован" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const adminData = verifyToken(token);

    if (!adminData || (adminData.role !== "ADMIN" && adminData.role !== "MASTER")) {
      return NextResponse.json(
        { success: false, message: "Доступ запрещен" },
        { status: 403 }
      );
    }

    // Проверяем существование папки
    const folder = await prisma.photoFolder.findFirst({
      where: {
        id: folderId,
        objectId
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, message: "Папка не найдена" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, orderIndex } = body;

    const updateData: any = {};
    if (name && typeof name === "string" && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (typeof orderIndex === "number") {
      updateData.orderIndex = orderIndex;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "Нет данных для обновления" },
        { status: 400 }
      );
    }

    // Обновляем папку
    const updatedFolder = await prisma.photoFolder.update({
      where: { id: folderId },
      data: updateData,
      include: {
        _count: {
          select: { photos: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      folder: {
        id: updatedFolder.id,
        name: updatedFolder.name,
        orderIndex: updatedFolder.orderIndex,
        photoCount: updatedFolder._count.photos,
        createdAt: updatedFolder.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error("Ошибка обновления папки:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/objects/[id]/folders/[folderId] - удалить папку
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    const folderId = parseInt(resolvedParams.folderId);
    
    if (isNaN(objectId) || isNaN(folderId)) {
      return NextResponse.json(
        { success: false, message: "Неверные параметры" },
        { status: 400 }
      );
    }

    // Проверка авторизации админа
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Не авторизован" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const adminData = verifyToken(token);

    if (!adminData || (adminData.role !== "ADMIN" && adminData.role !== "MASTER")) {
      return NextResponse.json(
        { success: false, message: "Доступ запрещен" },
        { status: 403 }
      );
    }

    // Проверяем существование папки
    const folder = await prisma.photoFolder.findFirst({
      where: {
        id: folderId,
        objectId
      },
      include: {
        _count: {
          select: { photos: true }
        }
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, message: "Папка не найдена" },
        { status: 404 }
      );
    }

    // При удалении папки, фото остаются но folderId становится null
    // (благодаря onDelete: SetNull в схеме)
    await prisma.photoFolder.delete({
      where: { id: folderId }
    });

    return NextResponse.json({
      success: true,
      message: `Папка "${folder.name}" удалена. Фото (${folder._count.photos}) остались в объекте.`
    });

  } catch (error) {
    console.error("Ошибка удаления папки:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

