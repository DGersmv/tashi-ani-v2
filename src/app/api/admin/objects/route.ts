import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/userManagement';

// Проверка авторизации админа
async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const adminData = verifyToken(token);
  
  if (!adminData || (adminData.role !== 'ADMIN' && adminData.role !== 'MASTER')) {
    return null;
  }
  
  return adminData;
}

// GET - получить объекты заказчика
export async function GET(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Неавторизованный доступ" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: "ID пользователя обязателен" }, { status: 400 });
    }

    const objects = await prisma.object.findMany({
      where: { userId: parseInt(userId) },
      include: {
        projects: true,
        photos: true,
        documents: true,
        messages: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Преобразуем объекты для подсчета статистики
    const objectsWithStats = objects.map(obj => ({
      ...obj,
      projectsCount: obj.projects.length,
      photosCount: obj.photos.length,
      documentsCount: obj.documents.length,
      messagesCount: obj.messages.length,
    }));

    return NextResponse.json({ success: true, objects: objectsWithStats });
  } catch (error) {
    console.error("Ошибка загрузки объектов:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// POST - создать новый объект
export async function POST(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Неавторизованный доступ" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, description, address } = body;

    if (!userId || !title) {
      return NextResponse.json({ success: false, message: "ID пользователя и название объекта обязательны" }, { status: 400 });
    }

    const object = await prisma.object.create({
      data: {
        userId: parseInt(userId),
        title,
        description: description || null,
        address: address || null,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({ success: true, object });
  } catch (error) {
    console.error("Ошибка создания объекта:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

// DELETE - удалить объект
export async function DELETE(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Неавторизованный доступ" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID объекта обязателен" }, { status: 400 });
    }

    await prisma.object.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true, message: "Объект успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления объекта:", error);
    return NextResponse.json({ success: false, message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
