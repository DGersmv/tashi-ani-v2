/**
 * Security utilities for validating and sanitizing user input
 */
import path from 'path';

/**
 * Validates and sanitizes a filename to prevent path traversal attacks
 * @param filename - The filename to validate
 * @returns Sanitized filename or null if invalid
 */
export function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Remove any path traversal attempts
  const sanitized = filename
    .replace(/\.\./g, '') // Remove ..
    .replace(/\/+/g, '') // Remove slashes
    .replace(/\\+/g, '') // Remove backslashes
    .trim();

  // Check for empty result
  if (!sanitized || sanitized.length === 0) {
    return null;
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /^\./, // Hidden files
    /[\x00-\x1f\x7f-\x9f]/, // Control characters
    /[<>:"|?*]/, // Windows forbidden characters
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return null;
    }
  }

  // Limit filename length
  if (sanitized.length > 255) {
    return null;
  }

  return sanitized;
}

/**
 * Validates a file path to ensure it's within the allowed directory
 * @param filePath - The full file path
 * @param allowedBaseDir - The base directory that the file must be within
 * @returns true if the path is safe, false otherwise
 */
export function validateFilePath(filePath: string, allowedBaseDir: string): boolean {
  try {
    // Resolve both paths to absolute
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(allowedBaseDir);
    
    // Check if the resolved path starts with the base directory
    if (!resolvedPath.startsWith(resolvedBase)) {
      return false;
    }
    
    // Additional check: ensure no path traversal in the relative path
    const relativePath = path.relative(resolvedBase, resolvedPath);
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating file path:', error);
    return false;
  }
}

/**
 * Logs suspicious activity for security monitoring
 * @param type - Type of suspicious activity
 * @param details - Details about the activity
 * @param request - The request object (optional)
 */
export function logSuspiciousActivity(
  type: string,
  details: Record<string, unknown>,
  request?: Request
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    type,
    details,
    ...(request && {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      url: request.url,
    }),
  };

  console.error('[SECURITY ALERT]', JSON.stringify(logData));
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

/**
 * Validates object ID
 * @param id - ID to validate
 * @returns Parsed ID or null if invalid
 */
export function validateObjectId(id: string | number): number | null {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  if (isNaN(numId) || numId <= 0 || !Number.isInteger(numId)) {
    return null;
  }
  
  return numId;
}



