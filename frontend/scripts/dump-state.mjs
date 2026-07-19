// Liest den echten Room-State via Socket und dumpt die avatarId-Verteilung der Teams.
import { io } from 'socket.io-client';
const s = io('http://localhost:4000', { transports: ['websocket', 'polling'] });
let done = false;
const finish = (st) => {
  if (done) return; done = true;
  if (!st) { console.log('KEIN State erhalten'); process.exit(0); }
  const teams = st.teams ?? [];
  const byAv = {};
  for (const t of teams) byAv[t.avatarId] = (byAv[t.avatarId] || 0) + 1;
  console.log('phase:', st.phase, '| largeGroupMode:', st.largeGroupMode, '| nestedTeams:', st.nestedTeams);
  console.log('teams total:', teams.length);
  console.log('distinct avatarIds:', Object.keys(byAv).length);
  console.log('verteilung:', JSON.stringify(byAv, null, 0));
  console.log('megaQuestionRanking len:', (st.megaQuestionRanking ?? []).length);
  process.exit(0);
};
s.on('connect', () => {
  ['qq:joinBeamer', 'qq:joinRoom', 'qq:subscribe', 'qq:join'].forEach(ev => s.emit(ev, { roomCode: 'default' }));
  s.emit('qq:joinModerator', { roomCode: 'default', pin: '2506' });
});
s.on('qq:stateUpdate', finish);
setTimeout(() => finish(null), 5000);
