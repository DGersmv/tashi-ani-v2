import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, message: "Email обязателен" }, { status: 400 });
    }

    // Найти пользователя с объектами
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        objects: {
          include: {
            projects: true,
            messages: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Пользователь не найден" }, { status: 404 });
    }

    // Подсчитать статистику
    const allProjects = user.objects.flatMap(obj => obj.projects);
    const allMessages = user.objects.flatMap(obj => obj.messages);
    
    const stats = {
      objectsCount: user.objects.length,
      projectsCount: allProjects.length,
      messagesCount: allMessages.length,
      completedProjectsCount: allProjects.filter(p => p.status === 'COMPLETED').length,
      activeProjectsCount: allProjects.filter(p => p.status === 'IN_PROGRESS').length
    };

    return NextResponse.json({ 
      success: true, 
      stats,
      userName: user.name || user.email
    });

  } catch (error) {
    console.error('Ошибка загрузки статистики пользователя:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Внутренняя ошибка сервера" 
    }, { status: 500 });
  }
}
