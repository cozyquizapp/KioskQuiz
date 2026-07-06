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
const CozyGamesEditorPage = React.lazy(() => import('./pages/CozyGamesEditorPage'));
const CozyGameWheelTestPage = React.lazy(() => import('./pages/CozyGameWheelTestPage'));
const QQSummaryPage       = React.lazy(() => import('./pages/QQSummaryPage'));
const QQRecapPage         = React.lazy(() => import('./pages/QQRecapPage'));
const QQRecapIndexPage    = React.lazy(() => import('./pages/QQRecapIndexPage'));
const QQLandingPage       = React.lazy(() => import('./pages/QQLandingPage'));
const QQDemoReal          = React.lazy(() => import('./components/QQDemoReal'));
const QQShowroomPage      = React.lazy(() => import('./pages/QQShowroomPage'));
const QQSkinsPage         = React.lazy(() => import('./pages/QQSkinsPage'));
const QQAboutPage         = React.lazy(() => import('./pages/QQAboutPage'));
const QQTrailerPage       = React.lazy(() => import('./pages/QQTrailerPage'));
const QQReelsHubPage      = React.lazy(() => import('./pages/QQReelsHubPage'));
const QQClipPage          = React.lazy(() => import('./pages/QQClipPage'));
const QQFactionQuizPage   = React.lazy(() => import('./pages/QQFactionQuizPage'));
const QQBlinkTestPage     = React.lazy(() => import('./pages/QQBlinkTestPage'));
const QQFormatsRoadmapPage = React.lazy(() => import('./pages/QQFormatsRoadmapPage'));
const QQFeedbackDashboard = React.lazy(() => import('./pages/QQFeedbackDashboard'));
const QQAvatarGeneratorPage = React.lazy(() => import('./pages/QQAvatarGeneratorPage'));
const DesignLabPage = React.lazy(() => import('./pages/DesignLabPage'));
const AnimationsLabPage = React.lazy(() => import('./pages/AnimationsLabPage'));
const QQThanksTestPage = React.lazy(() => import('./pages/QQThanksTestPage'));
const QQFinalRevealTestPage = React.lazy(() => import('./pages/QQFinalRevealTestPage'));
const QQBetTestPage = React.lazy(() => import('./pages/QQBetTestPage'));
const QQSummaryTestPage = React.lazy(() => import('./pages/QQSummaryTestPage'));
const QQHigherLowerTestPage = React.lazy(() => import('./pages/QQHigherLowerTestPage'));
const QQTerritoryTestPage = React.lazy(() => import('./pages/QQTerritoryTestPage'));
const QQBarRaceTestPage = React.lazy(() => import('./pages/QQBarRaceTestPage'));
const LegalPage = React.lazy(() => import('./pages/LegalPage'));

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
          {/* Öffentlicher Showroom-Trailer (QR-Landing „was ist CozyQuiz") — nicht PIN-gegated. */}
          <Route path="/showroom"   element={<QQShowroomPage />} />
          <Route path="/skins"      element={<QQSkinsPage />} />
          <Route path="/about"      element={<QQAboutPage />} />
          <Route path="/was-ist-cozyquiz" element={<QQAboutPage />} />
          <Route path="/trailer"    element={<QQTrailerPage />} />
          <Route path="/trailer/:variant" element={<QQTrailerPage />} />
          <Route path="/reels"      element={<QQReelsHubPage />} />
          <Route path="/clip"       element={<QQClipPage />} />
          <Route path="/welches-team" element={<QQFactionQuizPage />} />
          <Route path="/blinktest"  element={<QQBlinkTestPage />} />
          <Route path="/moderator"  element={<PinGate><QQErrorBoundary source="moderator"><QQModeratorPage /></QQErrorBoundary></PinGate>} />
          {/* 2026-05-25 (Wolf 'test-modus zum reveal-testen'): selbe Mod-Komponente
              mit testMode-prop → Setup uebersprungen, 5 Bots auto-gespawnt,
              Skip-Buttons im Header, DB-Save deaktiviert. */}
          <Route path="/moderator-test" element={<PinGate><QQErrorBoundary source="moderator-test"><QQModeratorPage testMode /></QQErrorBoundary></PinGate>} />
          <Route path="/mopo"       element={<PinGate><QQErrorBoundary source="mopo"><QQModPortablePage /></QQErrorBoundary></PinGate>} />
          <Route path="/builder"    element={<PinGate><QQBuilderPage /></PinGate>} />
          <Route path="/library"    element={<PinGate><QQLibraryPage /></PinGate>} />
          <Route path="/host-sheets" element={<PinGate><QQHostSheetsPage /></PinGate>} />
          <Route path="/slides"     element={<PinGate><QQSlideEditorPage /></PinGate>} />
          <Route path="/rules-editor" element={<PinGate><QQRulesEditorPage /></PinGate>} />
          <Route path="/cozygames"   element={<PinGate><CozyGamesEditorPage /></PinGate>} />
          <Route path="/summary/:roomCode" element={<QQSummaryPage />} />
          {/* 2026-05-10 (Wolf-Fix stabile Spieler-Links): per-Game-ID-Lookup
              zusätzlich zum roomCode-Pfad. Vorher hat der RoomCode-Path
              (SINGLE_SESSION_MODE = MAIN) immer das jüngste Spiel mit dem
              Code geliefert — geteilte Links wurden überschrieben. */}
          <Route path="/summary/by-id/:gameId" element={<QQSummaryPage />} />
          <Route path="/recap" element={<PinGate><QQRecapIndexPage /></PinGate>} />
          <Route path="/recap/:gameId" element={<PinGate><QQRecapPage /></PinGate>} />
          <Route path="/impressum" element={<LegalPage />} />
          <Route path="/datenschutz" element={<LegalPage />} />
          <Route path="/admin"      element={<PinGate><AdminPage /></PinGate>} />
          <Route path="/formats"    element={<PinGate><QQFormatsRoadmapPage /></PinGate>} />
          <Route path="/feedback"   element={<PinGate><QQFeedbackDashboard /></PinGate>} />
          <Route path="/testpage"   element={<PinGate><QQAvatarGeneratorPage /></PinGate>} />
          <Route path="/gekocht"    element={<DesignLabPage />} />
          <Route path="/animations" element={<AnimationsLabPage />} />
          <Route path="/thanks-test" element={<PinGate><QQThanksTestPage /></PinGate>} />
          <Route path="/finalreveal-test" element={<PinGate><QQFinalRevealTestPage /></PinGate>} />
          <Route path="/bet-test" element={<PinGate><QQBetTestPage /></PinGate>} />
          <Route path="/summary-test" element={<PinGate><QQSummaryTestPage /></PinGate>} />
          <Route path="/hl-test" element={<PinGate><QQHigherLowerTestPage /></PinGate>} />
          <Route path="/cozygame-test" element={<PinGate><CozyGameWheelTestPage /></PinGate>} />
          <Route path="/territory-test" element={<PinGate><QQTerritoryTestPage /></PinGate>} />
          <Route path="/barrace-test" element={<PinGate><QQBarRaceTestPage /></PinGate>} />
          {/* 2026-07-03 (Wolf): Preview der Landing-Demo mit ECHTEN Quiz-Views —
              live `/` bleibt vorerst unangetastet, bis Fidelity abgenommen ist. */}
          <Route path="/demo-real" element={<QQErrorBoundary source="demo-real"><div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)' }}><QQDemoReal /></div></QQErrorBoundary>} />

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
