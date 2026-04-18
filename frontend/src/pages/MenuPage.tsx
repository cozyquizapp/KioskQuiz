import { useState } from 'react';
import { Link } from 'react-router-dom';
import { featureFlags } from '../config/features';

type LinkItem = { path: string; label: string; emoji: string; note?: string };

// ── CozyQuiz 60 links ─────────────────────────────────────────────────────────
const cozyLinks: LinkItem[] = [
  { path: '/moderator',       label: 'Moderator',        emoji: '🎛️', note: 'Session steuern, Stages wechseln' },
  { path: '/beamer',          label: 'Beamer',            emoji: '📽️', note: 'Präsentation & Slides anzeigen' },
  { path: 'https://play.cozyquiz.app/team', label: 'Team', emoji: '📱', note: 'Mitspielen & Antworten eingeben' },
  { path: '/qrcode',          label: 'QR-Code',           emoji: '🔳', note: 'Beitritts-QR für Teams' },
  { path: '/intro.html',      label: 'Regelerklärvideo',  emoji: '🎬', note: 'Animiertes Intro mit Spielregeln' },
  { path: '/kanban-builder',  label: 'Kanban Builder',    emoji: '🗂️', note: 'Visueller Quiz-Builder mit Drag & Drop' },
  { path: '/question-catalog',label: 'Fragenbibliothek',  emoji: '📚', note: 'Alle Fragen durchsuchen & bearbeiten' },
];

// ── Quarter Quiz links ────────────────────────────────────────────────────────
const qqLinks: LinkItem[] = [
  { path: '/moderator', label: 'Moderator',       emoji: '🎛️', note: 'Fragen steuern, Gewinner bestätigen' },
  { path: '/beamer',    label: 'Beamer',           emoji: '📽️', note: 'Grid live anzeigen' },
  { path: '/team',      label: 'Team',             emoji: '📱', note: 'Antworten eingeben & Felder wählen' },
  { path: '/builder',            label: 'QQ Builder',       emoji: '🏗️', note: 'Fragensätze erstellen & verwalten' },
  { path: '/library',             label: 'Fragenbibliothek', emoji: '📚', note: 'QQ Drafts durchsuchen & verwalten' },
  { path: '/host-sheets',         label: 'Host-Sheets',      emoji: '🎙️', note: 'Moderator-Spickzettel als PDF drucken' },
  { path: '/bingo-grid-test.html',  label: 'Grid Tester',      emoji: '🔬', note: 'Spielfeld & Mechaniken simulieren' },
  { path: '/sneak-peak.html',       label: 'Design Sneak Peak',emoji: '✨', note: 'Mockup: Canva-Look für das neue Design' },
];

// ── Legacy ────────────────────────────────────────────────────────────────────
const legacyLinks: LinkItem[] = [
  { path: '/intro',              label: 'Intro & Regeln',       emoji: '📖', note: 'Pre-Show Slides / Regeln' },
  { path: '/admin',              label: 'Admin (Legacy)',        emoji: '⚙️', note: 'Nur nutzen falls Moderator ausfällt' },
  { path: '/creator-canvas',     label: 'Creator Canvas (alt)', emoji: '🖼️', note: 'Legacy Builder' },
  { path: '/stats',              label: 'Stats & Leaderboard',  emoji: '📊', note: 'Letzte Runs & Frage-Verteilungen' },
];

// ── Link helpers ──────────────────────────────────────────────────────────────
const isExternal = (path: string) => /^https?:\/\//i.test(path) || path.endsWith('.html');

function LinkCard({ link, accent }: { link: LinkItem; accent: string }) {
  const inner = (
    <div style={{
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
        {link.note && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.note}</div>}
      </div>
    </div>
  );

  if (isExternal(link.path)) {
    return <a href={link.path} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</a>;
  }
  return <Link to={link.path} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>;
}

// ── Expandable app panel ──────────────────────────────────────────────────────
function AppPanel({
  id, label, emoji, tagline, accent, links, defaultOpen = false, compact = false,
}: {
  id: string; label: string; emoji: string; tagline: string;
  accent: string; links: LinkItem[]; defaultOpen?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      borderRadius: compact ? 12 : 18,
      border: `1px solid ${open ? accent + '40' : 'rgba(255,255,255,0.07)'}`,
      background: open ? `${accent}09` : compact ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.025)',
      overflow: 'hidden',
      opacity: compact && !open ? 0.7 : 1,
      transition: 'border-color 0.2s, background 0.2s, opacity 0.2s',
    }}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: compact ? 10 : 14,
          padding: compact ? '10px 14px' : '18px 20px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left', color: '#e2e8f0',
        }}
      >
        <div style={{
          width: compact ? 30 : 48, height: compact ? 30 : 48, borderRadius: compact ? 8 : 14, flexShrink: 0,
          background: `${accent}22`, border: `1.5px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? 16 : 24,
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: compact ? 700 : 900, fontSize: compact ? 14 : 18, color: compact ? '#cbd5e1' : '#f8fafc', lineHeight: 1.2 }}>{label}</div>
          {!compact && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{tagline}</div>}
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

      {/* Links grid */}
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

// ── Page ──────────────────────────────────────────────────────────────────────
const MenuPage = () => {
  const showLegacy = featureFlags.showLegacyPanels;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: '#e2e8f0',
      fontFamily: 'var(--font)',
      padding: '0 0 60px',
    }}>

      {/* ── Hero header ───────────────────────────────────────────────────── */}
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

      {/* ── Panels ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <AppPanel
          id="qq"
          label="CozyQuiz"
          emoji="🗺️"
          tagline="Territorium-Quiz — Felder erobern, Comeback kämpfen"
          accent="#3B82F6"
          links={qqLinks}
          defaultOpen={true}
        />

        <AppPanel
          id="cozy"
          label="CozyQuiz 60"
          emoji="🐺"
          tagline="Das klassische Gemeinschaftsquiz — 60 Minuten, 5 Kategorien"
          accent="#F59E0B"
          links={cozyLinks}
          defaultOpen={false}
          compact
        />

        {showLegacy && (
          <AppPanel
            id="legacy"
            label="Legacy & Tools"
            emoji="🔧"
            tagline="Ältere Versionen und interne Tools"
            accent="#6B7280"
            links={legacyLinks}
          />
        )}

      </div>
    </div>
  );
};

export default MenuPage;
