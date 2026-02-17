/**
 * Сервис для отправки push-уведомлений через Firebase Cloud Messaging
 * 
 * Для работы необходимо:
 * 1. Создать проект в Firebase Console
 * 2. Скачать serviceAccountKey.json
 * 3. Установить firebase-admin: npm install firebase-admin
 * 4. Инициализировать Firebase Admin SDK
 */

// Пока используем заглушку - в продакшене нужно раскомментировать
// import admin from 'firebase-admin';

// Инициализация Firebase Admin (раскомментировать после настройки)
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: process.env.FIREBASE_PROJECT_ID,
//       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//       privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//     }),
//   });
// }

interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    type?: string;
    objectId?: string;
    photoId?: string;
    projectId?: string;
    documentId?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Отправить push-уведомление на устройство
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    // Заглушка - логируем в консоль
    console.log('[FCM] Отправка уведомления:', {
      token: fcmToken.substring(0, 20) + '...',
      title: payload.title,
      body: payload.body,
      data: payload.data
    });

    // Реальный код (раскомментировать после настройки Firebase):
    // await admin.messaging().send({
    //   token: fcmToken,
    //   notification: {
    //     title: payload.title,
    //     body: payload.body,
    //   },
    //   data: payload.data || {},
    //   android: {
    //     priority: 'high',
    //     notification: {
    //       channelId: 'taonline_notifications',
    //       priority: 'high',
    //       defaultSound: true,
    //       defaultVibrateTimings: true,
    //     },
    //   },
    // });

    return true;
  } catch (error) {
    console.error('[FCM] Ошибка отправки уведомления:', error);
    return false;
  }
}

/**
 * Отправить уведомление нескольким устройствам
 */
export async function sendMulticastNotification(
  fcmTokens: string[],
  payload: NotificationPayload
): Promise<{ successCount: number; failureCount: number }> {
  try {
    console.log('[FCM] Массовая отправка уведомлений:', {
      tokensCount: fcmTokens.length,
      title: payload.title,
      body: payload.body
    });

    // Реальный код (раскомментировать после настройки Firebase):
    // const response = await admin.messaging().sendEachForMulticast({
    //   tokens: fcmTokens,
    //   notification: {
    //     title: payload.title,
    //     body: payload.body,
    //   },
    //   data: payload.data || {},
    // });
    // 
    // return {
    //   successCount: response.successCount,
    //   failureCount: response.failureCount,
    // };

    return { successCount: fcmTokens.length, failureCount: 0 };
  } catch (error) {
    console.error('[FCM] Ошибка массовой отправки:', error);
    return { successCount: 0, failureCount: fcmTokens.length };
  }
}
