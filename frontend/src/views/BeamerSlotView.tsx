import React, { useEffect, useState } from 'react';
import { QuizCategory, SlotTransitionMeta, Language } from '@shared/quizTypes';
import { mixedMechanicMap } from '@shared/mixedMechanics';
import { categoryColors as CATEGORY_COLORS } from '../categoryColors';

type Lang = Language;

type BeamerSlotViewProps = {
  t: any;
  language: Lang;
  slotMeta: SlotTransitionMeta;
  categories: QuizCategory[];
  categoryColors: Record<string, string>;
  categoryIcons: Record<string, string>;
  slotSequence: QuizCategory[];
  slotOffset: number;
  slotRolling: boolean;
  exiting?: boolean;
  spinIntervalMs?: number;
  totalSpinMs?: number;
  scale?: number;
  getCategoryLabel: (key: QuizCategory, lang: Lang) => string;
  getCategoryDescription: (key: QuizCategory, lang: Lang) => string;
};

const BeamerSlotView: React.FC<BeamerSlotViewProps> = ({
  t,
  language,
  slotMeta,
  categories,
  categoryColors,
  categoryIcons,
  slotSequence,
  slotOffset,
  slotRolling,
  exiting = false,
  spinIntervalMs = 260,
  totalSpinMs = 5000,
  scale = 1,
  getCategoryLabel,
  getCategoryDescription
}) => {
  const isMixed = slotMeta.categoryId === 'GemischteTuete' && slotMeta.mechanicId;
  const mech = isMixed ? mixedMechanicMap[slotMeta.mechanicId!] : undefined;

  const targetLabel = getCategoryLabel(slotMeta.categoryId, language);
  const targetDesc = getCategoryDescription(slotMeta.categoryId, language);
  const accent = CATEGORY_COLORS[slotMeta.categoryId] ?? categoryColors[slotMeta.categoryId] ?? '#c084fc';
  const accentDark = 'transparent';
  const icon = categoryIcons[slotMeta.categoryId];

  const [animate, setAnimate] = useState(true);
  const [currentCat, setCurrentCat] = useState<QuizCategory>(slotMeta.categoryId);
  const [flip, setFlip] = useState(false);
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    setAnimate(false);
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [slotMeta.categoryId]);

  useEffect(() => {
    if (slotRolling && slotSequence.length > 0) {
      setShowFinal(false);
      let idx = 0;
      setCurrentCat(slotSequence[0]);
      const interval = setInterval(() => {
        idx = (idx + 1) % slotSequence.length;
        setCurrentCat(slotSequence[idx] as QuizCategory);
        setFlip((f) => !f);
      }, spinIntervalMs);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setCurrentCat(slotMeta.categoryId);
        setShowFinal(true);
      }, totalSpinMs);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    setCurrentCat(slotMeta.categoryId);
    setFlip(false);
    setShowFinal(true);
    return undefined;
  }, [slotRolling, slotSequence, slotMeta.categoryId]);

  return (
    <div style={{ ...revealShell, background: accentDark }}>
      <div style={{ ...cardHalo(accent), opacity: animate ? 0.8 : 0, transform: animate ? 'scale(1)' : 'scale(0.95)', transition: 'opacity 360ms ease-out, transform 360ms ease-out' }} />
      <div
        style={{
          ...slotBadgeBig,
          background: slotRolling ? 'rgba(255,255,255,0.92)' : accent,
          color: '#0d0f14',
          borderColor: slotRolling ? 'rgba(0,0,0,0.06)' : `${accent}aa`,
          boxShadow: slotRolling ? '0 16px 34px rgba(0,0,0,0.25)' : `0 20px 40px ${accent}55`,
          opacity: animate ? (exiting ? 0 : 1) : 0,
          transform: animate
            ? `translateY(${exiting ? -60 : 0}px) rotateX(${slotRolling ? 10 : 0}deg) scale(${(slotRolling ? 1.02 : 1) * scale})`
            : `translateY(24px) rotateX(28deg) scale(${0.96 * scale})`,
          transition:
            'opacity 360ms cubic-bezier(0.18, 0.82, 0.22, 1), transform 460ms cubic-bezier(0.18, 0.82, 0.22, 1), box-shadow 320ms ease-out',
          perspective: 800
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, width: '100%', justifyContent: 'center' }}>
          <div
            style={{
              ...revealTitle,
              fontSize: 56,
              transform: flip ? 'translateY(-10px) rotateX(-14deg)' : 'translateY(10px) rotateX(14deg)',
              transition: 'transform 260ms cubic-bezier(0.18, 0.82, 0.22, 1)',
              color: '#0d0f14',
              textAlign: 'center'
            }}
          >
            {getCategoryLabel(currentCat, language)}
          </div>
          {icon && showFinal && (
            <img
              src={icon}
              alt={targetLabel}
              style={{
                ...revealIcon,
                position: 'absolute',
                top: -16,
                right: -16,
                width: 132,
                height: 132,
                transform: animate ? 'scale(1)' : 'scale(0.9)',
                transition: 'transform 380ms ease-out, opacity 320ms ease-out',
                opacity: animate ? 1 : 0
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const revealShell: React.CSSProperties = {
  width: '100%',
  maxWidth: 1100,
  margin: '0 auto',
  textAlign: 'center',
  padding: '40px 16px',
  color: '#e2e8f0',
  position: 'relative',
  border: 'none',
  borderRadius: 28,
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 20,
  marginTop: 20,
  justifyContent: 'center',
  minHeight: '70vh'
};

const revealCard = (accent: string): React.CSSProperties => ({
  display: 'none'
});

const cardHalo = (accent: string): React.CSSProperties => ({
  position: 'absolute',
  inset: '10% 15% auto 15%',
  height: '60%',
  background: `radial-gradient(circle at 50% 50%, ${accent}55, transparent 65%)`,
  filter: 'blur(26px)',
  opacity: 0.9,
  pointerEvents: 'none',
  zIndex: 0
});

const revealHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
  gap: 10
};

const pill: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 800
};

const mechBadge: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 12,
  background: 'rgba(244, 196, 48, 0.18)',
  border: '1px solid rgba(244, 196, 48, 0.35)',
  color: '#fbbf24',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em'
};

const revealBody: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: 18,
  textAlign: 'left',
  minHeight: 140
};

const revealIcon: React.CSSProperties = {
  width: 96,
  height: 96,
  objectFit: 'contain',
  filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.28))'
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  fontSize: 12,
  color: 'rgba(14,18,27,0.85)',
  fontWeight: 800
};

const revealTitle: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: 34,
  lineHeight: 1.2,
  color: '#0f172a',
  fontWeight: 900
};

const revealDesc: React.CSSProperties = {
  margin: 0,
  color: 'rgba(226,232,240,0.8)',
  fontSize: 15,
  maxWidth: 620
};

const revealMetaRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  marginTop: 10,
  flexWrap: 'wrap'
};

const metaBadge: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  fontWeight: 800,
  fontSize: 12,
  color: '#e2e8f0',
  letterSpacing: '0.06em'
};

const slotBadgeBig: React.CSSProperties = {
  padding: '34px 40px',
  borderRadius: 28,
  border: '1px solid rgba(255,255,255,0.12)',
  minHeight: 240,
  minWidth: 560,
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  justifyContent: 'center'
};

const targetLabelStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  marginBottom: 4
};

const targetDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.72)',
  marginBottom: 6
};

const slotCounter: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.7)'
};

const slotMech: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  fontWeight: 700,
  color: '#facc15'
};

export default BeamerSlotView;
