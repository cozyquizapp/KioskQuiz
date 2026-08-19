import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type PrepWorkspaceHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

/** A compact, desktop-first orientation bar for the private preparation tools. */
export default function PrepWorkspaceHeader({ eyebrow, title, description, actions }: PrepWorkspaceHeaderProps) {
  return (
    <header className="cozy-prep-workspace-header" style={{
      display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap',
      padding: '18px 20px', borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'linear-gradient(115deg, rgba(30,42,90,0.82), rgba(15,23,54,0.72))',
      boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
      marginBottom: 20,
    }}>
      <Link
        to="/menu"
        style={{
          display: 'inline-flex', alignItems: 'center', minHeight: 38, padding: '0 12px',
          borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)',
          color: '#E2E8F0', background: 'rgba(255,255,255,0.06)',
          fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        ← Menü
      </Link>
      <div style={{ flex: '1 1 420px', minWidth: 0 }}>
        <div style={{ color: '#F9A8D4', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          {eyebrow}
        </div>
        <h1 style={{ margin: 0, color: '#F8FAFC', fontFamily: "'Fredoka', 'Nunito', system-ui, sans-serif", fontSize: 28, lineHeight: 1.1 }}>
          {title}
        </h1>
        <p style={{ maxWidth: 680, margin: '7px 0 0', color: '#CBD5E1', fontSize: 14, lineHeight: 1.45 }}>
          {description}
        </p>
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>{actions}</div>}
      <style>{`
        .cozy-prep-workspace-header a:focus-visible, .cozy-prep-workspace-header button:focus-visible, .cozy-prep-workspace-header input:focus-visible, .cozy-prep-workspace-header select:focus-visible, .cozy-prep-workspace-header textarea:focus-visible {
          outline: 3px solid #F9A8D4;
          outline-offset: 3px;
        }
        @media (forced-colors: active) {
          .cozy-prep-workspace-header a:focus-visible, .cozy-prep-workspace-header button:focus-visible, .cozy-prep-workspace-header input:focus-visible, .cozy-prep-workspace-header select:focus-visible, .cozy-prep-workspace-header textarea:focus-visible { outline-color: Highlight; }
        }
      `}</style>
    </header>
  );
}
