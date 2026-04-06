import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { QQStateUpdate, QQAck } from '../../../shared/quarterQuizTypes';

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
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('reconnect_failed', () => setConnected(false));

    socket.on('qq:stateUpdate', (payload: QQStateUpdate) => {
      setState(payload);
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

  return { state, connected, emit };
}
