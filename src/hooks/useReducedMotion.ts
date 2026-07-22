import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const subscribers = new Set<() => void>();
let mediaQuery: MediaQueryList | null = null;

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  mediaQuery ??= window.matchMedia(REDUCED_MOTION_QUERY);
  return mediaQuery;
}

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(subscriber: () => void): () => void {
  const query = getMediaQuery();
  subscribers.add(subscriber);
  if (subscribers.size === 1) query?.addEventListener('change', notifySubscribers);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) query?.removeEventListener('change', notifySubscribers);
  };
}

function getSnapshot(): boolean {
  return getMediaQuery()?.matches ?? false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
