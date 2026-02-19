import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, Suspense } from 'react';

// Eager load: Fast paths
import LandingPage from './pages/LandingPage';
import TeamPage from './pages/TeamPage';
import BeamerPage from './pages/BeamerPage';

// Lazy load: Heavy pages
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const MenuPage = React.lazy(() => import('./pages/MenuPage'));
const QuestionEditorPage = React.lazy(() => import('./pages/QuestionEditorPage'));
const ModeratorPage = React.lazy(() => import('./pages/ModeratorPage'));
const IntroSlidesPage = React.lazy(() => import('./pages/IntroSlidesPage'));
const StatsPage = React.lazy(() => import('./pages/StatsPage'));
// ...existing code...
// ...existing code...
// ...existing code...
const QuestionCatalogPage = React.lazy(() => import('./pages/QuestionCatalogPage'));
const CreatorCanvasPage = React.lazy(() => import('./pages/CreatorCanvasPage'));

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };

  componentDidCatch(error: Error) {
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b0d14', color: '#e2e8f0', padding: 24 }}>
          <h2>Unerwarteter Fehler</h2>
          <p>{String(this.state.error)}</p>
          <button
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: '#e2e8f0',
              cursor: 'pointer'
            }}
            onClick={() => window.location.reload()}
          >
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GlobalErrorOverlay() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onError = (event: ErrorEvent) => {
      const message = event?.error?.message || event.message || 'Unbekannter Fehler';
      setError(message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const message = reason instanceof Error ? reason.message : String(reason || 'Unbekannte Exception');
      setError(message);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!error) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3,7,18,0.92)',
        color: '#e2e8f0',
        zIndex: 9999,
        padding: 24,
        overflow: 'auto'
      }}
    >
      <h2>Fehler im Client</h2>
      <p>{error}</p>
      <button
        style={{
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.08)',
          color: '#e2e8f0',
          cursor: 'pointer'
        }}
        onClick={() => window.location.reload()}
      >
        Neu laden
      </button>
    </div>
  );
}

// Zentrales Routing auf die getrennten Bereiche
function App() {
  return (
    <AppErrorBoundary>
      <GlobalErrorOverlay />
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0b0d14' }} />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/beamer" element={<BeamerPage />} />
          <Route path="/beamer/:roomCode" element={<BeamerPage />} />
          <Route path="/creator" element={<Navigate to="/baukasten_neu" replace />} />
          <Route path="/creator-v2" element={<Navigate to="/baukasten_neu" replace />} />
          <Route path="/creator-wizard" element={<Navigate to="/baukasten_neu" replace />} />
          <Route path="/creator-canvas" element={<Navigate to="/baukasten_neu" replace />} />
          <Route path="/baukasten" element={<Navigate to="/baukasten_neu" replace />} />
          <Route path="/baukasten_neu" element={<CreatorCanvasPage />} />
          <Route path="/kanban-builder" element={<Navigate to="/baukasten_neu" replace />} />
// ...existing code...
          <Route path="/creator-app" element={<Navigate to="/baukasten_neu" replace />} />
          <Route path="/question-editor" element={<QuestionEditorPage />} />
          <Route path="/moderator" element={<ModeratorPage />} />
          <Route path="/intro" element={<IntroSlidesPage />} />
          <Route path="/question-catalog" element={<QuestionCatalogPage />} />
// ...existing code...
          <Route path="/presentation-creator" element={<Navigate to="/baukasten_neu" replace />} />
          <Route path="/stats" element={<StatsPage />} />
// ...existing code...
          <Route path="*" element={<Navigate to="/team" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}

export default App;
