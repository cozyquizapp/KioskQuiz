import { Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
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

// Zentrales Routing auf die getrennten Bereiche
function App() {
  return (
    <AppErrorBoundary>
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
