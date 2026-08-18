/**
 * setRoomTheme — setzt das Buehnen-Design fuer einen Lauf.
 *
 * WICHTIG: `qq:setTheme` ist Moderator-gegated. Ohne vorheriges
 * `qq:joinModerator` mit PIN antwortet der Server mit
 * {ok:false, code:'NOT_AUTHORIZED'} — und wer die Ack nicht prueft, glaubt,
 * das Theme sei gesetzt, und vergleicht hinterher zwei identische Videos.
 * Genau das ist am 2026-08-18 passiert. Deshalb: Ack pruefen, sonst werfen.
 */
export async function setRoomTheme(themeId, { roomCode = 'default', url = 'http://localhost:4000', pin = process.env.ADMIN_PIN || '2506' } = {}) {
  const { createRequire } = await import('node:module');
  const req = createRequire(new URL('../frontend/package.json', import.meta.url));
  const { io } = req('socket.io-client');
  return new Promise((resolve, reject) => {
    const sock = io(url, { transports: ['websocket', 'polling'] });
    const fail = setTimeout(() => { sock.close(); reject(new Error('Socket-Timeout beim Theme-Setzen')); }, 10000);
    const done = (err, val) => { clearTimeout(fail); sock.close(); err ? reject(err) : resolve(val); };
    sock.on('connect_error', (e) => done(new Error('Socket-Fehler: ' + e.message)));
    sock.on('connect', () => {
      sock.emit('qq:joinModerator', { roomCode, pin }, (joinAck) => {
        if (joinAck && joinAck.ok === false) return done(new Error('joinModerator: ' + joinAck.error));
        sock.emit('qq:setTheme', { roomCode, themeId }, (ack) => {
          if (ack && ack.ok === false) return done(new Error(`setTheme(${themeId}) abgelehnt: ${ack.error} [${ack.code}]`));
          done(null, themeId);
        });
      });
    });
  });
}
