import React from 'react';

type TimerCardProps = {
  timerSeconds: number;
  onChange: (value: number) => void;
  onStart: () => void;
  onStop: () => void;
  cardStyle: React.CSSProperties;
  buttonStyle: React.CSSProperties;
};

const TimerCard: React.FC<TimerCardProps> = ({ timerSeconds, onChange, onStart, onStop, cardStyle, buttonStyle }) => (
  <div style={cardStyle}>
    <div style={{ fontWeight: 800, marginBottom: 6 }}>Timer</div>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="number"
        value={timerSeconds}
        min={5}
        max={180}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...buttonStyle, background: '#0f172a', color: '#e5e7eb' }}
      />
      <button style={{ ...buttonStyle, background: '#4ade80', color: '#0d0f14', cursor: 'pointer' }} onClick={onStart}>
        Starten
      </button>
      <button style={{ ...buttonStyle, background: '#f87171', color: '#0d0f14', cursor: 'pointer' }} onClick={onStop}>
        Stoppen
      </button>
    </div>
  </div>
);

export default TimerCard;
