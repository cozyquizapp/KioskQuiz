import { useState } from 'react';
import { Link } from 'react-router-dom';

import { featureFlags } from '../config/features';

type LinkItem = { path: string; label: string; note?: string };

// ── CozyQuiz 60 ──────────────────────────────────────────────────────────────
const cozyLiveLinks: LinkItem[] = [
  { path: '/moderator', label: 'Moderator', note: 'Stage wechseln, Session steuern' },
  { path: '/beamer', label: 'Beamer', note: 'Praesentation / Slides anzeigen' },
  { path: 'https://play.cozyquiz.app/team', label: 'Team', note: 'Mitspielen & Antworten eingeben' },
  { path: '/qrcode', label: 'QR-Code', note: 'Beitritts-QR-Code für Teams anzeigen' },
  { path: '/intro.html', label: 'Regelerklärvideo', note: 'Animiertes Intro mit allen Spielregeln' }
];

// ── Neues Spiel (Name TBD) ────────────────────────────────────────────────────
const revierLiveLinks: LinkItem[] = [
  { path: '/revier-moderator', label: 'Moderator', note: 'Fragen steuern, Gewinner bestätigen' },
  { path: '/revier-beamer', label: 'Beamer', note: 'Grid live anzeigen' },
  { path: '/revier-team', label: 'Team', note: 'Antworten & Felder wählen' },
];

const revierDevLinks: LinkItem[] = [
  { path: '/bingo-grid-test.html', label: 'Grid Tester', note: 'Spielfeld & Mechaniken simulieren' },
  { path: '/sneak-peak.html', label: 'Design Sneak Peak', note: 'Mockup: Canva-Look für das neue Design' },
];

// ── Übergreifend ─────────────────────────────────────────────────────────────
const builderLinks: LinkItem[] = [
  { path: '/kanban-builder', label: 'Kanban Quiz Builder', note: 'Visueller Builder mit Drag & Drop' },
  { path: '/question-catalog', label: 'Fragenbibliothek', note: 'Alle Fragen durchsuchen & bearbeiten' }
];

// ── Legacy ───────────────────────────────────────────────────────────────────
const toolsLinks: LinkItem[] = [
  { path: '/intro', label: 'Intro & Regeln', note: 'Pre-Show Slides / Regeln' },
  { path: '/admin', label: 'Admin (Legacy)', note: 'Nur nutzen, falls Moderator ausfaellt' },
  { path: '/Baukasten Neu_neu', label: 'Baukasten Neu', note: 'Alter Struktur-Flow' },
  { path: '/creator-canvas', label: 'Creator Canvas (alt)', note: 'Legacy Builder' },
  { path: '/stats', label: 'Stats & Leaderboard', note: 'Letzte Runs & Frage-Verteilungen' }
];

// ── Components ────────────────────────────────────────────────────────────────
const LinkWrapper = ({ link, children }: { link: LinkItem; children: React.ReactNode }) => {
  const isExternal = /^https?:\/\//i.test(link.path) || link.path.endsWith('.html');
  if (isExternal) {
    return (
      <a href={link.path} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {children}
      </a>
    );
  }
  return (
    <Link to={link.path} style={{ textDecoration: 'none', color: 'inherit' }}>
      {children}
    </Link>
  );
};

const LinkCard = ({ link }: { link: LinkItem }) => (
  <LinkWrapper link={link}>
    <div
      className="tool-card card-tilt tap-squish"
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.18)',
        boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
        transition: 'transform 0.2s ease, border-color 0.2s ease'
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 16 }}>{link.label}</div>
      {link.note && <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 13 }}>{link.note}</div>}
      <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 12 }}>{link.path}</div>
    </div>
  </LinkWrapper>
);

const AppSection = ({
  badge,
  badgeColor,
  title,
  subtitle,
  sections
}: {
  badge: string;
  badgeColor: string;
  title: string;
  subtitle?: string;
  sections: { label?: string; links: LinkItem[] }[];
}) => (
  <div
    className="tool-card card-tilt"
    style={{
      borderRadius: 16,
      border: `1px solid ${badgeColor}22`,
      background: 'rgba(255,255,255,0.03)',
      padding: '16px',
      boxShadow: '0 16px 30px rgba(0,0,0,0.35)'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 4 : 12 }}>
      <div
        style={{
          padding: '3px 10px',
          borderRadius: 999,
          background: `${badgeColor}18`,
          border: `1px solid ${badgeColor}44`,
          color: badgeColor,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.07em',
          textTransform: 'uppercase' as const
        }}
      >
        {badge}
      </div>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
    </div>
    {subtitle && <div style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>{subtitle}</div>}

    {sections.map((section, i) => (
      <div key={i} style={{ marginTop: i > 0 ? 14 : 0 }}>
        {section.label && (
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {section.label}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {section.links.map((link) => (
            <LinkCard key={link.path} link={link} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const CollapsibleSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        padding: '12px 16px',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: '100%', textAlign: 'left', background: 'transparent',
          color: '#64748b', border: 'none', padding: 0, fontWeight: 700,
          fontSize: 13, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', letterSpacing: '0.04em'
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 18 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const MenuPage = () => {
  const showLegacyTools = featureFlags.showLegacyPanels;

  return (
    <div
      className="page-transition-enter-active"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: '#e2e8f0',
        padding: '40px 24px',
        fontFamily: 'var(--font)'
      }}
    >
      <div style={{ maxWidth: 740, margin: '0 auto' }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 24 }}>Schnellzugriff</h1>
          <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: 13 }}>
            Falls direkte URLs nicht laden: erst diese Seite öffnen, dann Link klicken (SPA-Routing).
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>

          {/* CozyQuiz 60 */}
          <AppSection
            badge="CozyQuiz 60"
            badgeColor="#F59E0B"
            title="Live spielen"
            subtitle="Moderator → Beamer → Team"
            sections={[{ links: cozyLiveLinks }]}
          />

          {/* Quarter Quiz / Quartier Quiz */}
          <AppSection
            badge="Quarter Quiz"
            badgeColor="#3B82F6"
            title="Quartier Quiz"
            subtitle="Territorium-Quiz — in Entwicklung"
            sections={[
              { label: 'Live spielen', links: revierLiveLinks },
              { label: 'Entwicklung & Vorschau', links: revierDevLinks },
            ]}
          />

          {/* Übergreifend */}
          <AppSection
            badge="Übergreifend"
            badgeColor="#22C55E"
            title="Quiz erstellen & verwalten"
            subtitle="Builder & Fragenkatalog — für beide Apps"
            sections={[{ links: builderLinks }]}
          />

          {/* Legacy */}
          {showLegacyTools && (
            <CollapsibleSection title="Legacy & Tools (Erweitert)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {toolsLinks.map((link) => (
                  <LinkCard key={link.path} link={link} />
                ))}
              </div>
            </CollapsibleSection>
          )}

        </div>
      </div>
    </div>
  );
};

export default MenuPage;
