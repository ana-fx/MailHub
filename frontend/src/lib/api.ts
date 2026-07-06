const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mailhub_api_key');
}

export function setApiKey(key: string) {
  localStorage.setItem('mailhub_api_key', key);
}

export function clearApiKey() {
  localStorage.removeItem('mailhub_api_key');
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
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
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
