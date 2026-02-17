import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documentId = parseInt(id);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        isPaid: true,
        originalName: true,
        documentType: true
      }
    });

    if (!document) {
      return NextResponse.json({ 
        success: false, 
        message: 'Документ не найден' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        isPaid: document.isPaid,
        originalName: document.originalName,
        documentType: document.documentType
      }
    });

  } catch (error) {
    console.error('Ошибка проверки статуса документа:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

