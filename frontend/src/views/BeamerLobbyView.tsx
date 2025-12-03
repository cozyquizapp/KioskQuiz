import React from 'react';
import { QuizCategory } from '@shared/quizTypes';

type Lang = 'de' | 'en';

type BeamerLobbyViewProps = {
  t: any;
  language: Lang;
  categories: QuizCategory[];
  highlightedCategoryIndex: number;
  categoryColors: Record<string, string>;
  categoryIcons: Record<string, string>;
  categoryProgress: Record<QuizCategory, number>;
  categoryTotals: Record<QuizCategory, number>;
  getCategoryLabel: (key: QuizCategory, lang: Lang) => string;
  getCategoryDescription: (key: QuizCategory, lang: Lang) => string;
};

const BeamerLobbyView: React.FC<BeamerLobbyViewProps> = ({
  t,
  language,
  categories,
  highlightedCategoryIndex,
  categoryColors,
  categoryIcons,
  categoryProgress,
  categoryTotals,
  getCategoryLabel,
  getCategoryDescription
}) => {
  const activeCategory = categories[highlightedCategoryIndex] ?? categories[0];
  const activeLabel = activeCategory ? getCategoryLabel(activeCategory, language) : '';
  const activeDesc = activeCategory ? getCategoryDescription(activeCategory, language) : '';
  const activeColor = activeCategory ? categoryColors[activeCategory] ?? '#f3c367' : '#f3c367';
  const activeIcon = activeCategory ? categoryIcons[activeCategory] : undefined;

  return (
    <div style={shellSingle}>
      <div
        style={{
          ...heroPanel,
          background: 'rgba(10,12,18,0.78)',
          color: '#e2e8f0',
          border: `1px solid ${activeColor}55`,
          boxShadow: `0 24px 52px ${activeColor}33`
        }}
      >
        <p style={{ ...eyebrow }}>{language === 'de' ? 'Eure Kategorien' : 'Your categories'}</p>
        <h1 style={{ ...heroTitle }}>{t.lobbySubtitle}</h1>

        <div
          style={{
            ...activeCard,
            borderColor: `${activeColor}88`,
            boxShadow: `0 22px 52px ${activeColor}33`,
            background: 'rgba(0,0,0,0.25)',
            color: '#e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {activeIcon && <img src={activeIcon} alt={activeLabel} style={activeIconStyle} />}
            <div>
              <div style={{ ...pill, background: `${activeColor}33`, borderColor: `${activeColor}55`, color: '#ffffff' }}>
                {language === 'de' ? 'Kategorie' : 'Category'}
              </div>
              <div style={{ ...activeLabelStyle, color: '#ffffff', textShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                {activeLabel}
              </div>
            </div>
          </div>
          <div style={{ ...activeDescStyle, fontSize: 20, lineHeight: 1.5, color: '#e2e8f0' }}>{activeDesc}</div>
        </div>

        <div style={categoryList}>
          {categories.map((cat, index) => {
            const isActive = index === highlightedCategoryIndex;
            const color = categoryColors[cat] ?? '#1e293b';
            const used = categoryProgress[cat] ?? 0;
            const total = categoryTotals[cat] ?? 5;
            const icon = categoryIcons[cat];

            return (
              <div
                key={cat}
                style={{
                  ...categoryRow,
                  borderColor: isActive ? `${color}aa` : `${color}44`,
                  background: isActive ? `${color}70` : `${color}1f`,
                  boxShadow: isActive ? `0 12px 28px ${color}50` : 'none',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ ...categorySwatch, background: color }} />
                  <div style={{ ...iconCircle, boxShadow: `0 10px 20px ${color}30` }}>
                    {icon ? <img src={icon} alt={cat} style={iconImg} /> : <span>?</span>}
                  </div>
                  <div>
                    <div style={{ ...categoryTitle, color: '#ffffff' }}>{getCategoryLabel(cat, language)}</div>
                  </div>
                </div>
                <div style={progressWrap}>
                  <div
                    style={{
                      ...progressBar,
                      width: `${(Math.min(used, total) / total) * 100}%`,
                      background: isActive ? '#0d0f14' : color,
                      boxShadow: `0 0 12px ${color}40`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const shellSingle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

const heroPanel: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 22px 52px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(14px)'
};

const heroTitle: React.CSSProperties = {
  margin: '6px 0 12px',
  fontSize: 28,
  lineHeight: 1.3
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  fontSize: 12,
  color: 'rgba(255,255,255,0.7)'
};

const chipsRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 8
};

const statusChip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 10px',
  borderRadius: 999,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: 12,
  fontWeight: 700
};

const activeCard: React.CSSProperties = {
  marginTop: 12,
  padding: 14,
  borderRadius: 14,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)'
};

const pill: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: 11,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  fontWeight: 800,
  display: 'inline-flex',
  marginBottom: 6
};

const activeLabelStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  margin: '0 0 4px'
};

const activeDescStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.74)',
  fontSize: 20,
  lineHeight: 1.6
};

const activeIconStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  objectFit: 'contain',
  filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.35))'
};

const categoryPanel: React.CSSProperties = {
  padding: 16,
  borderRadius: 20,
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  backdropFilter: 'none'
};

const eyebrowSmall: React.CSSProperties = {
  ...eyebrow,
  fontSize: 11,
  marginBottom: 8
};

const categoryList: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10
};

const categoryRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.06)'
};

const categorySwatch: React.CSSProperties = {
  width: 8,
  height: 38,
  borderRadius: 8
};

const iconCircle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: '50%',
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
  overflow: 'hidden'
};

const iconImg: React.CSSProperties = {
  width: 32,
  height: 32,
  objectFit: 'contain'
};

const categoryTitle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 14,
  marginBottom: 2
};

const categoryDesc: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.7)'
};

const progressWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 120
};

const progressBar: React.CSSProperties = {
  height: 6,
  borderRadius: 999,
  background: '#22c55e',
  flex: 1,
  transition: 'width 0.2s ease',
  boxShadow: '0 0 12px rgba(255,255,255,0.3)'
};

const progressText: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800
};

export default BeamerLobbyView;
