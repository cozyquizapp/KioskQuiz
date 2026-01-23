import React, { useState, useEffect } from 'react';
import { LobbyStats, FastestAnswer, FunnyAnswer, CommonWrongAnswer } from '@shared/quizTypes';

type Lang = 'de' | 'en';

interface LobbyStatsDisplayProps {
  roomCode: string;
  language: Lang;
}

export const LobbyStatsDisplay: React.FC<LobbyStatsDisplayProps> = ({ roomCode, language }) => {
  const [stats, setStats] = useState<LobbyStats | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch stats every 5 seconds
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rooms/${roomCode}/lobby-stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch lobby stats:', err);
      }
      setLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [roomCode]);

  // Rotate through stats every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  if (!stats || (stats.fastestAnswers.length === 0 && stats.funnyAnswers.length === 0 && stats.commonWrongAnswers.length === 0)) {
    return null;
  }

  const renderFastest = () => {
    if (stats.fastestAnswers.length === 0) return null;
    const fastest = stats.fastestAnswers[0];
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={iconStyle}>⚡</span>
          <span>{language === 'de' ? 'BLITZSCHNELL' : 'LIGHTNING FAST'}</span>
        </div>
        <div style={contentStyle}>
          <div style={metricStyle}>{Math.round(fastest.timeMs)}ms</div>
          <div style={teamStyle}>{fastest.teamName}</div>
          <div style={answerStyle}>„{fastest.answer}"</div>
        </div>
        <div style={footerStyle}>{fastest.questionText.substring(0, 50)}{fastest.questionText.length > 50 ? '...' : ''}</div>
      </div>
    );
  };

  const renderFunny = () => {
    if (stats.funnyAnswers.length === 0) return null;
    const funny = stats.funnyAnswers[0];
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={iconStyle}>😂</span>
          <span>{language === 'de' ? 'LUSTIGSTE ANTWORT' : 'FUNNIEST ANSWER'}</span>
        </div>
        <div style={contentStyle}>
          <div style={questionStyle}>{funny.questionText}</div>
          <div style={arrowStyle}>→</div>
          <div style={answerLargeStyle}>„{funny.answer}"</div>
          <div style={teamStyle}>{funny.teamName}</div>
        </div>
      </div>
    );
  };

  const renderWrongAnswers = () => {
    if (stats.commonWrongAnswers.length === 0) return null;
    const wrong = stats.commonWrongAnswers[0];
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={iconStyle}>❌</span>
          <span>{language === 'de' ? 'HÄUFIGER FEHLER' : 'COMMON MISTAKE'}</span>
        </div>
        <div style={contentStyle}>
          <div style={questionStyle}>{wrong.questionText}</div>
          <div style={arrowStyle}>→</div>
          <div style={answerLargeStyle}>„{wrong.answer}"</div>
          <div style={countStyle}>
            {wrong.count}x {language === 'de' ? 'gewählt' : 'chosen'}
          </div>
        </div>
      </div>
    );
  };

  const sections = [
    { render: renderFastest, available: stats.fastestAnswers.length > 0 },
    { render: renderFunny, available: stats.funnyAnswers.length > 0 },
    { render: renderWrongAnswers, available: stats.commonWrongAnswers.length > 0 }
  ];

  const availableSections = sections.filter(s => s.available);
  if (availableSections.length === 0) return null;

  const currentSection = availableSections[currentIndex % availableSections.length];

  return (
    <div style={wrapperStyle}>
      {currentSection.render()}
      <div style={dotsStyle}>
        {availableSections.map((_, idx) => (
          <div
            key={idx}
            style={{
              ...dotStyle,
              opacity: idx === currentIndex % availableSections.length ? 1 : 0.3
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Styles
const wrapperStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  width: 380,
  zIndex: 30,
  animation: 'fadeIn 0.5s ease-in-out'
};

const containerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 16,
  padding: 18,
  backdropFilter: 'blur(20px)',
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  color: '#e2e8f0',
  animation: 'slideIn 0.4s ease-out'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: '#94a3b8',
  marginBottom: 12,
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  paddingBottom: 10
};

const iconStyle: React.CSSProperties = {
  fontSize: 18,
  display: 'inline-block'
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10
};

const metricStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  color: '#22d3ee',
  lineHeight: 1
};

const questionStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#cbd5e1',
  fontStyle: 'italic',
  lineHeight: 1.4
};

const arrowStyle: React.CSSProperties = {
  fontSize: 20,
  color: '#94a3b8',
  textAlign: 'center',
  margin: '4px 0'
};

const answerStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#fbbf24',
  lineHeight: 1.4
};

const answerLargeStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#f87171',
  lineHeight: 1.4,
  marginBottom: 4
};

const teamStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#22d3ee',
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const countStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#f87171',
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const footerStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#64748b',
  marginTop: 8,
  paddingTop: 8,
  borderTop: '1px solid rgba(255,255,255,0.05)',
  fontStyle: 'italic'
};

const dotsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 6,
  marginTop: 10
};

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#22d3ee',
  transition: 'opacity 0.3s ease'
};
