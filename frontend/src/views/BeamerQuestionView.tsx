import * as React from 'react';
import { AnyQuestion } from '@shared/quizTypes';
import { QuestionMeta } from '../api';

type BeamerQuestionViewProps = {
  showCalculating: boolean;
  showAnswer: boolean;
  categoryLabel: string;
  questionMeta: QuestionMeta | null;
  timerText: string;
  progress: number;
  hasTimer: boolean;
  question: AnyQuestion | null;
  questionText: string | null | undefined;
  t: any;
  solution: string | undefined;
  footerMeta: string | null | undefined;
  cardColor?: string;
  leftDecorationSrc?: string;
  rightDecorationSrc?: string;
};

const BeamerQuestionView: React.FC<BeamerQuestionViewProps> = ({
  showCalculating,
  showAnswer,
  categoryLabel,
  questionMeta,
  timerText,
  progress,
  hasTimer,
  question,
  questionText,
  t,
  solution,
  footerMeta,
  cardColor = '#e1b75d',
  leftDecorationSrc,
  rightDecorationSrc
}) => {
  const layout = (question as any)?.layout || { imageOffsetX: 0, imageOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0 };
  const imageSrc = (question as any)?.imageUrl || (question as any)?.media?.url;

  const footerLabel =
    questionMeta != null
      ? t.footerMeta(
          questionMeta.globalIndex,
          questionMeta.globalTotal,
          categoryLabel ? categoryLabel.toUpperCase() : '?',
          questionMeta.categoryIndex,
          questionMeta.categoryTotal
        )
      : footerMeta ?? '';

  const gradient = 'rgba(10,12,18,0.8)';

  const progressText = footerLabel;

  const isTimeUp =
    timerText?.toLowerCase().includes('abgelaufen') || timerText?.toLowerCase().includes("time's up") || showAnswer;

  const statusLabel = showCalculating
    ? t.calculating
    : showAnswer || isTimeUp
    ? t.timeUp
    : hasTimer
    ? timerText
    : t.noTimer;

  return (
    <section style={sectionStyle}>
      {leftDecorationSrc && <img src={leftDecorationSrc} alt="" style={decorationLeft} />}
      {rightDecorationSrc && <img src={rightDecorationSrc} alt="" style={decorationRight} />}
      <div style={{ ...cardStyle, background: gradient, borderColor: `${cardColor}88`, boxShadow: `0 28px 72px ${cardColor}3a` }}>
        <div style={{ ...cardGlow, background: `radial-gradient(circle at 25% 30%, ${cardColor}2e, transparent 60%), radial-gradient(circle at 80% 20%, ${cardColor}22, transparent 60%)` }} />
        <div style={{ ...accentStrip, background: `linear-gradient(180deg, ${cardColor}, ${cardColor}cc)` }} />

        <div style={headerRow}>
          <div style={{ ...pill, background: `${cardColor}33`, borderColor: `${cardColor}66`, color: '#f8fafc' }}>
            {categoryLabel || t.waitingForQuestion}
          </div>
          <div style={isTimeUp ? statusPillDangerStyle(cardColor) : pillAltStyle(cardColor)}>{statusLabel}</div>
        </div>

        <h1 style={titleStyle}>{questionText ?? t.waitingForQuestion}</h1>

        {hasTimer && (
          <div style={barOuter}>
            <div style={{ ...barInnerStyle(cardColor), width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
          </div>
        )}

        {imageSrc && (
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <img
              src={imageSrc}
              alt="Fragebild"
              style={{
                maxWidth: '70%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 18,
                border: `1px solid ${cardColor}55`,
                boxShadow: `0 20px 36px ${cardColor}33`,
                transform: `translate(${layout.imageOffsetX ?? 0}px, ${layout.imageOffsetY ?? 0}px)`
              }}
            />
          </div>
        )}

        {showAnswer && (
          <div style={answerBlock}>
            <div style={answerLabel}>{t.answerLabel}</div>
            <div style={answerText}>{solution ?? t.answerFallback}</div>
          </div>
        )}

        {progressText && (
          <div style={footerRow}>
            <div style={footerPill}>{progressText}</div>
          </div>
        )}
      </div>
    </section>
  );
};

const sectionStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 10px',
  minHeight: '70vh'
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 1100,
  borderRadius: 30,
  padding: '26px 28px 36px',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#f8fafc',
  boxShadow: 'var(--glass-shadow)',
  overflow: 'hidden',
  backdropFilter: 'blur(10px)'
};

const cardGlow: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle at 30% 30%, rgba(0,0,0,0.08), transparent 42%), radial-gradient(circle at 80% 20%, rgba(0,0,0,0.04), transparent 45%)',
  opacity: 0.5,
  pointerEvents: 'none'
};

const accentStrip: React.CSSProperties = {
  position: 'absolute',
  left: 18,
  top: 18,
  width: 10,
  height: 70,
  borderRadius: 999,
  filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.35))'
};

const headerRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  marginBottom: 12
};

const pill: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontSize: 12,
  boxShadow: '0 6px 16px rgba(0,0,0,0.18)'
};

const pillAltStyle = (color: string): React.CSSProperties => ({
  ...pill,
  background: 'rgba(15,23,42,0.7)',
  color: '#f8fafc',
  border: `1px solid ${color}66`
});

const statusPillDangerStyle = (color: string): React.CSSProperties => ({
  ...pill,
  background: 'rgba(220, 38, 38, 0.2)',
  border: '1px solid rgba(239, 68, 68, 0.6)',
  color: '#fecdd3',
  boxShadow: `0 0 12px ${color}55`
});

const titleStyle: React.CSSProperties = {
  margin: '8px 0 14px',
  fontSize: 36,
  lineHeight: 1.2,
  color: '#f8fafc',
  textShadow: '0 6px 18px rgba(0,0,0,0.28)'
};

const barOuter: React.CSSProperties = {
  width: '100%',
  height: 12,
  borderRadius: 999,
  background: 'rgba(0,0,0,0.12)',
  overflow: 'hidden',
  marginBottom: 12,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)'
};

const barInnerStyle = (color: string): React.CSSProperties => ({
  height: '100%',
  background: color,
  borderRadius: 999,
  transition: 'width 0.2s ease',
  boxShadow: `0 0 14px ${color}55`
});

const chipMuted: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '10px 12px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.8)',
  color: '#0f172a',
  fontWeight: 700,
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
};

const answerBlock: React.CSSProperties = {
  marginTop: 6,
  padding: '12px 14px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.9)',
  boxShadow: '0 16px 36px rgba(0,0,0,0.25)'
};

const answerLabel: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  fontWeight: 800,
  fontSize: 11,
  color: '#6b7280'
};

const answerText: React.CSSProperties = {
  marginTop: 6,
  fontSize: 24,
  fontWeight: 800,
  color: '#0f172a'
};

const footerRow: React.CSSProperties = {
  marginTop: 14,
  display: 'flex',
  justifyContent: 'flex-start'
};

const footerPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(15, 23, 42, 0.8)',
  color: '#e2e8f0',
  padding: '10px 18px',
  borderRadius: 14,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.06em',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 10px 20px rgba(0,0,0,0.18)'
};

const decorationLeft: React.CSSProperties = {
  position: 'absolute',
  left: -60,
  top: 0,
  height: 260,
  opacity: 0.14,
  filter: 'blur(1px)'
};

const decorationRight: React.CSSProperties = {
  position: 'absolute',
  right: -40,
  top: 30,
  height: 220,
  opacity: 0.18,
  filter: 'blur(1px)'
};

export default BeamerQuestionView;





