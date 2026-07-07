const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

const API_KEY_STORAGE_KEY = 'mailhub_api_key';

const listeners = new Set<() => void>();

function notifyApiKeyChanged() {
  for (const listener of listeners) listener();
}

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
  notifyApiKeyChanged();
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  notifyApiKeyChanged();
}

// Subscribe to API key changes from this tab (setApiKey/clearApiKey) and
// other tabs (storage events). Returns an unsubscribe function.
export function subscribeApiKey(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === 'string' ? data.error : fallback;
  } catch {
    return fallback;
  }
}

// All endpoints respond with {success: true, data} or {success: false, error}.
interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function authenticate(path: '/api/v1/auth/login' | '/api/v1/auth/register', email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, 'Authentication failed'));
  }

  const body = (await res.json()) as Envelope<{ apiKey?: string }>;
  if (!body.success || !body.data?.apiKey) {
    throw new Error('Invalid response from server');
  }
  return body.data.apiKey;
}

export function login(email: string, password: string): Promise<string> {
  return authenticate('/api/v1/auth/login', email, password);
}

export function register(email: string, password: string): Promise<string> {
  return authenticate('/api/v1/auth/register', email, password);
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    clearApiKey();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    throw new Error(await parseError(res, 'Request failed'));
  }

  if (res.status === 204) return undefined as T;

  const body = (await res.json()) as Envelope<T>;
  if (!body.success || body.data === undefined) {
    throw new Error(body.error ?? 'Invalid response from server');
  }
  return body.data;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResponse {
  id: string;
  status: string;
  provider_message_id: string;
}

export function sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  return api<SendEmailResponse>('/api/v1/emails', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
