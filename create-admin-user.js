// Пытаемся загрузить переменные окружения из .env.local (если dotenv установлен)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv не установлен, используем значения по умолчанию или переменные окружения системы
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Получаем данные из переменных окружения или используем значения по умолчанию
    const email = process.env.MASTER_ADMIN_EMAIL || '2277277@bk.ru';
    const password = process.env.MASTER_ADMIN_PASSWORD || 'admin123';
    
    console.log('🔐 Создание/обновление админа...');
    console.log(`Email: ${email}`);
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      // Обновляем пароль существующего пользователя
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'MASTER',
          status: 'ACTIVE'
        }
      });
      console.log('✅ Пароль админа обновлен!');
    } else {
      // Создаем нового админа
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'MASTER',
          status: 'ACTIVE',
          name: 'Мастер Админ'
        }
      });
      console.log('✅ Админ создан!');
    }
    
    console.log('');
    console.log('📋 Данные для входа:');
    console.log(`   Email: ${email}`);
    console.log(`   Пароль: ${password}`);
    console.log('');
    console.log('✅ Готово! Теперь вы можете войти в систему.');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

