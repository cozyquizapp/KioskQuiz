import { Routes, Route, Navigate } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import TeamPage from './pages/TeamPage';
import BeamerPage from './pages/BeamerPage';
import MenuPage from './pages/MenuPage';
import QuestionEditorPage from './pages/QuestionEditorPage';
import ModeratorPage from './pages/ModeratorPage';
import IntroSlidesPage from './pages/IntroSlidesPage';
import StatsPage from './pages/StatsPage';
import DraftImportPage from './pages/DraftImportPage';
import CreatorCanvasPage from './pages/CreatorCanvasPage';

// Zentrales Routing auf die getrennten Bereiche
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/team" replace />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/team" element={<TeamPage />} />
      <Route path="/beamer" element={<BeamerPage />} />
      <Route path="/beamer/:roomCode" element={<BeamerPage />} />
      <Route path="/creator" element={<Navigate to="/creator-canvas" replace />} />
      <Route path="/creator-v2" element={<Navigate to="/creator-canvas" replace />} />
      <Route path="/creator-wizard" element={<Navigate to="/creator-canvas" replace />} />
      <Route path="/creator-canvas" element={<CreatorCanvasPage />} />
      <Route path="/creator-app" element={<Navigate to="/creator-canvas" replace />} />
      <Route path="/question-editor" element={<QuestionEditorPage />} />
      <Route path="/moderator" element={<ModeratorPage />} />
      <Route path="/intro" element={<IntroSlidesPage />} />
      <Route path="/presentation-creator" element={<Navigate to="/creator-canvas" replace />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/draft-import" element={<DraftImportPage />} />
      <Route path="*" element={<Navigate to="/team" replace />} />
    </Routes>
  );
}

export default App;
