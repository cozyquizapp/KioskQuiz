import AdminView from '../views/AdminView';

// Admin-Seite: nutzt einen festen Raumcode für die lokale Session
const AdminPage = () => {
  const roomCode = 'MAIN';
  return <AdminView roomCode={roomCode} />;
};

export default AdminPage;
