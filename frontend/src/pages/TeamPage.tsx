import TeamView from '../views/TeamView';

// Team-Seite: keine Raumcode-Eingabe nötig, fester Code für lokale Session
const TeamPage = () => {
  const roomCode = 'MAIN';
  return <TeamView roomCode={roomCode} />;
};

export default TeamPage;
