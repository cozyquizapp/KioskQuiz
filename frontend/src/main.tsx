import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import './main.css';

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
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

const rootEl = document.getElementById('root');
if (rootEl) {
  rootEl.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:#e2e8f0;font:600 16px/1.4 Manrope,Segoe UI,system-ui;">Loading Cozy Quiz…</div>';
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
} else {
  // eslint-disable-next-line no-console
  console.error('[Cozy] root element missing');
}
