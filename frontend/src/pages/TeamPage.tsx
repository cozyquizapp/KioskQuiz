import React, { useState } from 'react';
import TeamView from '../views/TeamView';

class ErrorCatcher extends React.Component<{ onError: (err: Error) => void; children: React.ReactNode }> {
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.props.children;
  }
}

// einfacher Error Boundary für TeamView
const TeamBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);
  if (error) {
    return (
      <div style={{ padding: 20, color: '#e2e8f0', background: '#0b0d14', minHeight: '100vh' }}>
        <h2>Etwas ist schiefgelaufen.</h2>
        <p>{error.message}</p>
        <button
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            color: '#e2e8f0',
            cursor: 'pointer'
          }}
          onClick={() => window.location.reload()}
        >
          Neu laden
        </button>
      </div>
    );
  }
  return (
    <ErrorCatcher onError={setError}>
      {children}
    </ErrorCatcher>
  );
};

// Team-Seite: keine Raumcode-Eingabe nötig, fester Code für lokale Session
const TeamPage = () => {
  const roomCode = 'MAIN';
  return (
    <TeamBoundary>
      <TeamView roomCode={roomCode} />
    </TeamBoundary>
  );
};

export default TeamPage;
