import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/userManagement";

// GET - получить комментарии к фото
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json({ success: false, message: "ID фото обязателен" }, { status: 400 });
    }

    const comments = await prisma.photoComment.findMany({
      where: { photoId: parseInt(photoId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ success: true, comments });

  } catch (error) {
    console.error("Ошибка получения комментариев к фото:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// POST - добавить комментарий к фото
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, message: "Требуется авторизация" }, { status: 401 });
    }

    const decodedToken = verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json({ success: false, message: "Неверный токен" }, { status: 401 });
    }

    const { photoId, content } = await request.json();

    if (!photoId || !content?.trim()) {
      return NextResponse.json({ success: false, message: "ID фото и содержание комментария обязательны" }, { status: 400 });
    }

    // Проверяем, что фото существует
    const photo = await prisma.photo.findUnique({
      where: { id: parseInt(photoId) }
    });

    if (!photo) {
      return NextResponse.json({ success: false, message: "Фото не найдено" }, { status: 404 });
    }

    // Создаем комментарий
    const comment = await prisma.photoComment.create({
      data: {
        photoId: parseInt(photoId),
        userId: decodedToken.userId,
        content: content.trim(),
        isAdminComment: decodedToken.role === 'MASTER'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, comment });

  } catch (error) {
    console.error("Ошибка создания комментария к фото:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}