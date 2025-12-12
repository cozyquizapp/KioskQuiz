import { Routes, Route, Navigate } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import TeamPage from './pages/TeamPage';
import BeamerPage from './pages/BeamerPage';
import CreatorWizardPage from './pages/CreatorWizardPage';
import MenuPage from './pages/MenuPage';
import QuestionEditorPage from './pages/QuestionEditorPage';
import ModeratorPage from './pages/ModeratorPage';
import IntroSlidesPage from './pages/IntroSlidesPage';
import PresentationCreatorPage from './pages/PresentationCreatorPage';

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
      <Route path="/creator" element={<CreatorWizardPage />} />
      <Route path="/creator-v2" element={<Navigate to="/creator-wizard" replace />} />
      <Route path="/creator-wizard" element={<CreatorWizardPage />} />
      <Route path="/question-editor" element={<QuestionEditorPage />} />
      <Route path="/moderator" element={<ModeratorPage />} />
      <Route path="/intro" element={<IntroSlidesPage />} />
      <Route path="/presentation-creator" element={<PresentationCreatorPage />} />
      <Route path="*" element={<Navigate to="/team" replace />} />
    </Routes>
  );
}

export default App;
