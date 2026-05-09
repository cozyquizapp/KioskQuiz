import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, Suspense } from 'react';
import PinGate from './components/PinGate';
import QQErrorBoundary, { installGlobalCrashHandlers } from './components/QQErrorBoundary';

// Eager load: Fast paths
import LandingPage from './pages/LandingPage';

// Lazy load: Heavy pages
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const MenuPage = React.lazy(() => import('./pages/MenuPage'));
const QuestionEditorPage = React.lazy(() => import('./pages/QuestionEditorPage'));
const IntroSlidesPage = React.lazy(() => import('./pages/IntroSlidesPage'));
const StatsPage = React.lazy(() => import('./pages/StatsPage'));
const QuestionCatalogPage = React.lazy(() => import('./pages/QuestionCatalogPage'));
const QrCodePage = React.lazy(() => import('./pages/QrCodePage'));
const QQModeratorPage = React.lazy(() => import('./pages/QQModeratorPage'));
const QQModPortablePage = React.lazy(() => import('./pages/QQModPortablePage'));
const QQBeamerPage    = React.lazy(() => import('./pages/QQBeamerPage'));
const QQTeamPage      = React.lazy(() => import('./pages/QQTeamPage'));
const QQBuilderPage   = React.lazy(() => import('./pages/QQBuilderPage'));
const QQLibraryPage       = React.lazy(() => import('./pages/QQLibraryPage'));
const QQHostSheetsPage    = React.lazy(() => import('./pages/QQHostSheetsPage'));
const QQSlideEditorPage   = React.lazy(() => import('./pages/QQSlideEditorPage'));
const QQRulesEditorPage   = React.lazy(() => import('./pages/QQRulesEditorPage'));
const QQSummaryPage       = React.lazy(() => import('./pages/QQSummaryPage'));
const QQLandingPage       = React.lazy(() => import('./pages/QQLandingPage'));
const QQFormatsRoadmapPage = React.lazy(() => import('./pages/QQFormatsRoadmapPage'));
const QQFeedbackDashboard = React.lazy(() => import('./pages/QQFeedbackDashboard'));
const QQAvatarGeneratorPage = React.lazy(() => import('./pages/QQAvatarGeneratorPage'));
const DesignLabPage = React.lazy(() => import('./pages/DesignLabPage'));
const AnimationsLabPage = React.lazy(() => import('./pages/AnimationsLabPage'));
const QQThanksTestPage = React.lazy(() => import('./pages/QQThanksTestPage'));

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
  useEffect(() => {
    // RoomCode aus localStorage holen (wird von QQ-Pages dort abgelegt); URL-Query als Fallback
    const getRoom = () => {
      try {
        const ls = localStorage.getItem('qq:lastRoomCode') || localStorage.getItem('qq.roomCode');
        if (ls) return ls;
        const u = new URL(window.location.href);
        return u.searchParams.get('room') || u.pathname.split('/').find((p) => /^[A-Z0-9]{4,6}$/i.test(p));
      } catch { return undefined; }
    };
    const source = window.location.pathname.includes('/moderator') ? 'moderator'
                 : window.location.pathname.includes('/beamer') ? 'beamer'
                 : window.location.pathname.includes('/team') ? 'team'
                 : 'qq';
    installGlobalCrashHandlers(source, getRoom);
  }, []);

  return (
    <AppErrorBoundary>
      <GlobalErrorOverlay />
      <Suspense fallback={
        <div style={{ minHeight: '100vh', background: '#0b0d14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      }>
        <Routes>
          {/* ── Quarter Quiz (Hauptapp) ───────────────────────────── */}
          <Route path="/" element={<QQLandingPage />} />
          <Route path="/team"       element={<QQErrorBoundary source="team"><QQTeamPage /></QQErrorBoundary>} />
          <Route path="/beamer"     element={<QQErrorBoundary source="beamer"><QQBeamerPage /></QQErrorBoundary>} />
          <Route path="/moderator"  element={<PinGate><QQErrorBoundary source="moderator"><QQModeratorPage /></QQErrorBoundary></PinGate>} />
          <Route path="/mopo"       element={<PinGate><QQErrorBoundary source="mopo"><QQModPortablePage /></QQErrorBoundary></PinGate>} />
          <Route path="/builder"    element={<PinGate><QQBuilderPage /></PinGate>} />
          <Route path="/library"    element={<PinGate><QQLibraryPage /></PinGate>} />
          <Route path="/host-sheets" element={<PinGate><QQHostSheetsPage /></PinGate>} />
          <Route path="/slides"     element={<PinGate><QQSlideEditorPage /></PinGate>} />
          <Route path="/rules-editor" element={<PinGate><QQRulesEditorPage /></PinGate>} />
          <Route path="/summary/:roomCode" element={<QQSummaryPage />} />
          <Route path="/admin"      element={<PinGate><AdminPage /></PinGate>} />
          <Route path="/formats"    element={<PinGate><QQFormatsRoadmapPage /></PinGate>} />
          <Route path="/feedback"   element={<PinGate><QQFeedbackDashboard /></PinGate>} />
          <Route path="/testpage"   element={<PinGate><QQAvatarGeneratorPage /></PinGate>} />
          <Route path="/gekocht"    element={<DesignLabPage />} />
          <Route path="/animations" element={<AnimationsLabPage />} />
          <Route path="/thanks-test" element={<PinGate><QQThanksTestPage /></PinGate>} />

          {/* ── Editor/Tools (vormals unter /alt/*) ───────────────── */}
          <Route path="/fragen"       element={<QuestionEditorPage />} />
          <Route path="/katalog"      element={<QuestionCatalogPage />} />
          <Route path="/stats"        element={<StatsPage />} />
          <Route path="/intro"        element={<IntroSlidesPage />} />
          <Route path="/menu"         element={<PinGate><MenuPage /></PinGate>} />
          <Route path="/qrcode"       element={<QrCodePage />} />

          {/* ── Legacy-Redirects (alte QQ-URLs) ──────────────────── */}
          <Route path="/quarterquiz-moderator" element={<Navigate to="/moderator" replace />} />
          <Route path="/quarterquiz-beamer"    element={<Navigate to="/beamer" replace />} />
          <Route path="/quarterquiz-team"      element={<Navigate to="/team" replace />} />
          <Route path="/qq-builder"            element={<Navigate to="/builder" replace />} />
          <Route path="/qq-library"            element={<Navigate to="/library" replace />} />
          <Route path="/qq-slides"             element={<Navigate to="/slides" replace />} />

          {/* ── Legacy-Redirects (alte URLs) ────────────────────── */}
          <Route path="/question-editor"       element={<Navigate to="/fragen" replace />} />
          <Route path="/question-catalog"      element={<Navigate to="/katalog" replace />} />
          <Route path="/alt/fragen"            element={<Navigate to="/fragen" replace />} />
          <Route path="/alt/katalog"           element={<Navigate to="/katalog" replace />} />
          <Route path="/alt/stats"             element={<Navigate to="/stats" replace />} />
          <Route path="/alt/intro"             element={<Navigate to="/intro" replace />} />
          <Route path="/alt/menu"              element={<Navigate to="/menu" replace />} />
          <Route path="/alt/qrcode"            element={<Navigate to="/qrcode" replace />} />

          <Route path="*" element={<Navigate to="/team" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}

export default App;
