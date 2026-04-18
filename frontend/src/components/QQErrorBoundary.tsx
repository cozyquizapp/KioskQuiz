import { Component, type ReactNode, type ErrorInfo } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '/api';

interface Props {
  children: ReactNode;
  source: string; // z.B. "moderator", "beamer", "team"
  roomCode?: string;
}
interface State {
  hasError: boolean;
  message: string;
}

export default class QQErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || String(err) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportCrash({
      source: this.props.source,
      roomCode: this.props.roomCode,
      kind: 'react',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: 24,
          background: '#0f172a',
          color: '#e2e8f0',
          fontFamily: "'Nunito', system-ui, sans-serif",
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64 }}>😵</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            Moderator-Ansicht ist abgestürzt
          </div>
          <div style={{ fontSize: 15, color: '#94a3b8', maxWidth: 560 }}>
            {this.state.message || 'Unbekannter Fehler.'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', maxWidth: 560 }}>
            Der Fehler wurde automatisch ans Backend gemeldet. Drücke „Neu laden",
            um die Seite wiederherzustellen — der Raum läuft normal weiter.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 12,
              border: 'none',
              background: '#3B82F6',
              color: 'white',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            🔄 Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface CrashPayload {
  source: string;
  roomCode?: string;
  kind: 'react' | 'window' | 'promise';
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
}

export function reportCrash(p: CrashPayload): void {
  try {
    const body = JSON.stringify({
      ...p,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ts: Date.now(),
    });
    // keepalive damit der POST auch bei Page-Unload durchkommt
    fetch(`${API_BASE}/qq/crashReport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // report darf nie selbst werfen
  }
}

let globalHandlersInstalled = false;
export function installGlobalCrashHandlers(source: string, getRoomCode: () => string | undefined): void {
  if (globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  window.addEventListener('error', (ev) => {
    reportCrash({
      source,
      roomCode: getRoomCode(),
      kind: 'window',
      message: ev.message || 'window error',
      stack: ev.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const reason: any = ev.reason;
    reportCrash({
      source,
      roomCode: getRoomCode(),
      kind: 'promise',
      message: reason?.message || String(reason) || 'unhandled rejection',
      stack: reason?.stack,
    });
  });
}
