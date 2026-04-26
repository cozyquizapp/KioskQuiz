/// <reference types="vite-plugin-pwa/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './main.css';

import * as Sentry from '@sentry/react';

// ── Service Worker mit Auto-Update + Polling ─────────────────────────────────
// Problem zuvor: Workbox cachte JS/CSS-Bundles aggressiv. Selbst Hard-Reload
// hat den Service-Worker-Cache nicht invalidiert; User mussten manuell
// „Clear site data" klicken, was im Live-Quiz unzumutbar ist.
//
// Fix: registerSW mit:
//   1. onNeedRefresh — sobald ein neuer SW bereit ist → sofort updateSW(true)
//      → neuer SW übernimmt (skipWaiting + clientsClaim sind im SW gesetzt)
//      → Page-Reload mit frischen Bundles.
//   2. Periodisches registration.update() (alle 60 s) und beim Tab-Fokus,
//      damit langlebige Beamer-/Moderator-Tabs neue Builds zeitnah bemerken.
//
// State-Loss beim Reload ist OK — Server hält Quiz-State, useQQSocket
// reconnected automatisch.
if (typeof window !== 'undefined') {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      window.setInterval(() => {
        registration.update().catch(() => {/* offline ist ok */});
      }, 60_000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
    },
  });
}
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});

const ensureGlobalErrorOverlay = () => {
  if (typeof window === 'undefined') return;
  const id = 'cozy-global-error';
  const ensureEl = () => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.background = 'rgba(3,7,18,0.92)';
      el.style.color = '#e2e8f0';
      el.style.zIndex = '9999';
      el.style.padding = '24px';
      el.style.font = '600 14px/1.5 Manrope, Segoe UI, system-ui';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    return el;
  };
  const show = (msg: string) => {
    const el = ensureEl();
    el.textContent = `Client error: ${msg}`;
    el.style.display = 'block';
  };
  window.addEventListener('error', (event) => {
    const message = event?.error?.message || event.message || 'unknown';
    show(message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const message = reason instanceof Error ? reason.message : String(reason || 'unknown');
    show(message);
  });
};

ensureGlobalErrorOverlay();

const router = createBrowserRouter(
  [{ path: '/*', element: <App /> }],
  {
    future: {
      v7_relativeSplatPath: true
    }
  }
);

const rootEl = document.getElementById('root');
if (rootEl) {
  rootEl.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:#e2e8f0;font:600 16px/1.4 Manrope,Segoe UI,system-ui;">Loading Cozy Quiz...</div>';
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
} else {
  // eslint-disable-next-line no-console
  console.error('[Cozy] root element missing');
}
