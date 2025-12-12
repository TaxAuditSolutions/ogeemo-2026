'use client';

import { EventEmitter } from 'events';

// Since we are in a Next.js environment which can have both server and client contexts,
// we need to ensure we're using a single instance of EventEmitter on the client-side.
// We attach it to the `window` object to ensure it's a singleton across the client application.

declare global {
  interface Window {
    __errorEmitter: EventEmitter;
  }
}

let errorEmitter: EventEmitter;

if (typeof window !== 'undefined') {
  if (!window.__errorEmitter) {
    window.__errorEmitter = new EventEmitter();
  }
  errorEmitter = window.__errorEmitter;
} else {
  // In a non-browser environment (like SSR), we can just create a new instance.
  // This instance will be isolated and won't conflict.
  errorEmitter = new EventEmitter();
}

export { errorEmitter };
