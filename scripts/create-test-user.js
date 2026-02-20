#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const testEmail = 'test@example.com';
  const testPassword = 'Test@1234';

  try {
    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (existingUser) {
      console.log('✓ Тестовый пользователь уже существует:', testEmail);
      console.log('  Пароль: ' + testPassword);
      return;
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE'
      }
    });

    console.log('✓ Тестовый пользователь успешно создан!');
    console.log('  Email:', user.email);
    console.log('  Пароль:', testPassword);
    console.log('\n  Используйте эти данные для входа в кабинет');
  } catch (error) {
    console.error('✗ Ошибка при создании пользователя:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
