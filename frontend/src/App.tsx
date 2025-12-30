import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import AdminPage from './pages/AdminPage';
import TeamPage from './pages/TeamPage';
import BeamerPage from './pages/BeamerPage';
import MenuPage from './pages/MenuPage';
import QuestionEditorPage from './pages/QuestionEditorPage';
import ModeratorPage from './pages/ModeratorPage';
import IntroSlidesPage from './pages/IntroSlidesPage';
import StatsPage from './pages/StatsPage';
import DraftImportPage from './pages/DraftImportPage';
import BaukastenNeuPage from './pages/BaukastenNeuPage';
import BingoPrintPage from './pages/BingoPrintPage';
import Cozy60BuilderPage from './pages/Cozy60BuilderPage';

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
          <p>{this.state.error.message}</p>
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

function AppDebugBadge() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get('debug') === '1');
  }, []);
  if (!enabled) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        padding: '6px 10px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.25)',
        background: 'rgba(0,0,0,0.5)',
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: 700,
        zIndex: 9998
      }}
    >
      APP DEBUG · {typeof window !== 'undefined' ? window.location.pathname : ''}
    </div>
  );
}

// Zentrales Routing auf die getrennten Bereiche
function App() {
  return (
    <AppErrorBoundary>
      <GlobalErrorOverlay />
      <AppDebugBadge />
      <Routes>
      <Route path="/" element={<Navigate to="/team" replace />} />
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
      <Route path="/baukasten_neu" element={<BaukastenNeuPage />} />
      <Route path="/creator-app" element={<Navigate to="/baukasten_neu" replace />} />
      <Route path="/question-editor" element={<QuestionEditorPage />} />
      <Route path="/moderator" element={<ModeratorPage />} />
      <Route path="/intro" element={<IntroSlidesPage />} />
      <Route path="/bingo" element={<BingoPrintPage />} />
      <Route path="/cozy60-builder" element={<Cozy60BuilderPage />} />
      <Route path="/presentation-creator" element={<Navigate to="/baukasten_neu" replace />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/draft-import" element={<DraftImportPage />} />
      <Route path="*" element={<Navigate to="/team" replace />} />
      </Routes>
    </AppErrorBoundary>
  );
}

export default App;
