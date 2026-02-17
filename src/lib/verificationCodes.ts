// Общее хранилище кодов верификации с файловой персистентностью
import fs from 'fs';
import path from 'path';

const CODES_FILE = path.join(process.cwd(), '.verification-codes.json');

interface CodeData {
  code: string;
  expires: number;
}

interface CodesStorage {
  [email: string]: CodeData;
}

// Функция для чтения кодов из файла
function readCodes(): CodesStorage {
  try {
    if (fs.existsSync(CODES_FILE)) {
      const data = fs.readFileSync(CODES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Ошибка чтения файла кодов:', error);
  }
  return {};
}

// Функция для записи кодов в файл
function writeCodes(codes: CodesStorage): void {
  try {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
  } catch (error) {
    console.error('Ошибка записи файла кодов:', error);
  }
}

// Очистка просроченных кодов
function cleanExpiredCodes(codes: CodesStorage): CodesStorage {
  const now = Date.now();
  const cleaned: CodesStorage = {};
  
  for (const [email, data] of Object.entries(codes)) {
    if (data.expires > now) {
      cleaned[email] = data;
    }
  }
  
  return cleaned;
}

export function saveCode(email: string, code: string, expiresInMinutes: number = 5) {
  const codes = readCodes();
  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  
  codes[email] = { code, expires };
  writeCodes(codes);
  
  console.log(`💾 Сохранили код для ${email}: ${code}, истекает: ${new Date(expires).toLocaleTimeString()}`);
}

export function verifyCode(email: string, code: string): { success: boolean; error?: string } {
  const codes = readCodes();
  const savedData = codes[email];
  
  if (!savedData) {
    return { success: false, error: "Код не найден или истек" };
  }
  
  const currentTime = Date.now();
  
  if (currentTime > savedData.expires) {
    delete codes[email];
    writeCodes(codes);
    return { success: false, error: "Код истек" };
  }
  
  if (savedData.code !== code) {
    return { success: false, error: "Неверный код" };
  }
  
  // Код верный, удаляем его
  console.log(`✅ Успешная аутентификация для ${email}`);
  delete codes[email];
  writeCodes(codes);
  return { success: true };
}

export function getCode(email: string): string | null {
  const codes = readCodes();
  const savedData = codes[email];
  
  if (!savedData) return null;
  
  if (Date.now() > savedData.expires) {
    delete codes[email];
    writeCodes(codes);
    return null;
  }
  
  return savedData.code;
}

// Функция для очистки всех просроченных кодов (можно вызывать периодически)
export function cleanupExpiredCodes(): void {
  const codes = readCodes();
  const cleaned = cleanExpiredCodes(codes);
  
  if (Object.keys(codes).length !== Object.keys(cleaned).length) {
    writeCodes(cleaned);
    console.log(`🧹 Очистили ${Object.keys(codes).length - Object.keys(cleaned).length} просроченных кодов`);
  }
}