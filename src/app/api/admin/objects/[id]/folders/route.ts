import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/userManagement";

// GET /api/admin/objects/[id]/folders - получить все папки объекта
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    
    if (isNaN(objectId)) {
      return NextResponse.json(
        { success: false, message: "Неверный ID объекта" },
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

    // Получаем все папки объекта с количеством фото
    const folders = await prisma.photoFolder.findMany({
      where: { objectId },
      include: {
        _count: {
          select: { photos: true }
        }
      },
      orderBy: { orderIndex: "asc" }
    });

    return NextResponse.json({
      success: true,
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        orderIndex: f.orderIndex,
        photoCount: f._count.photos,
        createdAt: f.createdAt.toISOString()
      }))
    });

  } catch (error) {
    console.error("Ошибка получения папок:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

// POST /api/admin/objects/[id]/folders - создать новую папку
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const objectId = parseInt(resolvedParams.id);
    
    if (isNaN(objectId)) {
      return NextResponse.json(
        { success: false, message: "Неверный ID объекта" },
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

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Название папки обязательно" },
        { status: 400 }
      );
    }

    // Получаем максимальный orderIndex
    const maxOrder = await prisma.photoFolder.findFirst({
      where: { objectId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true }
    });

    const newOrderIndex = (maxOrder?.orderIndex ?? -1) + 1;

    // Создаем папку
    const folder = await prisma.photoFolder.create({
      data: {
        objectId,
        name: name.trim(),
        orderIndex: newOrderIndex
      },
      include: {
        _count: {
          select: { photos: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        orderIndex: folder.orderIndex,
        photoCount: folder._count.photos,
        createdAt: folder.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error("Ошибка создания папки:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

