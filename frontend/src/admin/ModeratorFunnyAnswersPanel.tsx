import React, { useState, useEffect } from 'react';
import { LobbyStats, FastestAnswer, FunnyAnswer } from '@shared/quizTypes';

interface ModeratorFunnyAnswersProps {
  roomCode: string;
  language: 'de' | 'en';
}

export const ModeratorFunnyAnswersPanel: React.FC<ModeratorFunnyAnswersProps> = ({ roomCode, language }) => {
  const [stats, setStats] = useState<LobbyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Set<string>>(new Set());

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/lobby-stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [roomCode]);

  const markAssFunny = async (teamName: string, questionId: string, answer: string) => {
    try {
      const token = sessionStorage.getItem(`admin-token-${roomCode}`);
      const url = token
        ? `/api/rooms/${roomCode}/mark-funny?token=${encodeURIComponent(token)}`
        : `/api/rooms/${roomCode}/mark-funny`;
        
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName, questionId, answer })
      });
      if (res.ok) {
        const updated = await res.json();
        setStats(updated.stats);
        const key = `${questionId}-${teamName}`;
        const newSelected = new Set(selectedAnswers);
        newSelected.add(key);
        setSelectedAnswers(newSelected);
      }
    } catch (err) {
      console.error('Failed to mark as funny:', err);
    }
  };

  if (!stats) return null;

  const allAnswers = [
    ...stats.fastestAnswers.slice(0, 3).map(a => ({
      type: 'fastest' as const,
      data: a,
      label: `⚡ ${a.timeMs}ms - ${a.teamName}`
    })),
    ...stats.commonWrongAnswers.slice(0, 3).map(a => ({
      type: 'wrong' as const,
      data: a,
      label: `❌ ${a.count}x - ${a.answer}`
    }))
  ];

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        {language === 'de' ? '😂 Lustige Antworten markieren' : '😂 Mark Funny Answers'}
      </div>

      <div style={contentStyle}>
        {allAnswers.length === 0 ? (
          <div style={emptyStyle}>
            {language === 'de' ? 'Noch keine Antworten' : 'No answers yet'}
          </div>
        ) : (
          <div style={listStyle}>
            {allAnswers.map((item, idx) => {
              if (item.type === 'fastest') {
                const a = item.data as FastestAnswer;
                const key = `${a.questionId}-${a.teamName}`;
                const isSelected = selectedAnswers.has(key);
                return (
                  <div key={idx} style={itemStyle}>
                    <div style={itemHeaderStyle}>
                      <span style={labelStyle}>{a.teamName}</span>
                      <span style={timeStyle}>{a.timeMs}ms</span>
                    </div>
                    <div style={answerStyle}>„{a.answer}"</div>
                    <button
                      onClick={() => markAssFunny(a.teamName, a.questionId, String(a.answer))}
                      style={{
                        ...markButtonStyle,
                        opacity: isSelected ? 0.5 : 1,
                        cursor: isSelected ? 'default' : 'pointer'
                      }}
                      disabled={isSelected}
                    >
                      {isSelected ? '✓ Markiert' : language === 'de' ? 'Markieren' : 'Mark'}
                    </button>
                  </div>
                );
              } else {
                const a = item.data as FastestAnswer | FunnyAnswer | any;
                return (
                  <div key={idx} style={itemStyle}>
                    <div style={itemHeaderStyle}>
                      <span style={labelStyle}>{a.count}x gewählt</span>
                    </div>
                    <div style={answerStyle}>„{a.answer}"</div>
                    <button
                      onClick={() => markAssFunny('', a.questionId, a.answer)}
                      style={markButtonStyle}
                    >
                      {language === 'de' ? 'Markieren' : 'Mark'}
                    </button>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      <div style={refreshButtonStyle}>
        <button
          onClick={fetchStats}
          disabled={loading}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            background: '#22c55e',
            color: '#0b1020',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          {loading ? '...' : language === 'de' ? 'Aktualisieren' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

// Styles
const panelStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.5)',
  border: '1px solid rgba(136,197,244,0.3)',
  borderRadius: 12,
  padding: 14,
  marginTop: 12,
  backdropFilter: 'blur(10px)'
};

const headerStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: '#e2e8f0',
  marginBottom: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8
};

const emptyStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  fontStyle: 'italic',
  padding: '8px 0'
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 250,
  overflowY: 'auto'
};

const itemStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 6
};

const itemHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#22d3ee',
  textTransform: 'uppercase',
  letterSpacing: '0.06em'
};

const timeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#fbbf24',
  background: 'rgba(251,191,36,0.1)',
  padding: '2px 6px',
  borderRadius: 4
};

const answerStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#cbd5e1',
  fontStyle: 'italic'
};

const markButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 4,
  border: '1px solid rgba(136,197,244,0.4)',
  background: 'rgba(136,197,244,0.15)',
  color: '#88c5f4',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const refreshButtonStyle: React.CSSProperties = {
  marginTop: 10,
  textAlign: 'center'
};
