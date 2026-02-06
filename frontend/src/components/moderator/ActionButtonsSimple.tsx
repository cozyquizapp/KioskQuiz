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
      style={{ ...inputStyle, background: 'var(--ui-button-success)', color: 'var(--ui-button-on-light)', cursor: 'pointer', height: 56, fontSize: 15, border: '1px solid rgba(52, 211, 153, 0.55)' }}
      onClick={onNext}
    >
      Nächste Frage
    </button>
    <button
      style={{ ...inputStyle, background: 'var(--ui-button-warning)', color: '#1f1305', cursor: 'pointer', height: 56, fontSize: 15, border: '1px solid rgba(251, 191, 36, 0.55)' }}
      onClick={onReveal}
    >
      Antworten aufdecken
    </button>
    <button
      style={{ ...inputStyle, background: 'var(--ui-button-info)', color: 'var(--ui-button-on-light)', cursor: 'pointer', height: 56, fontSize: 15, border: '1px solid rgba(99, 229, 255, 0.5)' }}
      onClick={onIntro}
    >
      Intro zeigen
    </button>
    <button
      style={{ ...inputStyle, background: 'var(--ui-button-neutral)', color: 'var(--ui-button-on-dark)', cursor: 'pointer', height: 56, fontSize: 15, border: '1px solid rgba(255, 255, 255, 0.12)' }}
      onClick={onToggleTeleprompter}
    >
      Teleprompter: {teleprompter ? 'An' : 'Aus'}
    </button>
  </section>
);

export default ActionButtonsSimple;
