/**
 * CozyQuizTeamPrimitives — Mini-Bausteine fuer die Team-Phone-View.
 *
 * Generische, presentation-only Components ohne Game-State-Abhaengigkeit:
 * - CozyCard: Frosted-Glass Card-Wrapper (Premium-Mobile-Look)
 * - CozyBtn: Standard-CTA-Button
 * - StepLabel: kleines Uppercase-Label
 * - StatChip: Pill-Badge mit color-tint
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 1).
 */
import type { ReactNode, CSSProperties } from 'react';

/** Frosted-Glass-Surface fuer Team-View Cards. Premium-Mobile-Look (opacity
 *  0.62 + saturate 160%, lesbar). backdrop-filter mit -webkit-Fallback fuer
 *  Safari iOS. */
export function CozyCard({
  children, anim, borderColor, pulse,
}: {
  children: ReactNode;
  anim?: boolean;
  borderColor?: string;
  pulse?: boolean;
}) {
  return (
    <div style={{
      background: 'rgba(31, 26, 46, 0.62)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      border: `1px solid ${borderColor ? borderColor + '55' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 22, padding: '22px 20px', marginBottom: 14,
      boxShadow: `0 12px 36px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)${borderColor ? `, 0 0 24px ${borderColor}22` : ''}`,
      animation: anim ? 'tcreveal 0.4s ease both' : pulse ? `tcpulse 2.5s ease-in-out infinite` : undefined,
      ['--c' as string]: borderColor ? `${borderColor}33` : undefined,
      transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
    } as CSSProperties}>
      {children}
    </div>
  );
}

/** Standard Team-CTA-Button: voll-breit, color-tinted Border + Glow. */
export function CozyBtn({
  children, color, onClick, disabled,
}: {
  children: ReactNode;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '16px', borderRadius: 16, fontFamily: 'inherit', fontWeight: 900, fontSize: 17,
      border: `2px solid ${disabled ? 'rgba(255,255,255,0.08)' : color}`,
      background: disabled ? 'rgba(255,255,255,0.04)' : `${color}22`,
      color: disabled ? '#334155' : color,
      cursor: disabled ? 'default' : 'pointer',
      boxShadow: disabled ? 'none' : `0 0 20px ${color}22`,
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}

/** Kleines Uppercase-Label fuer Setup-Schritte ("STEP 1 — TEAMNAME" etc.). */
export function StepLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 900, color: '#64748b',
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

/** Pill-Badge mit color-tint, z.B. fuer "3/8 Teams" oder "Phase 2/4". */
export function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      padding: '3px 10px', borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}33`,
      fontSize: 13, fontWeight: 900, color,
    }}>
      {label}
    </div>
  );
}
