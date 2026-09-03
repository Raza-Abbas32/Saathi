// Defensive polyfill for environments where window.fetch has only a getter
(function ensureFetchWritable() {
  try {
    if (typeof window !== 'undefined') {
      const origFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : undefined;
      let activeFetch = origFetch;

      if (typeof Window !== 'undefined' && Window.prototype) {
        const protoDesc = Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
        if (protoDesc && !protoDesc.set && protoDesc.configurable) {
          Object.defineProperty(Window.prototype, 'fetch', {
            get() {
              return activeFetch || origFetch;
            },
            set(val) {
              activeFetch = val;
            },
            configurable: true,
            enumerable: true,
          });
        }
      }

      const winDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
      if (!winDesc || (!winDesc.set && !winDesc.writable && winDesc.configurable !== false)) {
        Object.defineProperty(window, 'fetch', {
          get() {
            return activeFetch || origFetch;
          },
          set(val) {
            activeFetch = val;
          },
          configurable: true,
          enumerable: true,
        });
      }
    }
  } catch {
    // ignore
  }
})();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
