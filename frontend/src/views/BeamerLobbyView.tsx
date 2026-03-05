import React from 'react';
import { QuizCategory, Language } from '@shared/quizTypes';
import BilingualLabel from '../components/BilingualLabel.tsx';
import { DESIGN_SYSTEM } from '../config/designSystem';

type Lang = Language;

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
  const activeColor = activeCategory ? categoryColors[activeCategory] ?? '#1565C0' : '#1565C0';
  const activeIcon = activeCategory ? categoryIcons[activeCategory] : undefined;

  return (
    <div style={shellSingle}>
      <div style={heroPanel}>
        <BilingualLabel 
          en="YOUR CATEGORIES" 
          de="Eure Kategorien"
          variant="badge"
          primaryColor="#94a3b8"
          secondaryColor="rgba(255, 255, 255, 0.6)"
          style={{
            marginBottom: 8
          }}
        />
        <h1 style={heroTitle}>{t.lobbySubtitle}</h1>

        <div style={activeCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {activeIcon && <img src={activeIcon} alt={activeLabel} style={activeIconStyle} />}
            <div>
              <BilingualLabel 
                en="CATEGORY" 
                de="Kategorie"
                variant="badge"
                primaryColor={activeColor}
                secondaryColor={activeColor}
                style={{ marginBottom: 6 }}
              />
              <div style={activeLabelStyle}>{activeLabel}</div>
            </div>
          </div>
          <div style={activeDescStyle}>{activeDesc}</div>
        </div>

        <div style={categoryList}>
          {categories.map((cat, index) => {
            const isActive = index === highlightedCategoryIndex;
            const color = categoryColors[cat] ?? '#1565C0';
            const used = categoryProgress[cat] ?? 0;
            const total = categoryTotals[cat] ?? 5;
            const icon = categoryIcons[cat];

            return (
              <div
                key={cat}
                style={{
                  ...categoryRow,
                  borderColor: isActive ? color : 'rgba(255,255,255,0.08)',
                  borderLeftColor: color,
                  background: isActive ? `${color}18` : '#1a2035',
                  boxShadow: isActive ? `0 3px 0 ${color}` : '0 2px 0 rgba(0,0,0,0.5)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ ...iconCircle, boxShadow: `0 3px 0 ${color}44` }}>
                    {icon ? <img src={icon} alt={cat} style={iconImg} /> : <span>?</span>}
                  </div>
                  <div>
                    <div style={{ ...categoryTitle, color: isActive ? color : '#f1f5f9' }}>
                      {getCategoryLabel(cat, language)}
                    </div>
                  </div>
                </div>
                <div style={progressWrap}>
                  <div style={{ ...progressTrack }}>
                    <div
                      style={{
                        ...progressBar,
                        width: `${(Math.min(used, total) / total) * 100}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span style={{ ...progressLabel, color: isActive ? color : '#94a3b8' }}>
                    {used}/{total}
                  </span>
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
  alignItems: 'flex-start',
};

const heroPanel: React.CSSProperties = {
  width: '100%',
  padding: '16px 20px',
  borderRadius: 20,
  background: '#1a2035',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 0 rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const heroTitle: React.CSSProperties = {
  margin: '0 0 4px',
  fontFamily: 'var(--font-game)',
  fontSize: 'clamp(28px, 3.5vw, 48px)',
  fontWeight: 700,
  letterSpacing: '0.02em',
  color: '#f1f5f9',
};

const activeCard: React.CSSProperties = {
  padding: 16,
  borderRadius: 14,
  background: '#1e2a45',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 3px 0 rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const activeLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-game)',
  fontSize: 'clamp(22px, 2.8vw, 36px)',
  fontWeight: 700,
  color: '#f1f5f9',
  margin: '0 0 2px',
};

const activeDescStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-game)',
  color: '#94a3b8',
  fontSize: 18,
  lineHeight: 1.5,
};

const activeIconStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  objectFit: 'contain',
  flexShrink: 0,
};

const categoryList: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const categoryRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  borderLeft: '5px solid #3B82F6',
};

const iconCircle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: '#1e2a45',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  flexShrink: 0,
};

const iconImg: React.CSSProperties = {
  width: 28,
  height: 28,
  objectFit: 'contain',
};

const categoryTitle: React.CSSProperties = {
  fontFamily: 'var(--font-game)',
  fontWeight: 700,
  fontSize: 18,
};

const progressWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 100,
};

const progressTrack: React.CSSProperties = {
  flex: 1,
  height: 8,
  borderRadius: 999,
  background: '#1e2a45',
  overflow: 'hidden',
};

const progressBar: React.CSSProperties = {
  height: '100%',
  borderRadius: 999,
  transition: 'width 0.3s ease',
};

const progressLabel: React.CSSProperties = {
  fontFamily: 'var(--font-game)',
  fontSize: 14,
  fontWeight: 700,
  minWidth: 36,
  textAlign: 'right',
};

export default BeamerLobbyView;
