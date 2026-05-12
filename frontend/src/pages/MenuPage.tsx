import { useState } from 'react';
import { Link } from 'react-router-dom';

type LinkItem = { path: string; label: string; emoji: string; note?: string };

// ─────────────────────────────────────────────────────────────────────────
// CozyQuiz — Live-Spiel-Elemente (alles was an einem Quiz-Abend gebraucht wird)
// ─────────────────────────────────────────────────────────────────────────
const cozyQuizLinks: LinkItem[] = [
  { path: '/moderator',   label: 'Moderator',          emoji: '🎛️', note: 'Fragen steuern, Gewinner bestätigen' },
  { path: '/mopo',        label: 'MoPo (mobile Mod)',  emoji: '📲', note: 'iPhone-Version — großer Space-Button + Mod-Facts' },
  { path: '/beamer',      label: 'Beamer',             emoji: '📽️', note: 'Grid live anzeigen' },
  { path: '/team',        label: 'Team',               emoji: '📱', note: 'Antworten eingeben & Felder wählen' },
  { path: '/builder',     label: 'CozyBuilder',        emoji: '🏗️', note: 'Fragensätze erstellen & verwalten' },
  { path: '/library',     label: 'CozyLibrary',        emoji: '📚', note: 'Alle Fragen + Topic-Filter + wie oft schon gespielt' },
  { path: '/host-sheets', label: 'Host-Sheets',        emoji: '🎙️', note: 'Moderator-Spickzettel als PDF drucken' },
  { path: '/feedback',    label: 'Feedback-Dashboard', emoji: '📋', note: 'Spieler-Feedback & Bug-Reports' },
];

// ─────────────────────────────────────────────────────────────────────────
// CozyQuiz Test-Pages — Standalone-Vorschauen einzelner Quiz-Slides ohne ein
// echtes Spiel durchzuziehen. Mit Toggle-Toolbars für Sprache/Teams/Awards.
// ─────────────────────────────────────────────────────────────────────────
const cozyQuizTestLinks: LinkItem[] = [
  { path: '/thanks-test',      label: 'Thanks-Page Test',   emoji: '🎉', note: 'Standalone-Vorschau der Thanks-View mit Mock-Daten (DE/EN, 3-8 Teams, Award-Sets)' },
  { path: '/finalreveal-test', label: 'Treppchen Test',     emoji: '🎬', note: 'Endgame-Choreografie scrubben — Step-Slider 0..N+8 + Quick-Jumps zu Crescendo-Akten (Stage/Fill/Drop 🏆)' },
  { path: '/bet-test',         label: 'Bet-Page Test',      emoji: '🎰', note: 'Final-Wager-Beamer-View — 3/5/8 Teams, Submit-Count Slider, Sprache' },
  { path: '/hl-test',          label: 'Mehr-oder-Weniger',  emoji: '⚡', note: 'Comeback Higher/Lower — 1-5 Teams, Frage/Reveal-Phasen, Higher/Lower-Choice, 4 Pair-Beispiele' },
  { path: '/summary-test',     label: 'Summary Test',       emoji: '📊', note: 'Public-Summary-Page nach QR-Scan — 3/5/8 Teams, Awards, ESC-Mode-Toggle' },
  { path: '/testpage',         label: 'Team-Avatar-Picker', emoji: '🧑‍🎨', note: 'Lobby-Setup: Name + Emoji + Farbe pro Team (mobile-first)' },
];

