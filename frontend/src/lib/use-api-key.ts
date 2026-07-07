'use client';

import { useSyncExternalStore } from 'react';

import { getApiKey, subscribeApiKey } from '@/lib/api';

// Reactive view of the stored API key. Returns null during server
// rendering and whenever the user is logged out.
export function useApiKey(): string | null {
  return useSyncExternalStore(subscribeApiKey, getApiKey, () => null);
}
