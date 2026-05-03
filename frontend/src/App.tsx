import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, Suspense } from 'react';
import PinGate from './components/PinGate';
import QQErrorBoundary, { installGlobalCrashHandlers } from './components/QQErrorBoundary';

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
const QuestionCatalogPage = React.lazy(() => import('./pages/QuestionCatalogPage'));
const CreatorCanvasPage = React.lazy(() => import('./pages/CreatorCanvasPage'));
const QrCodePage = React.lazy(() => import('./pages/QrCodePage'));
const ImprovedCozy60BuilderPage = React.lazy(() => import('./pages/ImprovedCozy60BuilderPage'));
const QQModeratorPage = React.lazy(() => import('./pages/QQModeratorPage'));
const QQBeamerPage    = React.lazy(() => import('./pages/QQBeamerPage'));
const QQTeamPage      = React.lazy(() => import('./pages/QQTeamPage'));
const QQBuilderPage   = React.lazy(() => import('./pages/QQBuilderPage'));
const QQLibraryPage       = React.lazy(() => import('./pages/QQLibraryPage'));
const QQHostSheetsPage    = React.lazy(() => import('./pages/QQHostSheetsPage'));
const QQSlideEditorPage   = React.lazy(() => import('./pages/QQSlideEditorPage'));
const QQSummaryPage       = React.lazy(() => import('./pages/QQSummaryPage'));
const QQLandingPage       = React.lazy(() => import('./pages/QQLandingPage'));
const QQCityLabPage       = React.lazy(() => import('./pages/QQCityLabPage'));
const QQGardenPitchPage   = React.lazy(() => import('./pages/QQGardenPitchPage'));
const QQFormatsRoadmapPage = React.lazy(() => import('./pages/QQFormatsRoadmapPage'));
const QQGouachePage       = React.lazy(() => import('./pages/QQGouachePage'));
const QQLobbyGouachePage  = React.lazy(() => import('./pages/QQLobbyGouachePage'));
const QQTeamGouachePage   = React.lazy(() => import('./pages/QQTeamGouachePage'));
const QQBeamerGouachePage = React.lazy(() => import('./pages/QQBeamerGouachePage'));
const QQRoundLabPage      = React.lazy(() => import('./pages/QQRoundLabPage'));
const QQRevealLabPage     = React.lazy(() => import('./pages/QQRevealLabPage'));
const QQCozyLabPage       = React.lazy(() => import('./pages/QQCozyLabPage'));
const QQFeedbackDashboard = React.lazy(() => import('./pages/QQFeedbackDashboard'));
const QQPolishTestPage    = React.lazy(() => import('./pages/QQPolishTestPage'));
const QQAvatarGeneratorPage = React.lazy(() => import('./pages/QQAvatarGeneratorPage'));

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
          <Route path="/builder"    element={<PinGate><QQBuilderPage /></PinGate>} />
          <Route path="/library"    element={<PinGate><QQLibraryPage /></PinGate>} />
          <Route path="/host-sheets" element={<PinGate><QQHostSheetsPage /></PinGate>} />
          <Route path="/slides"     element={<PinGate><QQSlideEditorPage /></PinGate>} />
          <Route path="/summary/:roomCode" element={<QQSummaryPage />} />
          <Route path="/admin"      element={<PinGate><AdminPage /></PinGate>} />
          <Route path="/city-lab"   element={<PinGate><QQCityLabPage /></PinGate>} />
          <Route path="/garden-pitch" element={<PinGate><QQGardenPitchPage /></PinGate>} />
          <Route path="/formats"    element={<PinGate><QQFormatsRoadmapPage /></PinGate>} />
          <Route path="/gouache"    element={<PinGate><QQGouachePage /></PinGate>} />
          <Route path="/lobby-gouache" element={<QQErrorBoundary source="lobby-gouache"><QQLobbyGouachePage /></QQErrorBoundary>} />
          <Route path="/team-gouache"   element={<QQErrorBoundary source="team-gouache"><QQTeamGouachePage /></QQErrorBoundary>} />
          <Route path="/beamer-gouache" element={<QQErrorBoundary source="beamer-gouache"><QQBeamerGouachePage /></QQErrorBoundary>} />
          <Route path="/round-lab"  element={<PinGate><QQRoundLabPage /></PinGate>} />
          <Route path="/reveal-lab" element={<PinGate><QQRevealLabPage /></PinGate>} />
          <Route path="/cozy-lab"   element={<PinGate><QQCozyLabPage /></PinGate>} />
          <Route path="/feedback"   element={<PinGate><QQFeedbackDashboard /></PinGate>} />
          <Route path="/test"       element={<PinGate><QQPolishTestPage /></PinGate>} />
          <Route path="/testpage"   element={<PinGate><QQAvatarGeneratorPage /></PinGate>} />

          {/* ── Altes CozyQuiz (Archiv) ───────────────────────────── */}
          <Route path="/alt/team"         element={<TeamPage />} />
          <Route path="/alt/beamer"       element={<BeamerPage />} />
          <Route path="/alt/beamer/:roomCode" element={<BeamerPage />} />
          <Route path="/alt/moderator"    element={<PinGate><ModeratorPage /></PinGate>} />
          <Route path="/alt/baukasten"    element={<CreatorCanvasPage />} />
          <Route path="/alt/builder"      element={<ImprovedCozy60BuilderPage />} />
          <Route path="/alt/fragen"       element={<QuestionEditorPage />} />
          <Route path="/alt/katalog"      element={<QuestionCatalogPage />} />
          <Route path="/alt/stats"        element={<StatsPage />} />
          <Route path="/alt/intro"        element={<IntroSlidesPage />} />
          <Route path="/alt/menu"         element={<PinGate><MenuPage /></PinGate>} />
          <Route path="/alt/qrcode"       element={<QrCodePage />} />

          {/* ── Legacy-Redirects (alte QQ-URLs) ──────────────────── */}
          <Route path="/quarterquiz-moderator" element={<Navigate to="/moderator" replace />} />
          <Route path="/quarterquiz-beamer"    element={<Navigate to="/beamer" replace />} />
          <Route path="/quarterquiz-team"      element={<Navigate to="/team" replace />} />
          <Route path="/qq-builder"            element={<Navigate to="/builder" replace />} />
          <Route path="/qq-library"            element={<Navigate to="/library" replace />} />
          <Route path="/qq-slides"             element={<Navigate to="/slides" replace />} />

          {/* ── Legacy-Redirects (alte CozyQuiz-URLs) ────────────── */}
          <Route path="/welcome"               element={<Navigate to="/alt/team" replace />} />
          <Route path="/baukasten_neu"         element={<Navigate to="/alt/baukasten" replace />} />
          <Route path="/baukasten"             element={<Navigate to="/alt/baukasten" replace />} />
          <Route path="/creator"               element={<Navigate to="/alt/baukasten" replace />} />
          <Route path="/creator-v2"            element={<Navigate to="/alt/baukasten" replace />} />
          <Route path="/creator-wizard"        element={<Navigate to="/alt/baukasten" replace />} />
          <Route path="/creator-canvas"        element={<Navigate to="/alt/baukasten" replace />} />
          <Route path="/creator-app"           element={<Navigate to="/alt/baukasten" replace />} />
          <Route path="/kanban-builder"        element={<Navigate to="/alt/builder" replace />} />
          <Route path="/question-editor"       element={<Navigate to="/alt/fragen" replace />} />
          <Route path="/question-catalog"      element={<Navigate to="/alt/katalog" replace />} />
          <Route path="/stats"                 element={<Navigate to="/alt/stats" replace />} />
          <Route path="/intro"                 element={<Navigate to="/alt/intro" replace />} />
          <Route path="/menu"                  element={<Navigate to="/alt/menu" replace />} />
          <Route path="/presentation-creator"  element={<Navigate to="/alt/baukasten" replace />} />
          <Route path="/qrcode"                element={<Navigate to="/alt/qrcode" replace />} />

          <Route path="*" element={<Navigate to="/team" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}

export default App;
