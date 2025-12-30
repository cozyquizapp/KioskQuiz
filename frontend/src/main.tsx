import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import './main.css';

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
