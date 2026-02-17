/**
 * fetch с повторными попытками при обрыве соединения (ERR_HTTP2_PING_FAILED, Failed to fetch).
 * Настроил и забыл — разовые сбои сети/сервера не ломают загрузку.
 */
const DEFAULT_RETRIES = 2;
const DEFAULT_DELAY_MS = 1500;

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { retries?: number; delayMs?: number }
): Promise<Response> {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, init);
      if (attempt < retries && response.status >= 500) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return response;
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}
