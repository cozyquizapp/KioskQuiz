import React from 'react';

type ActionButtonsSimpleProps = {
  onNext: () => void;
  onReveal: () => void;
  onIntro: () => void;
  teleprompter: boolean;
  onToggleTeleprompter: () => void;
  inputStyle: React.CSSProperties;
  containerStyle: React.CSSProperties;
};

const ActionButtonsSimple: React.FC<ActionButtonsSimpleProps> = ({
  onNext,
  onReveal,
  onIntro,
  teleprompter,
  onToggleTeleprompter,
  inputStyle,
  containerStyle
}) => (
  <section
    style={{
      marginTop: 10,
      ...containerStyle,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 10
    }}
  >
    <button
      style={{ ...inputStyle, background: '#4ade80', color: '#0d0f14', cursor: 'pointer', height: 56, fontSize: 15 }}
      onClick={onNext}
    >
      Nächste Frage
    </button>
    <button
      style={{ ...inputStyle, background: '#fbbf24', color: '#0d0f14', cursor: 'pointer', height: 56, fontSize: 15 }}
      onClick={onReveal}
    >
      Antworten aufdecken
    </button>
    <button
      style={{ ...inputStyle, background: '#6dd5fa', color: '#0d0f14', cursor: 'pointer', height: 56, fontSize: 15 }}
      onClick={onIntro}
    >
      Intro zeigen
    </button>
    <button
      style={{ ...inputStyle, background: '#1f2937', color: '#f8fafc', cursor: 'pointer', height: 56, fontSize: 15 }}
      onClick={onToggleTeleprompter}
    >
      Teleprompter: {teleprompter ? 'An' : 'Aus'}
    </button>
  </section>
);

export default ActionButtonsSimple;
