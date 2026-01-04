import { useState } from 'react';
import { Link } from 'react-router-dom';

import { featureFlags } from '../config/features';

type LinkItem = { path: string; label: string; note?: string };

const liveLinks: LinkItem[] = [
  { path: '/moderator', label: 'Moderator', note: 'Stage wechseln, Session steuern' },
  { path: '/beamer', label: 'Beamer', note: 'Praesentation / Slides anzeigen' },
  { path: 'https://play.cozyquiz.app/team', label: 'Team', note: 'Mitspielen & Antworten eingeben' }
];

const builderLinks: LinkItem[] = [
  { path: '/cozy60-builder', label: 'Cozy60 Builder', note: '20 Fragen + Fotoblitz & Rundlauf pflegen' }
];

const toolsLinks: LinkItem[] = [
  { path: '/intro', label: 'Intro & Regeln', note: 'Pre-Show Slides / Regeln' },
  { path: '/admin', label: 'Admin (Legacy)', note: 'Nur nutzen, falls Moderator ausfaellt' },
  { path: '/Baukasten Neu_neu', label: 'Baukasten Neu', note: 'Alter Struktur-Flow' },
  { path: '/creator-canvas', label: 'Creator Canvas (alt)', note: 'Legacy Builder' },
  { path: '/stats', label: 'Stats & Leaderboard', note: 'Letzte Runs & Frage-Verteilungen' },
  { path: '/bingo', label: 'Bingo-Print', note: 'Zufaellige Bingofelder als PDF' }
];

const LinkWrapper = ({ link, children }: { link: LinkItem; children: React.ReactNode }) => {
  const isExternal = /^https?:\/\//i.test(link.path);
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

const CardList = ({ title, subtitle, links }: { title: string; subtitle?: string; links: LinkItem[] }) => (
  <div
    style={{
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.03)',
      padding: '14px 16px',
      boxShadow: '0 16px 30px rgba(0,0,0,0.35)'
    }}
  >
    <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
    {subtitle && <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>{subtitle}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {links.map((link) => (
        <LinkWrapper key={link.path} link={link}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.18)',
              boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{link.label}</div>
            </div>
            {link.note && <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 13 }}>{link.note}</div>}
            <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 13 }}>{link.path}</div>
          </div>
        </LinkWrapper>
      ))}
    </div>
  </div>
);

const MenuPage = () => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const showLegacyTools = featureFlags.showLegacyPanels;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 40%), #0d0f14',
        color: '#e2e8f0',
        padding: '40px 24px'
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: 12
            }}
          >
            COZY QUIZ 60
          </div>
          <h1 style={{ margin: '10px 0 6px' }}>Schnellzugriff</h1>
          <p style={{ margin: '0 0 6px', color: '#94a3b8' }}>Waehle den Bereich, den du oeffnen willst.</p>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13 }}>
            Falls direkte URLs nicht laden: erst diese Seite oeffnen und hier auf den gewuenschten Link klicken (SPA-Routing).
          </p>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <CardList title="Live spielen" subtitle="Moderator -> Beamer -> Team" links={liveLinks} />
          <CardList title="Erstellen" subtitle="Cozy60 Builder" links={builderLinks} />
          {showLegacyTools && (
            <div
              style={{
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.03)',
                padding: '14px 16px',
                boxShadow: '0 16px 30px rgba(0,0,0,0.35)'
              }}
            >
              <button
                type="button"
                onClick={() => setToolsOpen((prev) => !prev)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  color: '#e2e8f0',
                  border: 'none',
                  padding: 0,
                  fontWeight: 800,
                  fontSize: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <span>Tools (Erweitert)</span>
                <span style={{ fontSize: 20 }}>{toolsOpen ? '-' : '+'}</span>
              </button>
              {toolsOpen && (
                <div style={{ marginTop: 16 }}>
                  <CardList title="Legacy & Tools" links={toolsLinks} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
