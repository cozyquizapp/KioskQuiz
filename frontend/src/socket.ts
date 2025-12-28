import { io, Socket } from 'socket.io-client';

// Default: verbinden auf den gleichen Host, Port 4000 (WS-Backend).
// Kann via VITE_SOCKET_URL überschrieben werden, z. B. "http://192.168.178.39:4000".
// Falls VITE_API_BASE gesetzt ist, nutzen wir dessen Host/Port als Fallback.
const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) || '';
const derivedFromApi =
  apiBase && apiBase.startsWith('http')
    ? apiBase.replace(/\/api\/?$/, '')
    : null;

export const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ||
  derivedFromApi ||
  `${window.location.protocol}//${window.location.hostname}:4000`;

const SOCKET_PATH = '/socket.io';

// Stellt eine Socket.IO-Verbindung her und joint den angegebenen Raum
const createSocket = () =>
  io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['websocket', 'polling']
  });

export const connectToRoom = (roomCode?: string): Socket => {
  const socket = createSocket();
  socket.on('connect', () => {
    if (roomCode) {
      socket.emit('joinRoom', roomCode);
    }
  });
  return socket;
};

export const connectControlSocket = (): Socket => createSocket();
