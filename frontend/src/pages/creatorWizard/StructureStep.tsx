import React from 'react';
import { QuizCategory } from '@shared/quizTypes';
import { categoryColors } from '../../categoryColors';
import { categoryIcons } from '../../categoryAssets';

type Props = {
  cardStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  quizName: string;
  language: 'de' | 'en' | 'both';
  defaultTimer: number;
  categoryCount: Record<QuizCategory, number>;
  catList: QuizCategory[];
  catLabel: Record<QuizCategory, string>;
  onChangeName: (v: string) => void;
  onChangeLanguage: (v: 'de' | 'en' | 'both') => void;
  onChangeTimer: (v: number) => void;
};

const StructureStep: React.FC<Props> = ({
  cardStyle,
  inputStyle,
  quizName,
  language,
  defaultTimer,
  categoryCount,
  catList,
  catLabel,
  onChangeName,
  onChangeLanguage,
  onChangeTimer
}) => {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Quiz-Name</div>
            <input style={inputStyle} value={quizName} onChange={(e) => onChangeName(e.target.value)} />
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Sprache</div>
            <select
              style={{ ...inputStyle, background: '#101420', color: '#f8fafc' }}
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as 'de' | 'en' | 'both')}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="both">Deutsch + English</option>
            </select>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Standard-Timer (Sek.)</div>
            <input
              type="number"
              style={inputStyle}
              value={defaultTimer}
              min={5}
              max={120}
              onChange={(e) => onChangeTimer(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Kategorien & Verteilung</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {catList.map((cat) => (
            <div
              key={cat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: `${categoryColors[cat]}22`,
                border: `1px solid ${categoryColors[cat]}55`,
                color: '#0d0f14'
              }}
            >
              <img src={categoryIcons[cat]} alt={cat} style={{ width: 20, height: 20 }} />
              <span>{catLabel[cat]}</span>
              <span style={{ marginLeft: 8, fontWeight: 800 }}>{categoryCount[cat] || 0}/5</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StructureStep;
