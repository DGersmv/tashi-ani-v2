import { prisma } from '@/lib/prisma';
import { sendPushNotification } from './fcm';

/**
 * Сервис для создания и отправки уведомлений пользователям
 */
export class NotificationService {
  
  /**
   * Отправить уведомление о новом комментарии к фото
   */
  static async notifyPhotoComment(
    photoId: number,
    objectId: number,
    commentAuthorId: number,
    commentAuthorName: string,
    objectTitle: string
  ): Promise<void> {
    try {
      // Получаем фото с информацией о владельце объекта
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          object: {
            include: {
              user: true
            }
          }
        }
      });

      if (!photo) return;

      // Не отправляем уведомление автору комментария
      const objectOwnerId = photo.object.user.id;
      if (objectOwnerId === commentAuthorId) return;

      const isAdminComment = await this.isUserAdmin(commentAuthorId);
      
      // Создаем уведомление в БД
      const notification = await prisma.notification.create({
        data: {
          userId: objectOwnerId,
          type: 'PHOTO_COMMENT',
          title: 'Новый комментарий к фото',
          message: isAdminComment 
            ? `Администратор оставил комментарий к фото в объекте "${objectTitle}"`
            : `Заказчик ${commentAuthorName} оставил комментарий к фото`,
          objectId,
          photoId,
        }
      });

      // Отправляем push-уведомление
      const user = await prisma.user.findUnique({
        where: { id: objectOwnerId },
        select: { fcmToken: true }
      });

      if (user?.fcmToken) {
        await sendPushNotification(user.fcmToken, {
          title: notification.title,
          body: notification.message,
          data: {
            type: 'PHOTO_COMMENT',
            objectId: objectId.toString(),
            photoId: photoId.toString(),
            notificationId: notification.id.toString(),
          }
        });
      }
    } catch (error) {
      console.error('Ошибка при отправке уведомления о комментарии:', error);
    }
  }

  /**
   * Отправить уведомление о новом сообщении
   */
  static async notifyNewMessage(
    objectId: number,
    messageAuthorId: number,
    messageAuthorName: string,
    objectTitle: string,
    recipientId: number
  ): Promise<void> {
    try {
      // Не отправляем уведомление себе
      if (recipientId === messageAuthorId) return;

      const isAdmin = await this.isUserAdmin(messageAuthorId);

      const notification = await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'MESSAGE',
          title: 'Новое сообщение',
          message: isAdmin
            ? `Администратор отправил сообщение по объекту "${objectTitle}"`
            : `Заказчик ${messageAuthorName} отправил сообщение`,
          objectId,
        }
      });

      // Отправляем push-уведомление
      const user = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { fcmToken: true }
      });

      if (user?.fcmToken) {
        await sendPushNotification(user.fcmToken, {
          title: notification.title,
          body: notification.message,
          data: {
            type: 'MESSAGE',
            objectId: objectId.toString(),
            notificationId: notification.id.toString(),
          }
        });
      }
    } catch (error) {
      console.error('Ошибка при отправке уведомления о сообщении:', error);
    }
  }

  /**
   * Отправить уведомление о загруженном документе
   */
  static async notifyDocumentUploaded(
    objectId: number,
    documentId: number,
    uploaderId: number,
    objectTitle: string
  ): Promise<void> {
    try {
      const object = await prisma.object.findUnique({
        where: { id: objectId },
        include: { user: true }
      });

      if (!object) return;

      // Отправляем только заказчику (владельцу объекта)
      const customerId = object.user.id;
      if (customerId === uploaderId) return;

      const notification = await prisma.notification.create({
        data: {
          userId: customerId,
          type: 'DOCUMENT_UPLOADED',
          title: 'Новый документ',
          message: `Добавлен новый документ к объекту "${objectTitle}"`,
          objectId,
          documentId,
        }
      });

      // Отправляем push-уведомление
      const user = await prisma.user.findUnique({
        where: { id: customerId },
        select: { fcmToken: true }
      });

      if (user?.fcmToken) {
        await sendPushNotification(user.fcmToken, {
          title: notification.title,
          body: notification.message,
          data: {
            type: 'DOCUMENT_UPLOADED',
            objectId: objectId.toString(),
            documentId: documentId.toString(),
            notificationId: notification.id.toString(),
          }
        });
      }
    } catch (error) {
      console.error('Ошибка при отправке уведомления о документе:', error);
    }
  }

  /**
   * Отправить уведомление о созданном проекте
   */
  static async notifyProjectCreated(
    objectId: number,
    projectId: number,
    creatorId: number,
    projectTitle: string,
    objectTitle: string
  ): Promise<void> {
    try {
      const object = await prisma.object.findUnique({
        where: { id: objectId },
        include: { user: true }
      });

      if (!object) return;

      const customerId = object.user.id;
      if (customerId === creatorId) return;

      const notification = await prisma.notification.create({
        data: {
          userId: customerId,
          type: 'PROJECT_CREATED',
          title: 'Новый проект',
          message: `Создан новый проект "${projectTitle}" для объекта "${objectTitle}"`,
          objectId,
          projectId,
        }
      });

      // Отправляем push-уведомление
      const user = await prisma.user.findUnique({
        where: { id: customerId },
        select: { fcmToken: true }
      });

      if (user?.fcmToken) {
        await sendPushNotification(user.fcmToken, {
          title: notification.title,
          body: notification.message,
          data: {
            type: 'PROJECT_CREATED',
            objectId: objectId.toString(),
            projectId: projectId.toString(),
            notificationId: notification.id.toString(),
          }
        });
      }
    } catch (error) {
      console.error('Ошибка при отправке уведомления о проекте:', error);
    }
  }

  /**
   * Проверить, является ли пользователь админом
   */
  private static async isUserAdmin(userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    return user?.role === 'MASTER';
  }
}
