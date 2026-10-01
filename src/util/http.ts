export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class AuthError extends HttpError {
  constructor(service: string, status: number) {
    super(`${service} rejected the credentials (HTTP ${status}). Check the email and API token.`, status);
    this.name = 'AuthError';
  }
}

export interface RequestOptions {
  fetchImpl?: typeof fetch;
  retries?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Retries on 429 and 5xx (honouring Retry-After) and on network errors. 401/403 throw AuthError.
export async function requestJson<T>(
  service: string,
  url: string,
  init: RequestInit,
  opts: RequestOptions = {},
): Promise<T> {
  const f = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 3;
  const sleep = opts.sleep ?? defaultSleep;
  const base = opts.baseDelayMs ?? 500;
  let lastError: Error = new Error('request failed');

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await f(url, { ...init, signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000) });
      if (res.status === 401 || res.status === 403) throw new AuthError(service, res.status);
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        lastError = new HttpError(`${service} returned HTTP ${res.status}`, res.status);
        if (attempt < retries) {
          await sleep(retryAfter > 0 ? retryAfter * 1000 : base * 2 ** attempt);
          continue;
        }
        throw lastError;
      }
      if (!res.ok) {
        const body = (await res.text()).slice(0, 200);
        throw new HttpError(`${service} returned HTTP ${res.status}: ${body}`, res.status);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      if (err instanceof HttpError && err.status < 500 && err.status !== 429) throw err;
      lastError = err as Error;
      if (attempt >= retries) break;
      await sleep(base * 2 ** attempt);
    }
  }
  throw lastError;
}

export const basicAuth = (email: string, token: string): string =>
  `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
