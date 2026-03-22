import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
}

export default class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 120,
          color: '#94a3b8',
          fontSize: 14,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
        }}>
          🗺️ Karte konnte nicht geladen werden
        </div>
      );
    }
    return this.props.children;
  }
}
