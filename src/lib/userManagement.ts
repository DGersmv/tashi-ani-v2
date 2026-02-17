import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface UserData {
  id: number
  email: string
  name?: string
  role: 'MASTER' | 'USER'
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: Date
  lastLogin?: Date
}

// Проверка, является ли пользователь мастер-админом
export async function isMasterAdmin(email: string): Promise<boolean> {
  const masterEmail = process.env.MASTER_ADMIN_EMAIL
  return email === masterEmail
}

// Проверка, существует ли пользователь в базе
export async function userExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email }
  })
  return !!user
}

// Создание нового пользователя
export async function createUser(email: string, password: string, name?: string, role: 'USER' | 'MASTER' = 'USER'): Promise<UserData> {
  const hashedPassword = await bcrypt.hash(password, 10)
  
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role,
      status: 'ACTIVE'
    }
  })
  
  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin || undefined
  }
}

// Аутентификация пользователя по email и паролю
export async function authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: UserData; token?: string }> {
  const user = await prisma.user.findUnique({
    where: { email }
  })
  
  if (!user) {
    return { success: false }
  }
  
  // Проверяем пароль
  const isPasswordValid = await bcrypt.compare(password, user.password)
  
  if (!isPasswordValid) {
    return { success: false }
  }
  
  // Проверяем статус пользователя
  if (user.status !== 'ACTIVE') {
    return { success: false }
  }
  
  // Обновить время последнего входа
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  })
  
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || undefined
    },
    token
  }
}

// Аутентификация мастер-админа по паролю (для обратной совместимости)
export async function authenticateMasterAdmin(email: string, password: string): Promise<{ success: boolean; user?: UserData; token?: string }> {
  return await authenticateUser(email, password)
}

// Аутентификация обычного пользователя по коду
export async function authenticateUserWithCode(email: string, code: string): Promise<{ success: boolean; user?: UserData; token?: string }> {
  // Проверить код верификации
  const verificationCode = await prisma.verificationCode.findFirst({
    where: {
      email,
      code,
      expiresAt: { gt: new Date() }
    }
  })
  
  if (!verificationCode) {
    return { success: false }
  }
  
  // Удалить использованный код
  await prisma.verificationCode.delete({
    where: { id: verificationCode.id }
  })
  
  // Найти или создать пользователя
  let user = await prisma.user.findUnique({
    where: { email }
  })
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        role: 'USER',
        status: 'ACTIVE'
      }
    })
  }
  
  // Обновить время последнего входа
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  })
  
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || undefined
    },
    token
  }
}

// Получить всех пользователей (только для мастер-админа)
export async function getAllUsers(): Promise<UserData[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })
  
  return users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin || undefined
  }))
}

// Удалить пользователя (только для мастер-админа)
export async function deleteUser(userId: number): Promise<boolean> {
  try {
    await prisma.user.delete({
      where: { id: userId }
    })
    return true
  } catch (error) {
    console.error('Error deleting user:', error)
    return false
  }
}

// Проверить JWT токен
export function verifyToken(token: string): { userId: number; email: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    return null
  }
}