// ─────────────────────────────────────────────────────────────────────────
// Extras — Tools, Admin, Stats (verbliebene Editoren)
// ─────────────────────────────────────────────────────────────────────────
const extrasLinks: LinkItem[] = [
  { path: '/formats',             label: 'Format-Roadmap',     emoji: '🗺️', note: 'Alle Spielformate (live + Konzepte) auf einen Blick' },
  { path: '/bingo-grid-test.html', label: 'Grid Tester',        emoji: '🔬', note: 'Spielfeld & Mechaniken simulieren' },
  { path: '/sneak-peak.html',     label: 'Design Sneak Peak',  emoji: '✨', note: 'Mockup: Canva-Look für das neue Design' },
  { path: '/slides',              label: 'Slide-Editor',       emoji: '🎨', note: 'Custom Slides pro Frage gestalten — bestehende Drafts editieren' },
  { path: '/rules-editor',        label: 'Regeltexte',         emoji: '📜', note: 'Spielregel-Folien, Kategorie-Intros, Runden-Hinweise anpassen (lokal)' },
  { path: '/admin',               label: 'Admin',              emoji: '⚙️', note: 'PIN, Settings, etc.' },
  { path: '/stats',           label: 'Stats & Leaderboard', emoji: '📊', note: 'Letzte Runs & Frage-Verteilungen' },
  { path: '/katalog',         label: 'Fragenkatalog',      emoji: '📚', note: 'Frage-Datenbank durchsuchen & verwalten' },
  { path: '/intro',           label: 'Intro-Slides',       emoji: '📖', note: 'Pre-Show Slides editieren' },
  { path: '/fragen',          label: 'Fragen-Editor',      emoji: '✏️', note: 'Einzelne Fragen bearbeiten' },
  { path: '/qrcode',          label: 'Beitritts-QR',       emoji: '🔳', note: 'QR-Code für Team-Beitritt' },
];

// ─────────────────────────────────────────────────────────────────────────
// Link-Helpers
// ─────────────────────────────────────────────────────────────────────────
const isExternal = (path: string) => /^https?:\/\//i.test(path) || path.endsWith('.html');

function LinkCard({ link, accent }: { link: LinkItem; accent: string }) {
  const inner = (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = `${accent}14`;
        (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}44`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{link.emoji}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9', lineHeight: 1.2 }}>{link.label}</div>
        {link.note && (
          <div style={{
            fontSize: 12, color: '#64748b', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{link.note}</div>
        )}
      </div>
    </div>
  );

  if (isExternal(link.path)) {
    return <a href={link.path} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</a>;
  }
  return <Link to={link.path} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>;
}

// ─────────────────────────────────────────────────────────────────────────
// Expandable App-Panel
// ─────────────────────────────────────────────────────────────────────────
function AppPanel({
  label, emoji, tagline, accent, links, defaultOpen = false,
}: {
  label: string; emoji: string; tagline: string;
  accent: string; links: LinkItem[]; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      borderRadius: 18,
      border: `1px solid ${open ? accent + '40' : 'rgba(255,255,255,0.07)'}`,
      background: open ? `${accent}09` : 'rgba(255,255,255,0.025)',
      overflow: 'hidden',
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 20px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left', color: '#e2e8f0',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: `${accent}22`, border: `1.5px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#f8fafc', lineHeight: 1.2 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{tagline}</div>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: open ? `${accent}22` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? accent + '44' : 'rgba(255,255,255,0.10)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: open ? accent : '#64748b',
          transition: 'all 0.2s',
        }}>
          {open ? '−' : '+'}
        </div>
      </button>
      {open && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 8, padding: '0 16px 16px',
        }}>
          {links.map(link => (
            <LinkCard key={link.path} link={link} accent={accent} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
const MenuPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: '#e2e8f0',
      fontFamily: 'var(--font)',
      padding: '0 0 60px',
    }}>
      {/* Hero header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '28px 32px 24px',
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <img
          src="/logo.png"
          alt="Logo"
          style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'contain' }}
        />
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#f8fafc', lineHeight: 1.1 }}>
            Cozy Kiosk Quiz
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 3, letterSpacing: '0.04em' }}>
            a cozy wolf production
          </div>
        </div>
      </div>

      {/* Drei Untermenüs */}
      <div style={{
        maxWidth: 820, margin: '0 auto', padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <AppPanel
          label="CozyQuiz"
          emoji="🗺️"
          tagline="Live-Spiel — Moderator, Beamer, Team, Builder"
          accent="#3B82F6"
          links={cozyQuizLinks}
          defaultOpen
        />

        <AppPanel
          label="CozyQuiz · Test-Pages"
          emoji="🧪"
          tagline="Standalone-Vorschauen einzelner Quiz-Slides — Thanks, Treppchen, Summary, Avatar-Picker"
          accent="#EC4899"
          links={cozyQuizTestLinks}
        />

        <AppPanel
          label="Extras"
          emoji="🧰"
          tagline="Tools, Editoren, Admin, Stats"
          accent="#6B7280"
          links={extrasLinks}
        />
      </div>
    </div>
  );
};

export default MenuPage;
