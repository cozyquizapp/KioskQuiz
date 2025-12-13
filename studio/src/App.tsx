import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import Creator from './pages/Creator'
import Home from './pages/Home'
import Import from './pages/Import'
import Presentation from './pages/Presentation'
import QuestionEditor from './pages/QuestionEditor'
import Stats from './pages/Stats'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">Kiosk Quiz Studio</div>
          <nav className="nav-links">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Home
            </NavLink>
            <NavLink to="/creator" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Quiz Flow
            </NavLink>
            <NavLink to="/questions" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Fragen
            </NavLink>
            <NavLink to="/presentation" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Präsentation
            </NavLink>
            <NavLink to="/stats" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Stats
            </NavLink>
            <NavLink to="/import" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Import
            </NavLink>
          </nav>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/creator" element={<Creator />} />
            <Route path="/questions" element={<QuestionEditor />} />
            <Route path="/presentation" element={<Presentation />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/import" element={<Import />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
