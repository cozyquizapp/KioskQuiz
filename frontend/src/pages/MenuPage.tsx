import { useState } from 'react';
import { Link } from 'react-router-dom';

type LinkItem = { path: string; label: string; emoji: string; note?: string };

// ─────────────────────────────────────────────────────────────────────────
// CozyQuiz — Live-Spiel-Elemente (alles was an einem Quiz-Abend gebraucht wird)
// ─────────────────────────────────────────────────────────────────────────
const cozyQuizLinks: LinkItem[] = [
  { path: '/moderator',   label: 'Moderator',        emoji: '🎛️', note: 'Fragen steuern, Gewinner bestätigen' },
  { path: '/beamer',      label: 'Beamer',           emoji: '📽️', note: 'Grid live anzeigen' },
  { path: '/team',        label: 'Team',             emoji: '📱', note: 'Antworten eingeben & Felder wählen' },
  { path: '/builder',     label: 'QQ Builder',       emoji: '🏗️', note: 'Fragensätze erstellen & verwalten' },
  { path: '/library',     label: 'Fragenbibliothek', emoji: '📚', note: 'QQ Drafts durchsuchen & verwalten' },
  { path: '/host-sheets', label: 'Host-Sheets',      emoji: '🎙️', note: 'Moderator-Spickzettel als PDF drucken' },
  { path: '/slides',      label: 'Slide-Editor',     emoji: '🎨', note: 'Custom Slides pro Frage gestalten' },
];

// ─────────────────────────────────────────────────────────────────────────
// Gouache — Aquarell-Stil-Migration (pausiert; bleibt als Spielwiese)
// ─────────────────────────────────────────────────────────────────────────
const gouacheLinks: LinkItem[] = [
  { path: '/gouache',         label: 'Gouache Lab',      emoji: '🎨', note: 'Aquarell-/Bilderbuch-Stilstudie + Live-Avatar-Status' },
  { path: '/lobby-gouache',   label: 'Lobby (Gouache)',  emoji: '🎈', note: 'Welcome-Lobby im Aquarell-Look — selber Socket-Room wie /beamer' },
  { path: '/team-gouache',    label: 'Team (Gouache)',   emoji: '📱', note: 'Phone-Variante im Aquarell-Look' },
  { path: '/beamer-gouache',  label: 'Beamer (Gouache)', emoji: '📽️', note: 'Beamer-Show im Aquarell-Look — alle Phasen + Game-Over' },
];

// ─────────────────────────────────────────────────────────────────────────
// Extras — Labs, Tools, Admin, Stats + alle Cozy60-Pages
// ─────────────────────────────────────────────────────────────────────────
const extrasLinks: LinkItem[] = [
  // Labs
  { path: '/round-lab',           label: 'Wolf-Trail Lab',     emoji: '🐺', note: 'Prototyp: Wolf wandert den Tree entlang' },
  { path: '/reveal-lab',          label: 'Reveal-Lab',         emoji: '👥', note: 'Avatar-Layouts pro Kategorie vergleichen' },
  { path: '/city-lab',            label: 'City Lab (3D)',      emoji: '🏙️', note: '3D-Grid-Konzepte: Häuser · Pagoden · Habitats' },
  { path: '/garden-pitch',        label: 'Garden Pitch',       emoji: '🌱', note: 'Mass-Quiz-Modus für 100+ Personen — Konzept-Demo' },
  { path: '/bingo-grid-test.html', label: 'Grid Tester',        emoji: '🔬', note: 'Spielfeld & Mechaniken simulieren' },
  { path: '/sneak-peak.html',     label: 'Design Sneak Peak',  emoji: '✨', note: 'Mockup: Canva-Look für das neue Design' },
  // Admin & Stats
  { path: '/feedback',            label: 'Feedback-Dashboard', emoji: '📋', note: 'Spieler-Feedback & Bug-Reports' },
  { path: '/admin',               label: 'Admin',              emoji: '⚙️', note: 'PIN, Settings, etc.' },
  { path: '/alt/stats',           label: 'Stats & Leaderboard', emoji: '📊', note: 'Letzte Runs & Frage-Verteilungen' },
  // Cozy60 (alte App, nicht mehr aktiv weiterentwickelt)
  { path: '/alt/moderator',       label: 'Cozy60 · Moderator', emoji: '🎛️', note: 'Cozy60 Mod-Panel (alte App)' },
  { path: '/alt/beamer',          label: 'Cozy60 · Beamer',    emoji: '📽️', note: 'Cozy60 Präsentation (alte App)' },
  { path: '/alt/team',            label: 'Cozy60 · Team',      emoji: '📱', note: 'Cozy60 Team-View (alte App)' },
  { path: '/alt/builder',         label: 'Cozy60 · Builder',   emoji: '🗂️', note: 'Cozy60 Kanban-Builder (alte App)' },
  { path: '/alt/katalog',         label: 'Cozy60 · Katalog',   emoji: '📚', note: 'Cozy60 Fragenkatalog (alte App)' },
  { path: '/alt/baukasten',       label: 'Cozy60 · Creator',   emoji: '🖼️', note: 'Cozy60 Creator-Canvas (alte App)' },
  { path: '/alt/intro',           label: 'Cozy60 · Intro',     emoji: '📖', note: 'Cozy60 Pre-Show Slides (alte App)' },
  { path: '/alt/qrcode',          label: 'Cozy60 · QR',        emoji: '🔳', note: 'Cozy60 Beitritts-QR (alte App)' },
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
          label="Gouache"
          emoji="🎨"
          tagline="Aquarell-/Bilderbuch-Stil — Lab + parallele Pages (pausiert)"
          accent="#E07A5F"
          links={gouacheLinks}
        />

        <AppPanel
          label="Extras"
          emoji="🧰"
          tagline="Labs, Tools, Admin, Stats und Cozy60-Legacy"
          accent="#6B7280"
          links={extrasLinks}
        />
      </div>
    </div>
  );
};

export default MenuPage;
