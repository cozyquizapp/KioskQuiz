"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectControlSocket = exports.connectToRoom = exports.SOCKET_URL = void 0;
var socket_io_client_1 = require("socket.io-client");
// Default: verbinden auf den gleichen Host, Port 4000 (WS-Backend).
// Kann via VITE_SOCKET_URL überschrieben werden, z. B. "http://192.168.178.39:4000".
// Falls VITE_API_BASE gesetzt ist, nutzen wir dessen Host/Port als Fallback.
var apiBase = import.meta.env.VITE_API_BASE || '';
var derivedFromApi = apiBase && apiBase.startsWith('http')
    ? apiBase.replace(/\/api\/?$/, '')
    : null;
exports.SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
    derivedFromApi ||
    "".concat(window.location.protocol, "//").concat(window.location.hostname, ":4000");
var SOCKET_PATH = '/socket.io';
// Stellt eine Socket.IO-Verbindung her und joint den angegebenen Raum
var createSocket = function () {
    return (0, socket_io_client_1.io)(exports.SOCKET_URL, {
        path: SOCKET_PATH,
        transports: ['websocket', 'polling']
    });
};
var connectToRoom = function (roomCode) {
    var socket = createSocket();
    socket.on('connect', function () {
        if (roomCode) {
            socket.emit('joinRoom', roomCode);
        }
    });
    return socket;
};
exports.connectToRoom = connectToRoom;
var connectControlSocket = function () { return createSocket(); };
exports.connectControlSocket = connectControlSocket;
