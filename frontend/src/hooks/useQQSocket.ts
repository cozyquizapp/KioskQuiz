import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { QQStateUpdate, QQAck, qqTeamColor } from '../../../shared/quarterQuizTypes';

/** Überschreibt team.color mit der Live-Ring-Farbe aus QQ_AVATARS.
 *  Grund: team.color wird beim Beitritt gespeichert; wenn die Palette
 *  später angepasst wird, hängen alte Runs mit stale Hex fest. Hier
 *  einmalig am Socket-Ingress normalisieren → alle Views profitieren. */
function normalizeState(s: QQStateUpdate): QQStateUpdate {
  return { ...s, teams: s.teams.map(t => ({ ...t, color: qqTeamColor(t) })) };
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (() => {
  const { protocol, hostname } = window.location;
  const isLocal = hostname === 'localhost' || hostname.startsWith('127.');
  return isLocal ? `${protocol}//${hostname}:4000` : window.location.origin;
})();

export function useQQSocket(roomCode: string) {
  const [state, setState]       = useState<QQStateUpdate | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const socket = io(SOCKET_URL, {
      // Erst WebSocket, Fallback auf Long-Polling — robuster bei Proxy/WLAN-Glitches
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
      reconnectionAttempts: Infinity,
      timeout: 15000,
    });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('reconnect_failed', () => setConnected(false));

    socket.on('qq:stateUpdate', (payload: QQStateUpdate) => {
      setState(normalizeState(payload));
    });

    return () => {
      socket.off('qq:stateUpdate');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode]);

  function emit(event: string, payload?: unknown): Promise<QQAck> {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ ok: false, error: 'Nicht verbunden', code: 'NOT_CONNECTED' });
        return;
      }
      const timeout = setTimeout(() => {
        resolve({ ok: false, error: 'Zeitüberschreitung', code: 'TIMEOUT' });
      }, 10000);
      socketRef.current.emit(event, payload, (ack: QQAck) => {
        clearTimeout(timeout);
        resolve(ack ?? { ok: true });
      });
    });
  }

  /** Force a manual reconnect (drops current socket and creates a fresh connection). */
  function reconnect() {
    const s = socketRef.current;
    if (!s) return;
    if (s.connected) return; // already connected
    s.disconnect();
    s.connect();
  }

  return { state, connected, emit, reconnect, socketRef };
}
